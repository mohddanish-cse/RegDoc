import React, { useState, useEffect } from "react";
import { apiCall } from "../../utils/api";

function RoleAssigner({
  roleName,
  selectedUsers,
  onSelectionChange,
  isSingleSelect = false,
}) {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const data = await apiCall(`/users/users-by-role/${roleName}`);
        setAvailableUsers(data);
      } catch (err) {
        setError(`Could not fetch users for role: ${roleName}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [roleName]);

  const handleSelect = (userId) => {
    if (isSingleSelect) {
      onSelectionChange([userId]); // For single select, always replace
    } else {
      const isSelected = selectedUsers.includes(userId);
      if (isSelected) {
        onSelectionChange(selectedUsers.filter((id) => id !== userId));
      } else {
        onSelectionChange([...selectedUsers, userId]);
      }
    }
  };

  if (isLoading)
    return <p className="text-sm text-gray-500">Loading {roleName}s...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Assign {roleName}
        {isSingleSelect ? "" : "s"}
      </label>
      <div className="border rounded-md p-2 max-h-32 overflow-y-auto bg-white">
        {availableUsers.length > 0 ? (
          availableUsers.map((user) => (
            <div key={user.id} className="flex items-center space-x-2">
              <input
                type={isSingleSelect ? "radio" : "checkbox"}
                id={`user-${roleName}-${user.id}`}
                name={`role-${roleName}`} // Ensures radio buttons are grouped
                checked={selectedUsers.includes(user.id)}
                onChange={() => handleSelect(user.id)}
              />
              <label htmlFor={`user-${roleName}-${user.id}`}>
                {user.username}
              </label>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400">
            No users found with the '{roleName}' role.
          </p>
        )}
      </div>
    </div>
  );
}

export default RoleAssigner;
