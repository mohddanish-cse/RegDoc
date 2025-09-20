import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";

function EditRoleModal({ isOpen, onClose, user, onUpdateSuccess }) {
  const [newRole, setNewRole] = useState("");
  const [error, setError] = useState("");

  // When the modal opens, set the dropdown to the user's current role
  useEffect(() => {
    if (user) {
      setNewRole(user.role);
    }
  }, [user]);

  const handleSave = async () => {
    setError("");
    try {
      await apiCall(`/user/${user.id}/role`, "PUT", { role: newRole });
      onUpdateSuccess(); // Tell the parent page to refresh
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen || !user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm rounded bg-white p-6">
          <Dialog.Title className="text-lg font-bold">
            Edit Role for {user.username}
          </Dialog.Title>

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <div className="mt-4">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Role
            </label>
            <select
              id="role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option>Contributor</option>
              <option>Reviewer</option>
              <option>Admin</option>
            </select>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSave}
              className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
