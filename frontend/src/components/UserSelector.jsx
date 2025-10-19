// frontend/src/components/UserSelector.jsx

import React, { useState, useEffect } from "react";
import { apiCall } from "../utils/api";

function UserSelector({
  stageName,
  roleName,
  selectedUsers,
  onSelectionChange,
  isSingleSelect = false,
  disabled = false,
}) {
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Default to false
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      // --- THE FIX: This "Guard Clause" is the key to the solution ---
      // If roleName is not a valid string, do nothing.
      // This prevents the API call to "/users-by-role/undefined".
      if (!roleName) {
        setAllUsers([]); // Ensure the list is empty
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(""); // Reset error on new fetch
        const data = await apiCall(`/users/users-by-role/${roleName}`);
        setAllUsers(data);
      } catch (err) {
        setError(`Could not fetch users for role: ${roleName}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [roleName]); // This effect correctly depends only on the roleName

  const handleSelect = (user) => {
    if (isSingleSelect) {
      onSelectionChange([user]);
    } else {
      const isSelected = selectedUsers.some((u) => u.id === user.id);
      if (isSelected) {
        onSelectionChange(selectedUsers.filter((u) => u.id !== user.id));
      } else {
        onSelectionChange([...selectedUsers, user]);
      }
    }
    setSearchTerm("");
  };

  const filteredUsers = allUsers.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedUsernames = () => {
    if (!selectedUsers || selectedUsers.length === 0) return "None selected";
    return selectedUsers.map((u) => u.username).join(", ");
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {stageName}
      </label>
      <div className="mt-1 relative">
        <input
          type="text"
          placeholder={`Search for a user with role '${roleName}'...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled || isLoading}
          className="w-full rounded-md border-gray-300 shadow-sm"
        />
        {isLoading && <p className="text-xs text-gray-500 mt-1">Loading...</p>}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

        {searchTerm && !isLoading && (
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
                    className="mr-2 h-4 w-4"
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
