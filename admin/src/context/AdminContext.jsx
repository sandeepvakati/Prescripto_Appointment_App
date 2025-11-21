// admin/src/context/AdminContext.jsx
import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AdminContext = createContext();

const AdminContextProvider = ({ children }) => {
  // fallback url in case env var is not set (use port 4000 which your backend uses)
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  // initialize token from localStorage safely (null when absent)
  const [aToken, setAToken] = useState(() => localStorage.getItem("aToken") || null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(false);

  // keep aToken in localStorage when it changes
  useEffect(() => {
    if (aToken) localStorage.setItem("aToken", aToken);
    else localStorage.removeItem("aToken");
  }, [aToken]);

  // helper to create headers consistently
  const getAuthHeaders = useCallback(() => {
    const headers = { "Content-Type": "application/json" };
    if (aToken) {
      // send both standard Authorization and legacy atoken header for compatibility
      headers.Authorization = `Bearer ${aToken}`;
      headers.atoken = aToken;
      headers.aToken = aToken;
    }
    return headers;
  }, [aToken]);

  const getAllDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${backendUrl.replace(/\/$/, "")}/api/admin/all-doctors`;
      // If backend actually uses GET, change to axios.get(url, { headers: getAuthHeaders() })
      const { data } = await axios.post(url, {}, { headers: getAuthHeaders() });

      if (data?.success) {
        setDoctors(Array.isArray(data.doctors) ? data.doctors : []);
        console.log("doctors:", data.doctors);
      } else {
        toast.error(data?.message || "Failed to fetch doctors");
      }
      return data;
    } catch (error) {
      console.error("getAllDoctors error:", error);
      toast.error(error?.response?.data?.message || error.message || "Request failed");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [backendUrl, getAuthHeaders]);

  const changeAvailability = useCallback(
    async (docId) => {
      if (!docId) return toast.error("docId is required");
      setLoading(true);
      try {
        const url = `${backendUrl.replace(/\/$/, "")}/api/admin/change-availability`;
        const { data } = await axios.post(url, { docId }, { headers: getAuthHeaders() });

        if (data?.success) {
          toast.success(data.message || "Availability changed");
          // update local doctors by re-fetch
          await getAllDoctors();
        } else {
          toast.error(data?.message || "Failed to change availability");
        }
        return data;
      } catch (error) {
        console.error("changeAvailability error:", error);
        toast.error(error?.response?.data?.message || error.message || "Request failed");
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, getAuthHeaders, getAllDoctors]
  );

  const getAllAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${backendUrl.replace(/\/$/, "")}/api/admin/appointments`;
      const { data } = await axios.get(url, { headers: getAuthHeaders() });

      if (data?.success) {
        setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
        console.log("appointments:", data.appointments);
      } else {
        toast.error(data?.message || "Failed to fetch appointments");
      }
      return data;
    } catch (error) {
      console.error("getAllAppointments error:", error);
      toast.error(error?.response?.data?.message || error.message || "Request failed");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [backendUrl, getAuthHeaders]);

  const cancelAppointment = useCallback(
    async (appointmentId) => {
      if (!appointmentId) {
        toast.error("Appointment id missing");
        return { success: false, message: "Appointment id missing" };
      }
      setLoading(true);
      try {
        const url = `${backendUrl.replace(/\/$/, "")}/api/admin/cancel-appointment`;
        const { data } = await axios.post(url, { appointmentId }, { headers: getAuthHeaders() });

        if (data?.success) {
          toast.success(data.message || "Appointment cancelled");

          // Optimistically update local state if backend returns updated appointment
          if (data.updatedAppointment) {
            setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, ...data.updatedAppointment } : a)));
          } else {
            // Otherwise, set cancelled flag locally and also re-fetch for correctness
            setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, cancelled: true } : a)));
            // optional: await getAllAppointments();
          }
        } else {
          toast.error(data?.message || "Failed to cancel appointment");
        }
        return data;
      } catch (error) {
        console.error("cancelAppointment error:", error);
        toast.error(error?.response?.data?.message || error.message || "Request failed");
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, getAuthHeaders, getAllAppointments]
  );

  const completeAppointment = useCallback(
    async (appointmentId) => {
      if (!appointmentId) {
        toast.error("Appointment id missing");
        return { success: false, message: "Appointment id missing" };
      }
      setLoading(true);
      try {
        const url = `${backendUrl.replace(/\/$/, "")}/api/admin/appointment-complete`;
        const { data } = await axios.post(url, { appointmentId }, { headers: getAuthHeaders() });

        if (data?.success) {
          toast.success(data.message || "Appointment completed");

          // Optimistic local update if server returns updatedAppointment
          if (data.updatedAppointment) {
            setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, ...data.updatedAppointment } : a)));
          } else {
            // fallback: set isCompleted flag locally
            setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, isCompleted: true } : a)));
            // optional: await getAllAppointments();
          }
        } else {
          toast.error(data?.message || "Failed to complete appointment");
        }
        return data;
      } catch (error) {
        console.error("completeAppointment error:", error);
        toast.error(error?.response?.data?.message || error.message || "Request failed");
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, getAuthHeaders, getAllAppointments]
  );

  const getDashData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${backendUrl.replace(/\/$/, "")}/api/admin/dashboard`;
      const { data } = await axios.get(url, { headers: getAuthHeaders() });

      if (data?.success) {
        setDashData(data.dashData ?? null);
        console.log("dashData:", data.dashData);
      } else {
        toast.error(data?.message || "Failed to fetch dashboard data");
      }
      return data;
    } catch (error) {
      console.error("getDashData error:", error);
      toast.error(error?.response?.data?.message || error.message || "Request failed");
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [backendUrl, getAuthHeaders]);

  const value = {
    aToken,
    setAToken,
    backendUrl,
    doctors,
    getAllDoctors,
    changeAvailability,
    appointments,
    setAppointments,
    getAllAppointments,
    cancelAppointment,
    completeAppointment,
    dashData,
    getDashData,
    loading,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export default AdminContextProvider;
