// src/pages/Admin/Dashboard.jsx
import React, { useContext, useEffect } from "react";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const Dashboard = () => {
  const {
    aToken,
    getDashData,
    cancelAppointment,
    completeAppointment, // <-- added
    dashData,
  } = useContext(AdminContext);

  const { slotDateFormat } = useContext(AppContext);

  useEffect(() => {
    if (aToken) {
      getDashData();
    }
  }, [aToken, getDashData]);

  // helper to handle complete and refresh dashboard (optimistic UI could be added)
  const handleComplete = async (id) => {
    if (!completeAppointment) return;
    try {
      await completeAppointment(id);
      // refresh dashboard data to reflect the change
      if (typeof getDashData === "function") getDashData();
    } catch (err) {
      console.error("Complete (dashboard) error:", err);
    }
  };

  const handleCancel = async (id) => {
    if (!cancelAppointment) return;
    try {
      await cancelAppointment(id);
      if (typeof getDashData === "function") getDashData();
    } catch (err) {
      console.error("Cancel (dashboard) error:", err);
    }
  };

  return (
    dashData && (
      <div className="m-5">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all">
            <img className="w-14" src={assets.doctor_icon} alt="" />
            <div>
              <p className="text-xl font-semibold text-gray-600">
                {dashData.doctors}
              </p>
              <p className="text-gray-500">Doctors</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all">
            <img className="w-14" src={assets.appointments_icon} alt="" />
            <div>
              <p className="text-xl font-semibold text-gray-600">
                {dashData.appointments}
              </p>
              <p className="text-gray-500">Appointments</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all">
            <img className="w-14" src={assets.patients_icon} alt="" />
            <div>
              <p className="text-xl font-semibold text-gray-600">
                {dashData.patients}
              </p>
              <p className="text-gray-500">Patients</p>
            </div>
          </div>
        </div>

        <div className="bg-white">
          <div className="flex items-center gap-2.5 px-4 py-4 mt-10 rounded-t border border-zinc-300">
            <img src={assets.list_icon} alt="" />
            <p className="font-semibold">Latest Bookings</p>
          </div>

          <div className="pt-4 border border-t-0 border-zinc-300">
            {Array.isArray(dashData.latestAppointments) &&
              dashData.latestAppointments.map((item, index) => (
                <div
                  className="flex items-center px-6 py-3 gap-3 hover:bg-gray-100"
                  key={item._id || index}
                >
                  <img
                    className="rounded-full w-10"
                    src={item?.docData?.image || assets.profile_placeholder}
                    alt=""
                  />
                  <div className="flex-1 text-sm">
                    <p className="text-gray-800 font-medium">
                      {item?.docData?.name || "Unknown"}
                    </p>
                    <p className="text-gray-600">{slotDateFormat(item.slotDate)}</p>
                  </div>
                  {item.cancelled ? (
                    <p className="text-red-400 text-xs font-medium">Cancelled</p>
                  ) : item.isCompleted ? (
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
              ))}
          </div>
        </div>
      </div>
    )
  );
};

export default Dashboard;
