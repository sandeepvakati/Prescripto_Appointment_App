import React, { createContext } from "react";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  // ensure your admin/.env has VITE_BACKEND_URL=http://localhost:5000
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const currency = "$";

  const calculateAge = (dob) => {
    if (!dob) return "";
    const today = new Date();
    const birthDate = new Date(dob);
    return today.getFullYear() - birthDate.getFullYear();
  };

  const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const slotDateFormat = (slotDate) => {
    if (!slotDate || typeof slotDate !== "string") return "";
    const dateArray = slotDate.split("_");
    if (dateArray.length < 3) return slotDate;
    const day = dateArray[0];
    const monthIndex = Number(dateArray[1]);
    const year = dateArray[2];
    const month = months[monthIndex] || dateArray[1];
    return `${day} ${month} ${year}`;
  };

  const value = {
    backendUrl,
    currency,
    calculateAge,
    slotDateFormat,
  };

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};

export default AppContextProvider;
