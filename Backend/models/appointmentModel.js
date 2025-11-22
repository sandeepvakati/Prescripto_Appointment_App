// Backend/models/appointmentModel.js
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    // store references to user and doctor so populate() works reliably
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    docId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },

    // optional denormalized snapshots (useful if you sometimes embed data)
    userData: { type: Object, default: null },
    docData: { type: Object, default: null },

    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },

    amount: { type: Number, required: true },
    date: { type: Number, default: Date.now },

    // status flags
    cancelled: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },

    // canonical status string - "pending" | "completed" | "cancelled"
    status: { type: String, default: "pending" },

    completedAt: { type: Date, default: null },

    // payment related fields
    payment: { type: Boolean, default: false },
    paymentOrder: {
      orderId: { type: String, default: null },
      amount: { type: Number, default: null },
      orderCreatedAt: { type: Date, default: null },
    },
    paymentDetails: {
      razorpay_order_id: { type: String, default: null },
      razorpay_payment_id: { type: String, default: null },
      verifiedAt: { type: Date, default: null },
    },
    paymentDate: { type: Date, default: null },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const appointmentModel =
  mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);

export default appointmentModel;
