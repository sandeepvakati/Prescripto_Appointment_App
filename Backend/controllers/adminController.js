// Backend/controllers/adminController.js
import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";

/**
 * Helper: format appointment to include userData/docData fields expected by frontend.
 * Works whether appointment stores embedded userData/docData or references userId/docId.
 */
const formatAppointment = (appt) => {
  return {
    _id: appt._id,
    slotDate: appt.slotDate,
    slotTime: appt.slotTime,
    amount: appt.amount,
    cancelled: !!appt.cancelled,
    createdAt: appt.createdAt,
    userData: appt.userData ?? appt.userId ?? null,
    docData: appt.docData ?? appt.docId ?? null,
  };
};

// API for adding doctors
const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file; // may be undefined

    // checking for required fields
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.status(400).json({ success: false, message: "Missing Details" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    // validating strong password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Please enter a strong password (min 8 chars)",
      });
    }

    // hashing doctor password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // upload image to cloudinary only if provided
    let imageUrl = "";
    if (imageFile && imageFile.path) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      imageUrl = imageUpload.secure_url;
    }

    // parse address safely
    let parsedAddress = address;
    try {
      if (typeof address === "string") parsedAddress = JSON.parse(address);
    } catch (err) {
      // keep address as-is if JSON.parse fails
      parsedAddress = address;
    }

    const doctorData = {
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: parsedAddress,
      date: Date.now(),
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();

    return res.status(201).json({ success: true, message: "Doctor Added" });
  } catch (error) {
    console.error("addDoctor error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for admin Login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign({ role: "admin", email }, process.env.JWT_SECRET, { expiresIn: "8h" });
      return res.json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("loginAdmin error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    return res.json({ success: true, doctors });
  } catch (error) {
    console.error("allDoctors error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
  try {
    const appointments = await appointmentModel
      .find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name image dob")
      .populate("docId", "name image speciality");

    const formatted = appointments.map((a) => formatAppointment(a));
    return res.json({ success: true, appointments: formatted });
  } catch (error) {
    console.error("appointmentsAdmin error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for appointment cancellation
const appointmentCancel = async (req, res) => {
  try {
    // Accept appointmentId either in body { appointmentId } or params :id
    const appointmentId = req.body.appointmentId ?? req.body.id ?? req.params.id;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId missing" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // mark cancelled and return updated appointment
    const updated = await appointmentModel.findByIdAndUpdate(
      appointmentId,
      { cancelled: true },
      { new: true }
    ).populate("userId", "name image dob")
     .populate("docId", "name image speciality");

    // release doctor slot if present
    const { docId, slotDate, slotTime } = appointmentData;
    if (docId) {
      const doctorData = await doctorModel.findById(docId);
      if (doctorData) {
        let slots_booked = doctorData.slots_booked || {};
        if (slots_booked[slotDate]) {
          // filter out the canceled slot
          slots_booked[slotDate] = slots_booked[slotDate].filter((e) => e !== slotTime);
          await doctorModel.findByIdAndUpdate(docId, { slots_booked });
        }
      }
    }

    return res.json({
      success: true,
      message: "Appointment cancelled",
      appointment: formatAppointment(updated),
    });
  } catch (error) {
    console.error("cancelAppointment error:", error.stack || error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid appointment id", error: error.message });
    }
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// API to mark appointment completed for admin panel
const appointmentComplete = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId missing" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // mark as completed
    await appointmentModel.findByIdAndUpdate(appointmentId, { $set: { isCompleted: true } });

    return res.json({ success: true, message: "Appointment Completed" });
  } catch (error) {
    console.error("appointmentComplete error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// API to get dashboard data for admin panel
const adminDashboard = async (req,res) => {

  try {

    const doctors = await doctorModel.find({})
    const users = await userModel.find({})
    const appointments = await appointmentModel.find({})

    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments: appointments.reverse().slice(0,5)
    }

    res.json({success:true,dashData})
    
  } catch (error) {
    console.log(error)
    res.json({success:false, message: error.message})
    
  }
  
}


export { addDoctor, loginAdmin, allDoctors, appointmentsAdmin, appointmentCancel, appointmentComplete, adminDashboard };
