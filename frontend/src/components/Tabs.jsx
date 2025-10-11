// frontend/src/components/Tabs.jsx

import React from "react";
import { NavLink } from "react-router-dom";

// This is a helper component for styling the links. It remains unchanged.
const TabLink = ({ to, children }) => {
  const activeClass = "border-blue-600 text-blue-600";
  const inactiveClass =
    "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800";
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
          isActive ? activeClass : inactiveClass
        }`
      }
    >
      {children}
    </NavLink>
  );
};

// --- REFACTORED: This component is now much simpler ---
// It no longer manages the upload modal. Its only job is to display navigation tabs.
function Tabs({ user }) {
  if (!user) return null;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          <div className="flex space-x-8">
            <TabLink to="/">My Tasks</TabLink>
            <TabLink to="/library">Library</TabLink>
            {user.role === "Admin" && (
              <TabLink to="/admin/users">User Management</TabLink>
            )}
          </div>
          {/* The Upload button has been removed from here */}
        </div>
      </div>
    </div>
  );
}

export default Tabs;
