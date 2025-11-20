// src/pages/Doctor/DoctorProfile.jsx
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import { AppContext } from "../../context/AppContext";

const DoctorProfile = () => {
  const {
    backendUrl,
    profileData,
    setProfileData,
    getProfileData,
    getAuthHeaders,
  } = useContext(DoctorContext);
  const {currency} = useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfileData();
  }, []);

  if (!profileData) return <div>Loading profile...</div>;

  const updateProfile = async () => {
    try {
      if (!profileData._id) {
        toast.error("Doctor ID missing");
        return;
      }
      setSaving(true);
      const payload = {
        docId: profileData._id,
        address: profileData.address,
        fees: parseInt(profileData.fees, 10),
        available: profileData.available,
        degree: profileData.degree,
        experience: profileData.experience,
        about: profileData.about,
      };
      const url = `${backendUrl}/api/doctor/update-profile`;
      const { data } = await axios.post(url, payload, {
        headers: getAuthHeaders(),
      });
      if (data.success) {
        toast.success("Profile updated successfully");
        setIsEdit(false);
        getProfileData();
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const formatAddress = (addr) => {
    if (typeof addr === "object" && addr !== null) {
      const parts = Object.values(addr).filter((v) => v);
      return (
        <div>
          {parts.map((part, idx) => (
            <span key={idx}>
              {part}
              {idx < parts.length - 1 && <br />}
            </span>
          ))}
        </div>
      );
    }
    return addr || "";
  };

  return (
    <div className="flex flex-col gap-4 m-5">
      <div>
        <img
          src={profileData.image || "/default-doctor.jpg"}
          alt={profileData.name}
          className="bg-primary/80 w-full sm:max-w-64 rounded-lg"
        />
      </div>
      <div className="w-full max-w-2xl border border-stone-100 rounded-lg p-8 py-7 bg-white">
        <h1 className="flex items-center gap-2 text-3xl font-medium text-gray-700">
          {profileData.name}
        </h1>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-gray-700">
            {profileData.degree} - {profileData.speciality}
          </div>
          {profileData.experience && (
            <button className="py-0.5 px-2 border text-xs rounded-full">
              {profileData.experience}
            </button>
          )}
        </div>

        <div className="w-full mb-4">
          <div className="font-semibold text-gray-900 mb-1">About:</div>
          {isEdit ? (
            <textarea
              className="w-full border border-gray-300 p-3 rounded-lg text-gray-700 text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 outline-none"
              rows="4"
              value={profileData.about}
              onChange={(e) =>
                setProfileData({ ...profileData, about: e.target.value })
              }
            />
          ) : (
            <div className="text-gray-700 text-sm">{profileData.about}</div>
          )}
        </div>

        <div className="w-full mb-4">
          <span className="font-semibold">Appointment fee:</span>{" "}
          {isEdit ? (
            <input
              type="number"
              step="1"
              className="border border-gray-300 p-2 rounded w-24 ml-2"
              value={profileData.fees}
              onChange={(e) => {
                const value = e.target.value;
                setProfileData({ ...profileData, fees: value });
              }}
            />
          ) : (
            <span className="text-gray-700">
              <span className="text-gray-900">{currency}</span>{" "}
              {profileData.fees}
            </span>
          )}
        </div>

        <div className="w-full mb-4">
          <span className="font-semibold">Address:</span>
          {isEdit ? (
            <textarea
              className="w-full border border-gray-300 p-3 rounded-lg text-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-2"
              rows="2"
              value={
                typeof profileData.address === "object"
                  ? JSON.stringify(profileData.address)
                  : profileData.address || ""
              }
              onChange={(e) => {
                try {
                  const value = e.target.value;
                  const addressObj = value.startsWith("{")
                    ? JSON.parse(value)
                    : value;
                  setProfileData({ ...profileData, address: addressObj });
                } catch {
                  setProfileData({ ...profileData, address: e.target.value });
                }
              }}
            />
          ) : (
            <div className="text-gray-700 text-sm mt-1">
              {formatAddress(profileData.address)}
            </div>
          )}
        </div>

        <div className="flex gap-1 pt-2">
          {isEdit ? (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profileData.available}
                onChange={(e) =>
                  setProfileData({
                    ...profileData,
                    available: e.target.checked,
                  })
                }
                className="w-5 h-5 cursor-pointer"
              />
              <label className="text-gray-900 font-medium">Available</label>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={profileData.available}
                readOnly
                className="w-5 h-5 cursor-not-allowed"
              />
              <label className="text-gray-900 font-medium">Available</label>
            </div>
          )}
        </div>

        <div className="w-full flex gap-3 mt-2">
          {!isEdit ? (
            <button
              className="px-4 py-1 border border-primary text-sm rounded-full mt-5 hover:bg-primary hover:text-white transition-all"
              onClick={() => setIsEdit(true)}
            >
              Edit
            </button>
          ) : (
            <button
              disabled={saving}
              className="px-4 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:bg-gray-400 font-medium text-sm"
              onClick={updateProfile}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
