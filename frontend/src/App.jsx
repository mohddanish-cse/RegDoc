import React, { useState, useEffect } from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { apiCall } from "./utils/api";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const userData = await apiCall("/user/profile");
          setUser(userData);
        } catch (error) {
          console.error("Token is invalid, logging out.", error);
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  };

  if (isLoading) {
    return <div>Loading Application...</div>;
  }

  // If loading is finished and there's no user, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // If we have a user, show the main app layout with the correct page
  return (
    <div>
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <span className="font-bold text-xl text-indigo-600">RegDoc</span>
            <div>
              {user.role === "Admin" && (
                <Link
                  to="/admin/users"
                  className="font-medium text-gray-500 hover:text-gray-900 mr-4"
                >
                  User Management
                </Link>
              )}
              <span className="mr-4">Welcome, {user.username}!</span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="p-8">
        {/* Pass user down to all child routes */}
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}

export default App;
