import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register"; // Import Register
import Dashboard from "./components/Dashboard";

function App() {
  const [token, setToken] = useState(null);
  const [view, setView] = useState("login"); // 'login' or 'register'

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("token");
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
      {token ? (
        // --- LOGGED-IN VIEW ---
        <div>
          <nav className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-center h-16">
                <span className="font-bold text-xl text-indigo-600">
                  RegDoc
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>
          <main className="p-8">
            <Dashboard />
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
