import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import { apiCall } from "./utils/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [view, setView] = useState("login");
  const [isLoading, setIsLoading] = useState(true); // <-- New loading state

  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const userData = await apiCall("/user/profile");
          setUser(userData);
        } catch (error) {
          console.error("Failed to fetch user profile, logging out.", error);
          handleLogout();
        }
      }
      setIsLoading(false); // <-- Stop loading once checked
    };
    fetchUser();
  }, []);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    // After login, we need to fetch the user
    const fetchUserOnLogin = async () => {
      try {
        const userData = await apiCall("/user/profile");
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user profile after login", error);
      }
    };
    fetchUserOnLogin();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  // --- Render Logic ---
  if (isLoading) {
    return <div>Loading Application...</div>; // Show a global loading screen
  }

  if (!token || !user) {
    // Show login/register page if there's no token OR no user profile
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
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <AuthComponent />
      </div>
    );
  }

  // If we have a token AND a user, show the main app
  return (
    <div>
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <span className="font-bold text-xl text-indigo-600">RegDoc</span>
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
      <main className="p-8">
        <Dashboard currentUser={user} />
      </main>
    </div>
  );
}

export default App;
