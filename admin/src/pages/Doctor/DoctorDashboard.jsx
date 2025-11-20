import React, { useContext, useEffect } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";

const DoctorDashboard = () => {
  const {
    dToken,
    dashData,
    getDashData,
    cancelAppointment,
    completeAppointment,
  } = useContext(DoctorContext);

  const { currency, slotDateFormat } = useContext(AppContext);

  // only fetch if we have a token and no dashData yet
  useEffect(() => {
    if (dToken && !dashData) {
      getDashData();
    }
    // intentionally depend on dToken and dashData only
  }, [dToken, dashData, getDashData]); // keep getDashData for clarity; avoid recreating it in context if possible

  if (!dashData) return null;

  return (
    <div className="m-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all">
          <img className="w-14" src={assets.earning_icon} alt="earnings" />
          <div>
            <p className="text-xl font-semibold text-gray-600">
              {currency} {dashData.earnings}
            </p>
            <p className="text-gray-500">Earnings</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all">
          <img className="w-14" src={assets.appointments_icon} alt="appointments" />
          <div>
            <p className="text-xl font-semibold text-gray-600">
              {dashData.appointments}
            </p>
            <p className="text-gray-500">Appointments</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all">
          <img className="w-14" src={assets.patients_icon} alt="patients" />
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
          <img src={assets.list_icon} alt="list" />
          <p className="font-semibold">Latest Bookings</p>
        </div>

        <div className="pt-4 border border-t-0 border-zinc-300">
          {dashData?.latestAppointments?.map((item, index) => (
            <div
              className="flex items-center px-6 py-3 gap-3 hover:bg-gray-100"
              key={item._id || index}
            >
              <img
                className="rounded-full w-10"
                src={item.userData?.image || ""}
                alt={item.userData?.name || "user"}
              />

              <div className="flex-1 text-sm">
                <p className="text-gray-800 font-medium">
                  {item.userData?.name || "Unknown"}
                </p>
                <p className="text-gray-600">
                  {typeof slotDateFormat === "function"
                    ? slotDateFormat(item.slotDate)
                    : item.slotDate}
                </p>
              </div>

              {item.cancelled ? (
                <p className="text-red-400 text-xs font-medium">Cancelled</p>
              ) : item.isCompleted ? (
                <p className="text-green-500 text-xs font-medium">Completed</p>
              ) : (
                <div className="flex">
                  <img
                    onClick={() => cancelAppointment && cancelAppointment(item._id)}
                    className="w-10 cursor-pointer"
                    src={assets.cancel_icon}
                    alt="cancel"
                  />
                  <img
                    onClick={() => completeAppointment && completeAppointment(item._id)}
                    className="w-10 cursor-pointer"
                    src={assets.tick_icon}
                    alt="complete"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
