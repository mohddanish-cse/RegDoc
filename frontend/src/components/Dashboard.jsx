import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // New state for reviewers
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

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

  const openSubmitModal = async (doc) => {
    setSelectedDoc(doc);
    setIsModalOpen(true);
    // Fetch the list of potential reviewers when the modal opens
    try {
      const reviewerData = await apiCall("/user/reviewers");
      setReviewers(reviewerData);
    } catch (err) {
      alert(`Error fetching reviewers: ${err.message}`);
    }
  };

  const closeSubmitModal = () => {
    setIsModalOpen(false);
    setSelectedDoc(null);
    setReviewers([]); // Clear lists on close
    setSelectedReviewers([]);
  };

  // Handle checking/unchecking a reviewer
  const handleReviewerSelection = (reviewerId) => {
    setSelectedReviewers(
      (prev) =>
        prev.includes(reviewerId)
          ? prev.filter((id) => id !== reviewerId) // Uncheck: remove ID
          : [...prev, reviewerId] // Check: add ID
    );
  };

  const handleConfirmSubmit = async () => {
    if (!selectedDoc) return;
    try {
      // Send the selected reviewer IDs in the body
      await apiCall(`/documents/${selectedDoc.id}/submit`, "POST", {
        reviewers: selectedReviewers,
      });
      closeSubmitModal();
      fetchDocuments(); // Refresh the dashboard
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
            {documents.map((doc) => (
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
                  {doc.status === "Draft" && (
                    <button
                      onClick={() => openSubmitModal(doc)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Submit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- The Updated Modal Dialog --- */}
      <Dialog
        open={isModalOpen}
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

            {/* Reviewer Selection List */}
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
    </>
  );
}

export default Dashboard;
