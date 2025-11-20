// src/context/DoctorContext.jsx
import React, {
  useState,
  useEffect,
  createContext,
  useCallback
} from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const DoctorContext = createContext();

function DoctorContextProvider({ children }) {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [dToken, setDToken] = useState(
    () => localStorage.getItem("dToken") || ""
  );
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Save token to localStorage
  useEffect(() => {
    if (dToken) localStorage.setItem("dToken", dToken);
    else localStorage.removeItem("dToken");
  }, [dToken]);

  // ---------------------------
  // Create Authorization Headers
  // ---------------------------
  const getAuthHeaders = useCallback(() => {
    const headers = { "Content-Type": "application/json" };
    if (dToken) headers.Authorization = `Bearer ${dToken}`;
    return headers;
  }, [dToken]);

  // ---------------------------
  // GET APPOINTMENTS
  // ---------------------------
  const getAppointments = useCallback(async () => {
    try {
      const url = `${backendUrl}/api/doctor/appointments`;
      const { data } = await axios.get(url, {
        headers: getAuthHeaders()
      });

      if (data.success) {
        setAppointments(Array.isArray(data.appointments)
          ? data.appointments
          : []
        );
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load appointments");
    }
  }, [backendUrl, getAuthHeaders]);

  // ---------------------------
  // COMPLETE APPOINTMENT
  // ---------------------------
  const completeAppointment = useCallback(
    async (appointmentId) => {
      try {
        const url = `${backendUrl}/api/doctor/complete-appointment`;
        const { data } = await axios.post(
          url,
          { appointmentId },
          { headers: getAuthHeaders() }
        );

        if (data.success) {
          toast.success(data.message);
          getAppointments();
        } else toast.error(data.message);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed");
      }
    },
    [backendUrl, getAuthHeaders, getAppointments]
  );

  // ---------------------------
  // CANCEL APPOINTMENT
  // ---------------------------
  const cancelAppointment = useCallback(
    async (appointmentId) => {
      try {
        const url = `${backendUrl}/api/doctor/cancel-appointment`;
        const { data } = await axios.post(
          url,
          { appointmentId },
          { headers: getAuthHeaders() }
        );

        if (data.success) {
          toast.success(data.message);
          getAppointments();
        } else toast.error(data.message);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed");
      }
    },
    [backendUrl, getAuthHeaders, getAppointments]
  );

  // ---------------------------
  // GET DASHBOARD
  // ---------------------------
  const getDashData = useCallback(async () => {
    try {
      const url = `${backendUrl}/api/doctor/dashboard`;
      const { data } = await axios.get(url, {
        headers: getAuthHeaders()
      });

      if (data.success) setDashData(data.dashData);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load dashboard");
    }
  }, [backendUrl, getAuthHeaders]);

  // ---------------------------
  // GET PROFILE
  // ---------------------------
  const getProfileData = useCallback(async () => {
    try {
      const url = `${backendUrl}/api/doctor/profile`;
      const { data } = await axios.get(url, {
        headers: getAuthHeaders()
      });

      if (data.success) setProfileData(data.profileData);
      else toast.error(data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load profile");
    }
  }, [backendUrl, getAuthHeaders]);

  // ---------------------------
  // Auto fetch data when logged in
  // ---------------------------
  useEffect(() => {
    if (!dToken) {
      setProfileData(null);
      setDashData(null);
      setAppointments([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      await Promise.allSettled([
        getProfileData(),
        getDashData(),
        getAppointments(),
      ]);
      setLoading(false);
    };

    load();
  }, [dToken]);

  const value = {
    backendUrl,
    dToken,
    setDToken,
    appointments,
    getAppointments,
    completeAppointment,
    cancelAppointment,
    dashData,
    getDashData,
    profileData,
    setProfileData,
    getProfileData,
    getAuthHeaders,
    loading,
  };

  return (
    <DoctorContext.Provider value={value}>
      {children}
    </DoctorContext.Provider>
  );
}

export default DoctorContextProvider;
