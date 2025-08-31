import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";

function LoginPage() {
  const [view, setView] = useState("login");

  const handleLoginSuccess = (token) => {
    localStorage.setItem("token", token);
    window.location.href = "/";
  };

  if (view === "login") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Login
          onLoginSuccess={handleLoginSuccess}
          onShowRegister={() => setView("register")}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Register onShowLogin={() => setView("login")} />
    </div>
  );
}

export default LoginPage;
