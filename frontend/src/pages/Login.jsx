import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE, UPLOADS_BASE } from "../config";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      login(data);
      navigate("/dashboard"); // Go to dashboard
    } else {
      setError(data.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center">
      <div className="w-full max-w-md px-8 py-10 bg-gray-100 rounded-2xl shadow-2xl border border-gray-200">
        <h1 className="text-3xl font-semibold text-center mb-6">
          Login to RegDoc
        </h1>
        <form onSubmit={handleLogin} className="space-y-5">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-black text-white rounded-lg hover:opacity-80 transition duration-200 font-medium text-lg"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
