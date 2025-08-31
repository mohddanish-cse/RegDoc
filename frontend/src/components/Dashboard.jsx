import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import ReviewModal from "./ReviewModal"; // Import the new modal

function Dashboard({ currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  // State for the 'Submit for Review' modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  // State for the new 'Review' modal
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
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Document Dashboard
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.length > 0 ? (
                documents.map((doc) => {
                  const isAuthor = doc.author_id === currentUser.id;
                  const isReviewer = doc.reviewers?.includes(currentUser.id);

                  return (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.status}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.author}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {doc.status === "Draft" && isAuthor && (
                          <button
                            onClick={() => openSubmitModal(doc)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Submit
                          </button>
                        )}
                        {doc.status === "In Review" && isReviewer && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openReviewModal(doc)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openReviewModal(doc)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
