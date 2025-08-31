import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import { apiCall } from "./utils/api"; // Make sure apiCall is imported

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null); // State for user profile
  const [view, setView] = useState("login");

  useEffect(() => {
    // If a token exists, fetch the user's profile
    const fetchUser = async () => {
      if (token) {
        try {
          const userData = await apiCall("/user/profile");
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user profile", error);
          handleLogout(); // Log out if token is invalid
        }
      }
    };
    fetchUser();
  }, [token]); // This effect runs whenever the token changes

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const AuthComponent = () => {
    if (view === "login") {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onShowRegister={() => setView("register")}
        />
      );
    }
    return <Register onShowLogin={() => setView("login")} />;
  };

  return (
    <div>
      {token && user ? (
        // --- LOGGED-IN VIEW ---
        <div>
          <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-center h-16">
                <span className="font-bold text-xl text-indigo-600">
                  RegDoc
                </span>
                <div>
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
          {/* Pass the current user object down to the Dashboard */}
          <main className="p-8">
            <Dashboard currentUser={user} />
          </main>
        </div>
      ) : (
        // --- LOGGED-OUT VIEW ---
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <AuthComponent />
        </div>
      )}
    </div>
  );
}

export default App;
