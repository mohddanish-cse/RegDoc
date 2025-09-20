import React, { useState, useEffect } from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { apiCall } from "./utils/api";
import Tabs from "./components/Tabs"; // <-- 1. Import the new Tabs component

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Application...
      </div>
    );
  }

  // If loading is finished and there's no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If we have a user, show the main app layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="font-bold text-xl text-gray-800">
              RegDoc
            </Link>
            <div>
              <span className="mr-4 text-gray-700">
                Welcome, {user.username}!
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* --- NEW: Secondary Tab Bar --- */}
      <Tabs user={user} />

      {/* Page Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}

export default App;
