import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadDocModal from "../components/UploadDocModal";
import DocumentList from "../components/DocumentList";
import { useAuth } from "../context/AuthContext";
import { API_BASE, UPLOADS_BASE } from "../config";

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchDocs = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/docs?role=${user.role}&username=${user.username}`
        );
        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error("Failed to fetch documents", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white text-black px-10 py-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, <span className="text-gray-800">{user.username}</span>
            <span className="ml-2 px-2 py-1 text-sm bg-gray-200 rounded">
              {user.role}
            </span>
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="bg-black text-white px-4 py-2 rounded hover:opacity-80 transition"
        >
          Logout
        </button>
      </div>

      {/* Upload button */}
      {user.role === "contributor" && (
        <div className="mb-6">
          <button
            onClick={() => setShowUpload(true)}
            className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Upload New Document
          </button>
        </div>
      )}

      {/* Document Table */}
      <h2 className="text-xl font-semibold mb-2">Your Documents</h2>

      {loading ? (
        <p className="text-gray-500">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-gray-500">No documents found.</p>
      ) : (
        <DocumentList docs={documents} user={user} />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadDocModal
          onClose={() => setShowUpload(false)}
          onUploadSuccess={(newDoc) => {
            setDocuments((prev) => [...prev, newDoc]);
            setShowUpload(false);
          }}
          user={user}
        />
      )}
    </div>
  );
}
