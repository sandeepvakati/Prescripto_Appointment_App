// Backend/controllers/adminController.js
import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";

/**
 * Helper: format appointment to include userData/docData fields expected by frontend.
 * If userId/docId are populated (objects), prefer them. Otherwise fall back to embedded snapshots.
 */
const formatAppointment = (appt) => {
  const userObj =
    appt?.userId && typeof appt.userId === "object" && appt.userId.name
      ? appt.userId
      : appt?.userData ?? null;

  const docObj =
    appt?.docId && typeof appt.docId === "object" && appt.docId.name
      ? appt.docId
      : appt?.docData ?? null;

  return {
    _id: appt._id,
    slotDate: appt.slotDate,
    slotTime: appt.slotTime,
    amount: appt.amount,
    cancelled: !!appt.cancelled,
    isCompleted: !!appt.isCompleted,
    status: appt.status ?? (appt.isCompleted ? "completed" : appt.cancelled ? "cancelled" : "pending"),
    completedAt: appt.completedAt ?? null,
    createdAt: appt.createdAt ?? appt.date ?? null,
    userData: userObj,
    docData: docObj,
  };
};

/* ============================
   Add Doctor (Admin)
   ============================ */
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
    const imageFile = req.file; // optional file (multer)

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

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Please enter a strong password (min 8 chars)",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload image if provided
    let imageUrl = "";
    if (imageFile && imageFile.path) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      imageUrl = imageUpload.secure_url;
    }

    // Parse address if sent as JSON string
    let parsedAddress = address;
    try {
      if (typeof address === "string") parsedAddress = JSON.parse(address);
    } catch (err) {
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

    return res.status(201).json({ success: true, message: "Doctor Added", doctor: { _id: newDoctor._id, name: newDoctor.name } });
  } catch (error) {
    console.error("addDoctor error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/* ============================
   Admin Login
   ============================ */
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ role: "admin", email }, process.env.JWT_SECRET, { expiresIn: "8h" });
      return res.json({ success: true, token });
    } else {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("loginAdmin error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/* ============================
   Get All Doctors (Admin)
   ============================ */
const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    return res.json({ success: true, doctors });
  } catch (error) {
    console.error("allDoctors error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/* ============================
   Get All Appointments (Admin)
   ============================ */
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
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/* ============================
   Cancel Appointment (Admin)
   ============================ */
const appointmentCancel = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId ?? req.body.id ?? req.params.id ?? req.query.id;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId missing" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // mark cancelled and return updated appointment (populated)
    const updated = await appointmentModel
      .findByIdAndUpdate(
        appointmentId,
        { $set: { cancelled: true, status: "cancelled" } },
        { new: true }
      )
      .populate("userId", "name image dob")
      .populate("docId", "name image speciality");

    // Release doctor slot if present (keep original logic)
    const { docId, slotDate, slotTime } = appointmentData;
    if (docId) {
      const doctorData = await doctorModel.findById(docId);
      if (doctorData) {
        const slots_booked = doctorData.slots_booked || {};
        if (slots_booked[slotDate]) {
          doctorData.slots_booked[slotDate] = doctorData.slots_booked[slotDate].filter((e) => e !== slotTime);
          await doctorModel.findByIdAndUpdate(docId, { slots_booked: doctorData.slots_booked });
        }
      }
    }

    return res.json({
      success: true,
      message: "Appointment cancelled",
      appointment: formatAppointment(updated),
      updatedAppointment: formatAppointment(updated),
    });
  } catch (error) {
    console.error("cancelAppointment error:", error.stack || error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid appointment id", error: error.message });
    }
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/* ============================
   Complete Appointment (Admin)
   ============================ */
const appointmentComplete = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId ?? req.body.id ?? req.params.id ?? req.query.id;
    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId missing" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // mark as completed and set completedAt + status
    const updated = await appointmentModel
      .findByIdAndUpdate(
        appointmentId,
        { $set: { isCompleted: true, status: "completed", completedAt: new Date() } },
        { new: true }
      )
      .populate("userId", "name image dob")
      .populate("docId", "name image speciality");

    return res.json({
      success: true,
      message: "Appointment Completed",
      appointment: formatAppointment(updated),
      updatedAppointment: formatAppointment(updated),
    });
  } catch (error) {
    console.error("appointmentComplete error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/* ============================
   Admin Dashboard
   ============================ */
const adminDashboard = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({});
    const appointments = await appointmentModel.find({});

    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments: appointments.reverse().slice(0, 5).map((a) => formatAppointment(a)),
    };

    return res.json({ success: true, dashData });
  } catch (error) {
    console.error("adminDashboard error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/* ============================
   Exports
   ============================ */
export {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  appointmentCancel,
  appointmentComplete,
  adminDashboard,
};
