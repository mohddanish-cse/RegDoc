import React from "react";
import { useOutletContext, Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const { user } = useOutletContext();

  // If the user data is still loading, wait.
  if (!user) {
    return <div>Loading...</div>;
  }

  // If the user is not an Admin, redirect to the homepage.
  if (user.role !== "Admin") {
    return <Navigate to="/" replace />;
  }

  // If the user is an Admin, render the requested page.
  return children;
}

export default AdminRoute;
