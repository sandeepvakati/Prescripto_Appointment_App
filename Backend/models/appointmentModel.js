import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },

  // prefer to store as ObjectId so you can populate doctor data later:
  // docId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  // if you don't want ObjectId, keep as String but remove duplicate
  docId: { type: String, required: true },

  slotDate: { type: String, required: true },
  slotTime: { type: String, required: true },
  userData: { type: Object, required: true },
  docData: { type: Object, required: true },

  amount: { type: Number, required: true },
  date: { type: Number, required: true },

  cancelled: { type: Boolean, default: false },

  // keep boolean flag for paid/unpaid
  payment: { type: Boolean, default: false },

  // store Razorpay order metadata here (created when order is created)
  paymentOrder: {
    orderId: { type: String, default: null },
    amount: { type: Number, default: null },
    orderCreatedAt: { type: Date, default: null }
  },

  // store verified payment details after verification
  paymentDetails: {
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },
    verifiedAt: { type: Date, default: null }
  },

  // timestamp when appointment was paid (for easy querying)
  paymentDate: { type: Date, default: null },

  isCompleted: { type: Boolean, default: false }
});

const appointmentModel = mongoose.models.appointment || mongoose.model('appointment', appointmentSchema);
export default appointmentModel;
