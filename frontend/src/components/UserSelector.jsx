// frontend/src/components/UserSelector.jsx

import React, { useState, useEffect } from "react";
import { apiCall } from "../utils/api";

function UserSelector({
  roleName,
  selectedUsers,
  onSelectionChange,
  isSingleSelect = false,
  disabled = false,
}) {
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const data = await apiCall(`/user/users-by-role/${roleName}`);
        setAllUsers(data);
      } catch (err) {
        setError(`Could not fetch ${roleName}s`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [roleName]);

  const handleSelect = (user) => {
    // --- THE FIX: Always pass the full user object back to the parent ---
    if (isSingleSelect) {
      // For single select, send an array with just the one user object.
      onSelectionChange([user]);
    } else {
      const isSelected = selectedUsers.some((u) => u.id === user.id);
      if (isSelected) {
        onSelectionChange(selectedUsers.filter((u) => u.id !== user.id));
      } else {
        onSelectionChange([...selectedUsers, user]);
      }
    }
    // After selection, clear the search term to hide the dropdown
    setSearchTerm("");
  };

  const filteredUsers = allUsers.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- THE FIX: This logic is now simpler and consistent ---
  // It always expects `selectedUsers` to be an array of user objects.
  const getSelectedUsernames = () => {
    if (!selectedUsers || selectedUsers.length === 0) {
      return "None selected";
    }
    return selectedUsers.map((u) => u.username).join(", ");
  };

  if (isLoading) return <p className="text-sm">Loading {roleName}s...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Assign {roleName}
        {isSingleSelect ? "" : "s"}
      </label>
      <div className="mt-1 relative">
        <input
          type="text"
          placeholder={`Search for a ${roleName}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border-gray-300 shadow-sm"
        />
        {/* Only show the dropdown if the user is typing */}
        {searchTerm && (
          <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                >
                  <input
                    type={isSingleSelect ? "radio" : "checkbox"}
                    readOnly
                    checked={selectedUsers.some((u) => u.id === user.id)}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300"
                  />
                  {user.username}
                </div>
              ))
            ) : (
              <div className="p-2 text-xs text-gray-500">No users found.</div>
            )}
          </div>
        )}
        <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs text-gray-600 min-h-[34px]">
          <strong>Selected:</strong> {getSelectedUsernames()}
        </div>
      </div>
    </div>
  );
}

export default UserSelector;
