// src/pages/MyAppointments.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const MyAppointments = () => {
  const { backendUrl, token, getDoctorsData, user } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const rzpScriptLoading = useRef(false); // prevent duplicate script loads

  const months = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const slotDateFormat = (slotDate) => {
    if (!slotDate || typeof slotDate !== "string") return "";
    const dateArray = slotDate.split("_");
    if (dateArray.length < 3) return slotDate;
    const day = dateArray[0];
    const monthIndex = parseInt(dateArray[1], 10);
    const year = dateArray[2];
    const month = Number.isFinite(monthIndex) ? (months[monthIndex] || dateArray[1]) : dateArray[1];
    return `${day} ${month} ${year}`;
  };

  const getUserAppointments = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/user/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      if (data && data.success) {
        // use the server-provided stable ids; avoid generating new ids on each render
        setAppointments(data.appointments || []);
      } else {
        toast.error(data?.message || "Failed to fetch appointments");
      }
    } catch (error) {
      console.error("getUserAppointments error:", error);
      toast.error(error.response?.data?.message || error.message || "Network error");
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/user/cancel-appointment`,
        { appointmentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data;
      if (data && data.success) {
        toast.success(data.message || "Appointment cancelled");
        await getUserAppointments();
        if (typeof getDoctorsData === "function") getDoctorsData();
      } else {
        toast.error(data?.message || "Cancel failed");
      }
    } catch (error) {
      console.error("cancelAppointment error:", error);
      toast.error(error.response?.data?.message || error.message || "Network/server error");
    }
  };

  const loadRzp = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      if (rzpScriptLoading.current) {
        // there's already a pending load; poll until available
        const timer = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(timer);
            resolve(true);
          }
        }, 200);
        // fallback timeout
        setTimeout(() => {
          clearInterval(timer);
          resolve(!!window.Razorpay);
        }, 8000);
        return;
      }
      rzpScriptLoading.current = true;
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => {
        rzpScriptLoading.current = false;
        resolve(true);
      };
      s.onerror = () => {
        rzpScriptLoading.current = false;
        resolve(false);
      };
      document.body.appendChild(s);
    });

  const initPay = async (order, appointmentId) => {
    if (!order || !order.id) {
      toast.error("Invalid order data");
      return;
    }

    const ok = await loadRzp();
    if (!ok) {
      toast.error("Failed to load payment SDK");
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
      amount: order.amount,
      currency: order.currency || "INR",
      name: "Prescripto - Appointment",
      description: "Appointment Payment",
      order_id: order.id,
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
        contact: user?.phone || "",
      },
      handler: async function (response) {
        try {
          toast.info("Verifying payment...");
          const verifyRes = await axios.post(
            `${backendUrl}/api/user/verify-payment`,
            {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              appointmentId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (verifyRes.data?.success) {
            toast.success("Payment verified — appointment updated");
            await getUserAppointments();
            if (typeof getDoctorsData === "function") getDoctorsData();
          } else {
            console.warn("verify-payment returned false:", verifyRes.data);
            toast.error(verifyRes.data?.message || "Payment verification failed");
          }
        } catch (err) {
          console.error("verify-payment error:", err);
          toast.error(err.response?.data?.message || "Payment verification failed (network)");
        }
      },
      modal: {
        ondismiss: function () {
          console.log("User closed Razorpay modal");
        },
      },
      theme: { color: "#4f46e5" },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error("rzp.open() error:", e);
      toast.error("Could not open payment window");
    }
  };

  const appointmentRazorpay = async (appointmentId) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/user/payment-razorpay`,
        { appointmentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = res.data;
      if (data && data.success) {
        initPay(data.order, appointmentId);
      } else {
        toast.error(data?.message || "Payment error (server returned false)");
      }
    } catch (error) {
      console.error("Pay Online error:", error.response?.data || error);
      const resp = error.response?.data;
      toast.error(resp?.message || error.message || "Payment failed (network/server)");
    }
  };

  useEffect(() => {
    if (token) getUserAppointments();
    // intentionally only depend on token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div>
      <p className="pb-3 mt-12 font-medium text-zinc-700 border-b">My appointments</p>
      <div>
        {appointments.map((item) => {
          const id = item._id ?? item.id ?? null;
          // if there is no stable id, skip rendering or generate once when setting state
          const key = id || item._tempId; // prefer stable id
          const doc = item?.docData || {};
          const address = doc?.address || {};
          const isCancelled = !!item?.cancelled;
          const isPaid = !!item?.payment;

          return (
            <div className="grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-2 border-b" key={key}>
              <div>
                <img
                  className="w-32 bg-indigo-50 object-cover"
                  src={doc?.image || "/placeholder-doctor.png"}
                  alt={doc?.name ? `${doc.name} profile` : "Doctor profile"}
                />
              </div>

              <div className="flex-1 text-sm text-zinc-600">
                <p className="text-neutral-800 font-semibold">{doc?.name || "Unknown Doctor"}</p>
                <p>{doc?.speciality || ""}</p>

                <p className="text-zinc-700 font-medium mt-1">Address:</p>
                <p className="text-xs">{address?.line1 || ""}</p>
                <p className="text-xs">{address?.line2 || ""}</p>

                <p className="text-xs mt-1">
                  <span className="text-xs text-neutral-700 font-medium">Date & Time:</span>{" "}
                  {slotDateFormat(item?.slotDate)} | {item?.slotTime || ""}
                </p>
              </div>

              <div className="flex flex-col gap-2 justify-end">
                {!isCancelled && isPaid && !item.isCompleted && (
                  <button
                    type="button"
                    className="sm:min-w-48 py-2 border rounded text-stone-500 bg-indigo-50"
                    aria-label="Paid"
                  >
                    Paid
                  </button>
                )}

                {!isCancelled && !isPaid && !item.isCompleted && (
                  <button
                    type="button"
                    onClick={() => appointmentRazorpay(item._id)}
                    className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    Pay Online
                  </button>
                )}

                {!isCancelled && !item.isCompleted && (
                  <button
                    type="button"
                    onClick={() => cancelAppointment(item._id)}
                    className="text-sm text-stone-500 text-center sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300"
                  >
                    Cancel appointment
                  </button>
                )}

                {isCancelled && !item.isCompleted && (
                  <button
                    type="button"
                    className="sm:min-w-48 py-2 border border-red-500 rounded text-red-500"
                    aria-disabled="true"
                  >
                    Appointment cancelled
                  </button>
                )}

                {item.isCompleted && <button className="sm:min-w-48 py-2 border border-green-500 rounded text-green-500">Completed</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyAppointments;
