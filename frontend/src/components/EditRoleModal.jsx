// frontend/src/components/EditRoleModal.jsx

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

// --- The complete list of roles, matching the backend constant ---
const ROLES = ["Contributor", "QC", "Reviewer", "Approver", "Admin"];

function EditRoleModal({ isOpen, onClose, user, onUpdateSuccess }) {
  const [selectedRole, setSelectedRole] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // This effect ensures that when you click on a new user,
  // the dropdown correctly shows their current role.
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
    }
  }, [user]);

  const handleUpdate = async () => {
    // Basic validation
    if (!user || !selectedRole) return;

    setIsUpdating(true);
    const toastId = toast.loading("Updating user role...");

    try {
      // The API path is constructed using `user.id` from the props,
      // which matches the '/<user_id>/role' structure in your backend.
      await apiCall(`/user/${user.id}/role`, "PUT", { role: selectedRole });
      toast.success("Role updated successfully!", { id: toastId });
      onUpdateSuccess(); // This calls the function in UserManagementPage to refresh the data
    } catch (err) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  // Do not render the modal if there is no user data
  if (!user) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isUpdating && onClose()}
      className="relative z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Modal Panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900">
            Edit Role for <span className="text-primary">{user.username}</span>
          </Dialog.Title>

          <div className="mt-4">
            <label
              htmlFor="role-select"
              className="block text-sm font-medium text-gray-700"
            >
              Assign Role
            </label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isUpdating}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Save Changes"}
            </button>
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default EditRoleModal;
