import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  paymentRazorPay,
  verifyPayment, // ✅ Add this import
} from "../controllers/userController.js";
import authUser from "../middlewares/authUser.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// --------------------
// Auth routes
// --------------------
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);

// --------------------
// Profile routes
// --------------------
userRouter.get("/get-profile", authUser, getProfile);
userRouter.post("/update-profile", upload.single("image"), authUser, updateProfile);

// --------------------
// Appointment routes
// --------------------
userRouter.post("/book-appointment", authUser, bookAppointment);
userRouter.get("/appointments", authUser, listAppointment);
userRouter.post("/cancel-appointment", authUser, cancelAppointment);

// --------------------
// Razorpay payment routes
// --------------------
userRouter.post("/payment-razorpay", authUser, paymentRazorPay);
userRouter.post("/verify-payment", authUser, verifyPayment); // ✅ NEW — Add this line!

export default userRouter;
