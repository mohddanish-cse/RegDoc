import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import ReviewModal from "./ReviewModal";
import DocumentTable from "./DocumentTable";

function Dashboard({ currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      const data = await apiCall("/documents/");
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // --- Submit Modal Functions ---
  const openSubmitModal = async (doc) => {
    setSelectedDoc(doc);
    setIsSubmitModalOpen(true);
    try {
      const reviewerData = await apiCall("/user/reviewers");
      setReviewers(reviewerData);
    } catch (err) {
      alert(`Error fetching reviewers: ${err.message}`);
    }
  };

  const closeSubmitModal = () => {
    setIsSubmitModalOpen(false);
    setSelectedDoc(null);
    setReviewers([]);
    setSelectedReviewers([]);
  };

  const handleReviewerSelection = (reviewerId) => {
    setSelectedReviewers((prev) =>
      prev.includes(reviewerId)
        ? prev.filter((id) => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  const handleConfirmSubmit = async () => {
    if (!selectedDoc) return;
    try {
      await apiCall(`/documents/${selectedDoc.id}/submit`, "POST", {
        reviewers: selectedReviewers,
      });
      closeSubmitModal();
      fetchDocuments();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // --- Review Modal Functions ---
  const openReviewModal = (doc) => {
    setSelectedDoc(doc);
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setSelectedDoc(null);
    setIsReviewModalOpen(false);
  };

  const handleReviewSuccess = () => {
    closeReviewModal();
    fetchDocuments(); // Refresh the dashboard data
  };

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  if (!currentUser) {
    return <p>Loading user...</p>;
  }

  return (
    <>
      <DocumentTable
        documents={documents}
        currentUser={currentUser}
        onOpenSubmitModal={openSubmitModal}
        onOpenReviewModal={openReviewModal}
      />

      {/* --- Submit Modal --- */}
      <Dialog
        open={isSubmitModalOpen}
        onClose={closeSubmitModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg rounded bg-white p-6">
            <Dialog.Title className="text-lg font-bold">
              Submit for Review
            </Dialog.Title>
            <p className="mt-2 text-sm text-gray-600">
              Select reviewers for the document:{" "}
              <strong>{selectedDoc?.filename}</strong>
            </p>
            <div className="mt-4 max-h-40 overflow-y-auto border rounded-md p-2">
              {reviewers.length > 0 ? (
                reviewers.map((reviewer) => (
                  <div
                    key={reviewer.id}
                    className="flex items-center space-x-2 p-1"
                  >
                    <input
                      type="checkbox"
                      id={`reviewer-${reviewer.id}`}
                      checked={selectedReviewers.includes(reviewer.id)}
                      onChange={() => handleReviewerSelection(reviewer.id)}
                    />
                    <label htmlFor={`reviewer-${reviewer.id}`}>
                      {reviewer.username}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No reviewers found.</p>
              )}
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleConfirmSubmit}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                disabled={selectedReviewers.length === 0}
              >
                Confirm Submit
              </button>
              <button
                onClick={closeSubmitModal}
                className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* --- Review Modal --- */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeReviewModal}
        document={selectedDoc}
        onReviewSuccess={handleReviewSuccess}
      />
    </>
  );
}

export default Dashboard;
