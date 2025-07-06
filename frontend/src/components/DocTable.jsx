import React from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, UPLOADS_BASE } from "../config";

export default function DocTable({ documents, user, refresh }) {
  const navigate = useNavigate();

  const handleClick = (doc) => {
    if (user.role === "contributor") {
      navigate(`/dashboard/doc/${doc.id}`);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await fetch(`${API_BASE}/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      refresh();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <table className="w-full table-auto border border-gray-300">
      <thead className="bg-gray-100">
        <tr>
          <th className="border px-4 py-2">Name</th>
          <th className="border px-4 py-2">Type</th>
          <th className="border px-4 py-2">Status</th>
          <th className="border px-4 py-2">Assigned To</th>
          {user.role === "reviewer" && (
            <th className="border px-4 py-2">Actions</th>
          )}
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id} className="text-center hover:bg-gray-50">
            <td
              className="border px-4 py-2 cursor-pointer text-blue-600 hover:underline"
              onClick={() => handleClick(doc)}
            >
              {doc.name}
            </td>
            <td className="border px-4 py-2">{doc.type}</td>
            <td className="border px-4 py-2 capitalize">{doc.status}</td>
            <td className="border px-4 py-2">{doc.assigned_to || "—"}</td>
            {user.role === "reviewer" && (
              <td className="border px-4 py-2 space-x-2">
                {doc.status === "in_review" && (
                  <>
                    <button
                      className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                      onClick={() => handleStatusUpdate(doc.id, "accepted")}
                    >
                      Accept
                    </button>
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      onClick={() => handleStatusUpdate(doc.id, "rejected")}
                    >
                      Reject
                    </button>
                  </>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
