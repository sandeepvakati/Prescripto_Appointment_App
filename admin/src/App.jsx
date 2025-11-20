import React, { useContext } from "react";
import Login from "./pages/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AdminContext } from "./context/AdminContext";
import { DoctorContext } from "./context/DoctorContext";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { Route, Routes, Navigate } from "react-router-dom";

import Dashboard from "./pages/Admin/Dashboard";
import AllAppointments from "./pages/Admin/AllAppointments";
import AddDoctor from "./pages/Admin/AddDoctor";
import DoctorsList from "./pages/Admin/DoctorsList";

import DoctorDashboard from "./pages/Doctor/DoctorDashboard";
import DoctorAppointments from "./pages/Doctor/DoctorAppointments";
import DoctorProfile from "./pages/Doctor/DoctorProfile";

const App = () => {
  // defensive — avoid crashing if provider is missing
  const adminCtx = useContext(AdminContext) || {};
  const doctorCtx = useContext(DoctorContext) || {};

  const aToken = adminCtx?.aToken;
  const dToken = doctorCtx?.dToken;

  // If authenticated (admin or doctor) show the dashboard layout
  if (aToken || dToken) {
    return (
      <div className="bg-[#F8F9FD] min-h-screen">
        <ToastContainer />
        <Navbar />
        <div className="flex items-start">
          <Sidebar />

          {/* Main content area */}
          <main className="flex-1 p-4">
            <Routes>
              {/* generic fallback */}
              <Route path="/" element={aToken ? <Navigate to="/admin-dashboard" /> : <Navigate to="/doctor-dashboard" />} />

              {/* Admin-only routes */}
              {aToken && (
                <>
                  <Route path="/admin-dashboard" element={<Dashboard />} />
                  <Route path="/all-appointments" element={<AllAppointments />} />
                  <Route path="/add-doctor" element={<AddDoctor />} />
                  <Route path="/doctor-list" element={<DoctorsList />} />
                </>
              )}

              {/* Doctor-only routes */}
              {dToken && (
                <>
                  <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
                  <Route path="/doctor-appointments" element={<DoctorAppointments />} />
                  <Route path="/doctor-profile" element={<DoctorProfile />} />
                </>
              )}

              {/* Catch-all: redirect to appropriate dashboard */}
              <Route path="*" element={aToken ? <Navigate to="/admin-dashboard" /> : <Navigate to="/doctor-dashboard" />} />
            </Routes>
          </main>
        </div>
      </div>
    );
  }

  // not authenticated: show login
  return (
    <>
      <Login />
      <ToastContainer />
    </>
  );
};

export default App;
