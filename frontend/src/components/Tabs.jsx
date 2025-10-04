import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import UploadModal from "./UploadModal";

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

// Accept the onUploadComplete prop from App.jsx
function Tabs({ user, onUploadComplete }) {
  if (!user) return null;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleUploadSuccess = (newDocumentId) => {
    setIsUploadModalOpen(false); // Close the modal
    onUploadComplete(newDocumentId); // Pass the ID up to App.jsx
  };

  return (
    <>
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
            <div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Upload Document
              </button>
            </div>
          </div>
        </div>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadSuccess} // <-- Pass the function down to the modal
      />
    </>
  );
}

export default Tabs;
