import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import appointmentModel from "../models/appointmentModel.js";

const changeAvailability = async (req, res) => {
  try {
    // try req.user first, fallback to body
    const docId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : req.body?.docId;

    if (!docId) {
      return res.status(400).json({ success: false, message: "docId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ success: false, message: "Invalid docId" });
    }

    const docData = await doctorModel.findById(docId);
    if (!docData) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const updated = await doctorModel.findByIdAndUpdate(
      docId,
      { $set: { available: !docData.available } },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Availability Changed",
      doctor: updated,
    });
  } catch (error) {
    console.error("changeAvailability error:", error.stack || error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


const doctorList = async (req, res) => {
  try {
    // exclude sensitive fields
    const doctors = await doctorModel.find({}).select("-password -email");
    return res.json({ success: true, doctors });
  } catch (error) {
    console.error("doctorList error:", error.stack || error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// API for doctor Login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("LOGIN attempt:", {
      email: JSON.stringify(email),
      passwordLen: password ? password.length : 0,
    });

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const cleanEmail = String(email).trim();
    const cleanPassword = String(password).trim();

    const doctor = await doctorModel.findOne({ email: cleanEmail }).select("+password");
    console.log("DOCTOR FOUND ->", !!doctor, doctor ? { email: doctor.email, pwdLen: doctor.password?.length } : null);

    if (!doctor) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!doctor.password) {
      console.error("Login error: doctor record has no password field (was select omitted?)");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const isMatch = await bcrypt.compare(cleanPassword, doctor.password);
    console.log("BCRYPT compare result:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Missing JWT_SECRET in environment");
      return res.status(500).json({ success: false, message: "Server misconfiguration" });
    }

    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({ success: true, token });
  } catch (error) {
    console.error("loginDoctor error:", error.stack || error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : null;
    if (!docId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const appointments = await appointmentModel.find({ docId });
    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("appointmentsDoctor error:", error.stack || error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId;
    const docId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : null;

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId is required" });
    }
    if (!docId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: "Invalid appointmentId" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    console.log("appointmentData:", appointmentData);

    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (!appointmentData.docId) {
      return res.status(500).json({ success: false, message: "Appointment missing docId" });
    }

    const isSameDoctor =
      typeof appointmentData.docId.equals === "function"
        ? appointmentData.docId.equals(docId)
        : String(appointmentData.docId) === String(docId);

    if (!isSameDoctor) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this appointment" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { $set: { cancelled: true } });
    return res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.error("appointmentCancel error:", error.stack || error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// API to mark appointment completed for doctor panel
const appointmentComplete = async (req, res) => {
  try {
    const appointmentId = req.body.appointmentId;
    const docId = req.user && (req.user.id || req.user._id) ? req.user.id || req.user._id : null;

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId is required" });
    }
    if (!docId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: "Invalid appointmentId" });
    }

    const appointmentData = await appointmentModel.findById(appointmentId);
    console.log("appointmentData:", appointmentData);

    if (!appointmentData) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (!appointmentData.docId) {
      return res.status(500).json({ success: false, message: "Appointment missing docId" });
    }

    const appointmentDocId = appointmentData.docId;
    const isSameDoctor =
      typeof appointmentDocId.equals === "function"
        ? appointmentDocId.equals(docId)
        : String(appointmentDocId) === String(docId);

    if (!isSameDoctor) {
      return res.status(403).json({ success: false, message: "Not authorized to complete this appointment" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { $set: { isCompleted: true } });
    return res.json({ success: true, message: "Appointment Completed" });
  } catch (error) {
    console.error("appointmentComplete error:", error.stack || error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const docId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : req.body?.docId;

    if (!docId) {
      return res.status(400).json({ success: false, message: "docId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ success: false, message: "Invalid docId" });
    }

    const appointments = await appointmentModel.find({ docId }).lean();

    let earnings = 0;
    appointments.forEach((item) => {
      const amt = Number(item.amount) || 0;
      if (item.isCompleted || item.payment) earnings += amt;
    });

    const patientsSet = new Set();
    appointments.forEach((item) => {
      if (item.userId) patientsSet.add(String(item.userId));
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patientsSet.size,
      latestAppointments: appointments.slice().reverse().slice(0, 5),
    };

    return res.json({ success: true, dashData });
  } catch (error) {
    console.error("doctorDashboard error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};


// API to get doctor profile for Doctor Panel
const doctorProfile = async (req, res) => {
  try {
    // Prefer authenticated user id, fallback to body (if provided)
    const docId = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : req.body?.docId;

    if (!docId) {
      return res.status(400).json({ success: false, message: "docId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ success: false, message: "Invalid docId" });
    }

    const profileData = await doctorModel.findById(docId).select("-password");
    if (!profileData) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    return res.json({ success: true, profileData });
  } catch (error) {
    console.error("doctorProfile error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};


// API to update doctor profile data from Doctor Panel
const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, fees, address, available, degree, experience, about } = req.body;

    if (!docId) {
      return res.status(400).json({ success: false, message: "docId is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ success: false, message: "Invalid docId" });
    }

    // Build set object only with provided fields (avoid overwriting with undefined)
    const updates = {};
    if (typeof fees !== "undefined") updates.fees = Number(fees);
    if (typeof address !== "undefined") updates.address = address;
    if (typeof available !== "undefined") updates.available = available;
    if (typeof degree !== "undefined") updates.degree = degree;
    if (typeof experience !== "undefined") updates.experience = experience;
    if (typeof about !== "undefined") updates.about = about;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const updatedDoctor = await doctorModel.findByIdAndUpdate(docId, { $set: updates }, { new: true }).select("-password");

    if (!updatedDoctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    return res.json({ success: true, message: "Profile Updated", doctor: updatedDoctor });
  } catch (error) {
    console.error("updateDoctorProfile error:", error.stack || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
};
