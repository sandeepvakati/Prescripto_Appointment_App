// backend/controllers/userController.js

import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import razorpay from "razorpay";
import crypto from "crypto";

// helper to ensure authenticated user
const ensureAuth = (req, res) => {
  if (!req.user || !req.user.id) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
};

// --------------------
// User auth & profile
// --------------------

// API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
      return res.json({ success: false, message: "Missing details" });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a valid email" });
    }

    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a strong password (min 8 chars)" });
    }

    // Prevent duplicate emails
    const existing = await userModel.findOne({ email });
    if (existing) {
      return res.json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = { name, email, password: hashedPassword };
    const newUser = new userModel(userData);
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token });
  } catch (error) {
    console.error("registerUser error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// API for user login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("loginUser error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// Api to get user profile data
const getProfile = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;
    const userId = req.user.id;
    const userData = await userModel.findById(userId).select("-password");
    if (!userData) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, userData });
  } catch (error) {
    console.error("getProfile error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// API to update user profile
const updateProfile = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;
    console.log("User:", req.user);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const { name, phone, address, dob, gender } = req.body;
    const userId = req.user.id;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data missing" });
    }

    const addressObj = address
      ? (() => {
          try {
            return JSON.parse(address);
          } catch (e) {
            return {};
          }
        })()
      : {};

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: addressObj,
      dob,
      gender,
    });

    if (imageFile) {
      // Multer could be using memoryStorage (buffer) or diskStorage (path).
      // If buffer exists, upload via upload_stream; if path exists, upload directly.
      let imageURL = null;
      if (imageFile.path) {
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });
        imageURL = imageUpload.secure_url;
      } else if (imageFile.buffer) {
        // upload via stream
        const streamUpload = (buffer) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) return reject(error);
              resolve(result);
            });
            stream.end(buffer);
          });
        };
        const uploaded = await streamUpload(imageFile.buffer);
        imageURL = uploaded.secure_url;
      } else {
        console.warn("updateProfile: imageFile has neither path nor buffer", imageFile);
      }

      if (imageURL) {
        await userModel.findByIdAndUpdate(userId, { image: imageURL });
      }
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// --------------------
// Appointments
// --------------------

// API to book appointment
const bookAppointment = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;
    const { userId, docId, slotDate, slotTime } = req.body;

    if (!userId || !docId || !slotDate || !slotTime) {
      return res.json({ success: false, message: "Missing booking details" });
    }

    const docData = await doctorModel.findById(docId).select("-password");
    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    if (!docData.available) {
      return res.json({ success: false, message: "Doctor not available" });
    }

    // Initialize slots_booked safely
    let slots_booked = docData.slots_booked || {};

    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot not available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [slotTime];
    }

    const userData = await userModel.findById(userId).select("-password");
    if (!userData) return res.json({ success: false, message: "User not found" });

    // Convert docData to plain object before deleting a field
    const docObj = docData.toObject ? docData.toObject() : { ...docData };
    delete docObj.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData: docObj,
      amount: docData.fees || 0,
      slotTime,
      slotDate,
      date: Date.now(),
      cancelled: false,
      payment: false,
      paymentDetails: {},
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    // Update doctor's slots_booked (persist)
    console.log("slots_booked before update:", slots_booked);
    await doctorModel.findByIdAndUpdate(docId, { $set: { slots_booked } });
    const updatedDoc = await doctorModel.findById(docId);
    console.log("slots_booked after update:", updatedDoc.slots_booked);

    res.json({ success: true, message: "Appointment booked" });
  } catch (error) {
    console.error("bookAppointment error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;
    const userId = req.user.id;

    // fetch newest first (date descending) and return plain objects
    let appointments = await appointmentModel.find({ userId }).sort({ date: -1 }).lean();

    // normalize docData so frontend always gets docData object
    appointments = appointments.map(a => {
      const doc = a.docData || a.docId || {};
      return { ...a, docData: typeof doc === "object" ? doc : {} };
    });

    res.json({ success: true, appointments });
  } catch (error) {
    console.error("listAppointment error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};



// API to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;
    const { appointmentId } = req.body;
    const userId = req.user.id;

    if (!appointmentId) return res.json({ success: false, message: "appointmentId missing" });

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.json({ success: false, message: "Appointment not found" });
    }

    if (appointmentData.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized action" });
    }

    if (appointmentData.cancelled) {
      return res.json({ success: false, message: "Appointment already cancelled" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

    // releasing doctor slot
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);
    if (doctorData) {
      let slots_booked = doctorData.slots_booked || {};
      if (slots_booked[slotDate]) {
        slots_booked[slotDate] = slots_booked[slotDate].filter((e) => e !== slotTime);
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });
      }
    }

    res.json({ success: true, message: "Appointment cancelled" });
  } catch (error) {
    console.error("cancelAppointment error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// --------------------
// Payments (Razorpay)
// --------------------

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// API to make payment of appointment using razorpay
const paymentRazorPay = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: req.user missing" });
    }

    const { appointmentId } = req.body;
    console.log("paymentRazorPay called for appointmentId:", appointmentId);

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId missing" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    console.log("fetched appointmentData:", appointmentData);

    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointmentData.cancelled) {
      return res.status(400).json({ success: false, message: "Appointment cancelled" });
    }

    const amount = Number(appointmentData.amount || 0);
    console.log("appointment amount:", amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid appointment amount" });
    }

    // show env keys presence (do NOT log keys themselves in production)
    console.log("RAZORPAY_KEY_ID present:", !!process.env.RAZORPAY_KEY_ID);
    console.log("RAZORPAY_KEY_SECRET present:", !!process.env.RAZORPAY_KEY_SECRET);
    console.log("CURRENCY:", process.env.CURRENCY);

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay keys not configured in environment" });
    }

    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: process.env.CURRENCY || "INR",
      receipt: appointmentId,
    };
    console.log("Creating razorpay order with options:", options);

    const order = await razorpayInstance.orders.create(options);
    console.log("Razorpay order created:", order);

    // store order id and some payment meta in appointment (so verify can find it)
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      $set: {
        "paymentOrder.orderId": order.id,
        "paymentOrder.amount": appointmentData.amount,
        "paymentOrder.orderCreatedAt": new Date(),
      }
    });
    

    return res.json({ success: true, order, doctor: appointmentData.docData });
  } catch (error) {
    // log full error in server console
    console.error("paymentRazorPay caught error:", error);

    // Return helpful error to client (dev only) so you can inspect in browser
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
      // include stack for local debugging only:
      stack: error.stack ? error.stack.split("\n").slice(0,10) : undefined,
      // optionally include error object if helpful (careful in prod)
      error: (error && error.toString && error.toString()) || null,
    });
  }
};

// API to verify payment and mark appointment paid
const verifyPayment = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      appointmentId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !appointmentId) {
      return res.status(400).json({ success: false, message: "Missing payment fields" });
    }

    // compute expected signature with secret
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // mark appointment as paid
    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    appointment.payment = true;
    appointment.paymentDetails = {
      razorpay_order_id,
      razorpay_payment_id,
      verifiedAt: new Date(),
    };
    appointment.paymentDate = new Date();
    
    await appointment.save();
    

    return res.json({ success: true, message: "Payment verified and appointment updated" });
  } catch (error) {
    console.error("verifyPayment error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

export {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentRazorPay,
  verifyPayment,
};
