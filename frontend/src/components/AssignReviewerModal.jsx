import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { API_BASE, UPLOADS_BASE } from "../config";

export default function AssignReviewerModal({ docId, onClose }) {
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/reviewers`)
      .then((res) => res.json())
      .then((data) => setReviewers(data))
      .catch(() => toast.error("Failed to load reviewers"));
  }, []);

  const assignReviewer = async () => {
    if (!selectedReviewer) {
      toast.error("Please select a reviewer.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/docs/${docId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: selectedReviewer }),
      });

      if (res.ok) {
        toast.success("Reviewer assigned successfully!");
        onClose(); // ✅ Close modal after success
      } else {
        toast.error("Failed to assign reviewer.");
      }
    } catch (err) {
      toast.error("Server error while assigning reviewer.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Assign Reviewer</h2>

        <select
          value={selectedReviewer}
          onChange={(e) => setSelectedReviewer(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        >
          <option value="">-- Select Reviewer --</option>
          {reviewers.map((r) => (
            <option key={r.username} value={r.username}>
              {r.username}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="bg-white text-black px-4 py-2 rounded-xl font-medium border border-gray-300 hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={assignReviewer}
            className="bg-black text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
