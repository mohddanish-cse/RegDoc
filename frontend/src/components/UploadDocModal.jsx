import React, { useState } from "react";
import { API_BASE, UPLOADS_BASE } from "../config";

export default function UploadDocModal({ user, onClose, onUploadSuccess }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("SOP");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !type || !file) {
      setError("All fields are required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("type", type);
    formData.append("file", file);
    formData.append("uploaded_by", user.username);

    try {
      const res = await fetch(`${API_BASE}/api/docs`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onUploadSuccess({
        id: data.id,
        name,
        type,
        status: "draft",
        assigned_to: null,
        uploaded_by: user.username,
        filename: file.name,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || "Upload failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/70">
      <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-xl border border-gray-200">
        <h2 className="text-2xl font-semibold mb-6">Upload New Document</h2>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">
              Document Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="SOP">SOP</option>
              <option value="Clinical Report">Clinical Report</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Upload File
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full"
              required
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-400 rounded-xl text-sm hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-black text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-800 transition"
            >
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
