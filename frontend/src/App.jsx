import React, { useState, useEffect } from "react";
import "./index.css";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  const [token, setToken] = useState(null);

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

  return (
    <div className="App">
      <h1 className="text-3xl font-bold text-blue-600 p-4 bg-gray-100 rounded-lg">
        Welcome to RegDoc
      </h1>
      <button onClick={handleLogout} disabled={!token}>
        Logout
      </button>
      <hr />

      {token ? (
        // If logged in, show the Dashboard
        <Dashboard />
      ) : (
        // If not logged in, show the Login component
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
