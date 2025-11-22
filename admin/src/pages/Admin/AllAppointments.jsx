// src/pages/Admin/AllAppointments.jsx
import React, { useContext, useEffect, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const AllAppointments = () => {
  const {
    aToken,
    appointments,
    getAllAppointments,
    cancelAppointment,
    completeAppointment,
  } = useContext(AdminContext);

  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  const [itemsList, setItemsList] = useState([]);

  // Helper to normalize status values from server
  const normalizeAppointment = (a) => {
    const status = (a?.status ?? "").toString().toLowerCase();

    const isCompleted =
      a?.__isCompleted === true || // already normalized
      a?.isCompleted === true ||
      a?.isCompleted === "true" ||
      a?.completed === true ||
      a?.completed === "true" ||
      status === "completed" ||
      status === "complete";

    const isCancelled =
      a?.__isCancelled === true || // already normalized
      a?.cancelled === true ||
      a?.cancelled === "true" ||
      a?.isCancelled === true ||
      a?.isCancelled === "true" ||
      status === "cancelled" ||
      status === "cancel";

    return { ...a, __isCompleted: !!isCompleted, __isCancelled: !!isCancelled };
  };

  // Normalize appointments whenever we receive them from context
  useEffect(() => {
    if (appointments && Array.isArray(appointments)) {
      const normalized = appointments.map((a) => normalizeAppointment(a));
      setItemsList(normalized);
    } else {
      setItemsList([]);
    }
  }, [appointments]);

  // Fetch appointments when token becomes available
  useEffect(() => {
    if (aToken && typeof getAllAppointments === "function") {
      getAllAppointments();
    }
  }, [aToken, getAllAppointments]);

  // Flag helpers prefer normalized fields
  const isCompletedFlag = (item) =>
    item?.__isCompleted === true ||
    item?.isCompleted === true ||
    item?.completed === true ||
    (item?.status ?? "").toString().toLowerCase().startsWith("complete");

  const isCancelledFlag = (item) =>
    item?.__isCancelled === true ||
    item?.cancelled === true ||
    item?.isCancelled === true ||
    (item?.status ?? "").toString().toLowerCase().startsWith("cancel");

  // safe image fallback
  const safeImage = (url) => url || assets.profile_placeholder || "";

  // handle completion: call context function then update UI using server response (if present)
  const handleComplete = async (id) => {
    try {
      // call context action - expect it to return server response (preferably the updated appointment)
      const res = await completeAppointment(id);

      console.log("completeAppointment response:", res);

      // If the context returns an updated appointment object:
      if (res && res.updatedAppointment) {
        const updated = normalizeAppointment(res.updatedAppointment);
        setItemsList((prev) => prev.map((a) => (a._id === id ? { ...a, ...updated } : a)));
        return;
      }

      // If context returns the updated status only or a success boolean, optimistically update:
      if (res && (res.success === true || res.updated === true)) {
        setItemsList((prev) =>
          prev.map((a) => (a._id === id ? { ...a, isCompleted: true, __isCompleted: true } : a))
        );
        return;
      }

      // Fallback: re-fetch all appointments if available
      if (typeof getAllAppointments === "function") {
        await getAllAppointments();
      } else {
        setItemsList((prev) =>
          prev.map((a) => (a._id === id ? { ...a, isCompleted: true, __isCompleted: true } : a))
        );
      }
    } catch (err) {
      console.error("Complete appointment error:", err);
    }
  };

  const handleCancel = async (id) => {
    try {
      const res = await cancelAppointment(id);
      console.log("cancelAppointment response:", res);

      // apply server response if available
      if (res && res.updatedAppointment) {
        const updated = normalizeAppointment(res.updatedAppointment);
        setItemsList((prev) => prev.map((a) => (a._id === id ? { ...a, ...updated } : a)));
        return;
      }

      if (res && (res.success === true || res.updated === true)) {
        setItemsList((prev) =>
          prev.map((a) => (a._id === id ? { ...a, cancelled: true, __isCancelled: true } : a))
        );
        return;
      }

      if (typeof getAllAppointments === "function") {
        await getAllAppointments();
      } else {
        setItemsList((prev) =>
          prev.map((a) => (a._id === id ? { ...a, cancelled: true, __isCancelled: true } : a))
        );
      }
    } catch (err) {
      console.error("Cancel appointment error:", err);
    }
  };

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

        {itemsList.map((item, index) => {
          const completed = isCompletedFlag(item);
          const cancelled = isCancelledFlag(item);

          return (
            <div
              key={item._id || index}
              className="flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-gray-500 py-3 px-6 border-b border-zinc-300 hover:bg-gray-50"
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
                    className={`w-10 cursor-pointer hover:opacity-70 ${
                      completed || cancelled ? "opacity-40 pointer-events-none" : ""
                    }`}
                    src={assets.tick_icon}
                    alt="Complete"
                    title="Complete Appointment"
                  />
                  <img
                    onClick={() => handleCancel(item._id)}
                    className={`w-10 cursor-pointer hover:opacity-70 ${
                      completed || cancelled ? "opacity-40 pointer-events-none" : ""
                    }`}
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
