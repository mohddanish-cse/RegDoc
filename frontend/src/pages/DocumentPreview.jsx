import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import AssignReviewerModal from "../components/AssignReviewerModal";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { API_BASE, UPLOADS_BASE } from "../config";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

export default function DocumentPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [numPages, setNumPages] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const handleLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/docs?role=${user.role}&username=${user.username}`)
      .then((res) => res.json())
      .then((data) => {
        const foundDoc = data.find((d) => d.id === parseInt(id));
        if (foundDoc) setDoc(foundDoc);
        else setError("Document not found.");
      })
      .catch(() => setError("Error fetching document."))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setDoc({ ...doc, status: newStatus });
      } else {
        alert("Status update failed.");
      }
    } catch (err) {
      alert("Error updating status.");
    }
  };

  if (loading) return <div className="p-10">Loading document...</div>;
  if (error) return <div className="p-10 text-red-600">{error}</div>;

  return (
    <div className="p-10 flex gap-10">
      {/* Left Column: Metadata */}
      <div className="w-1/3 space-y-2">
        <h2 className="text-2xl font-bold">{doc.name}</h2>
        <p className="text-gray-700">Type: {doc.type}</p>
        <p className="text-gray-700">Status: {doc.status}</p>
        <p className="text-gray-700">Uploaded by: {doc.uploaded_by}</p>

        {user.role === "contributor" && doc.status === "draft" && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-black text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Assign Reviewer
          </button>
        )}

        {user.role === "reviewer" && doc.status === "in_review" && (
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => updateStatus("accepted")}
              className="bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition"
            >
              Accept
            </button>
            <button
              onClick={() => updateStatus("rejected")}
              className="bg-red-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-700 transition"
            >
              Reject
            </button>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-gray-500 underline hover:text-black"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Right Column: PDF Preview */}
      <div className="flex-1 border shadow p-4 rounded-xl bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Document
            file={`${UPLOADS_BASE}/${doc.filename}`}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={(err) => console.error("PDF load error:", err)}
          >
            <Page pageNumber={currentPage} className="shadow" />
          </Document>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage((prev) => prev - 1)}
              disabled={currentPage <= 1}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              ← Previous
            </button>

            <p className="text-sm text-gray-600">
              Page {currentPage} of {numPages}
            </p>

            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= numPages}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AssignReviewerModal
          docId={doc.id}
          onClose={() => {
            setShowModal(false);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
}
