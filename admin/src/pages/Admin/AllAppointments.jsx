// src/pages/Admin/AllAppointments.jsx
import React, { useContext, useEffect, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const AllAppointments = () => {
  // from AdminContext (assumes these functions/states exist there)
  const {
    aToken,
    appointments,
    getAllAppointments,
    cancelAppointment,      // should call backend & update context state (or we update local state)
    completeAppointment,    // should call backend & update context state (or we update local state)
  } = useContext(AdminContext);

  // helpers from AppContext
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  // local copy of appointments so we can optimistically update UI
  const [itemsList, setItemsList] = useState([]);

  // sync local list when context appointments change
  useEffect(() => {
    if (appointments && Array.isArray(appointments)) {
      setItemsList([...appointments]); // copy to avoid mutation
    }
  }, [appointments]);

  // initial fetch when token present
  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }
  }, [aToken, getAllAppointments]);

  // robust check for completed status
  const isCompletedFlag = (item) => {
    return (
      item?.isCompleted === true ||
      item?.completed === true ||
      item?.status === "completed" ||
      item?.isCompleted === "true" ||
      item?.completed === "true" ||
      item?.status === "Completed"
    );
  };

  // robust check for cancelled status
  const isCancelledFlag = (item) => {
    return (
      item?.cancelled === true ||
      item?.isCancelled === true ||
      item?.status === "cancelled" ||
      item?.status === "Cancelled" ||
      item?.cancelled === "true"
    );
  };

  // Handler when user clicks complete
  const handleComplete = async (id) => {
    try {
      // call context action (which should call backend)
      await completeAppointment(id);

      // optimistic update of local UI
      setItemsList((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isCompleted: true } : a))
      );
    } catch (err) {
      console.error("Complete appointment error:", err);
      // optionally show a toast here
    }
  };

  // Handler when user clicks cancel
  const handleCancel = async (id) => {
    try {
      await cancelAppointment(id);

      // optimistic update of local UI
      setItemsList((prev) =>
        prev.map((a) => (a._id === id ? { ...a, cancelled: true } : a))
      );
    } catch (err) {
      console.error("Cancel appointment error:", err);
    }
  };

  // small helper for safe image src
  const safeImage = (url) => url || assets.profile_placeholder || "";

  return (
    <div className="w-full max-w-6xl m-5">
      <p className="mb-3 text-lg font-medium">All Appointments</p>

      <div className="bg-white border border-zinc-300 rounded text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll">
        <div className="hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b border-zinc-300">
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fees</p>
          <p>Actions</p>
        </div>

        {[...itemsList].reverse().map((item, index) => {
          // debug inspect one item if needed:
          // console.log(item);

          const completed = isCompletedFlag(item);
          const cancelled = isCancelledFlag(item);

          return (
            <div
              className="flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b border-zinc-300 hover:bg-gray-50"
              key={item._id || index}
            >
              <p className="max-sm:hidden">{index + 1}</p>

              <div className="flex items-center gap-2">
                <img
                  className="w-8 h-8 object-cover rounded-full"
                  src={safeImage(item?.userData?.image)}
                  alt={item?.userData?.name || "User"}
                />
                <p>{item?.userData?.name || "Unknown"}</p>
              </div>

              <p className="max-sm:hidden">
                {item?.userData?.dob ? calculateAge(item.userData.dob) : "-"}
              </p>

              <p>
                {slotDateFormat(item?.slotDate)}, {item?.slotTime}
              </p>

              <div className="flex items-center gap-2">
                <img
                  className="w-8 h-8 object-cover rounded-full bg-gray-200"
                  src={safeImage(item?.docData?.image)}
                  alt={item?.docData?.name || "Doctor"}
                />
                <p>{item?.docData?.name || "Unknown"}</p>
              </div>

              <p>
                {currency}
                {item?.amount ?? "-"}
              </p>

              {cancelled ? (
                <p className="text-red-400 text-xs font-medium">Cancelled</p>
              ) : completed ? (
                <p className="text-green-500 text-xs font-medium">Completed</p>
              ) : (
                <div className="flex gap-2">
                  <img
                    onClick={() => handleComplete(item._id)}
                    className="w-10 cursor-pointer hover:opacity-70"
                    src={assets.tick_icon}
                    alt="Complete"
                    title="Complete Appointment"
                  />
                  <img
                    onClick={() => handleCancel(item._id)}
                    className="w-10 cursor-pointer hover:opacity-70"
                    src={assets.cancel_icon}
                    alt="Cancel"
                    title="Cancel Appointment"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllAppointments;
