import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";

function ReviewModal({ isOpen, onClose, document, onReviewSuccess }) {
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setComments(""); // Reset comments when the modal opens
      setError(""); // Clear any previous errors
    }
  }, [isOpen, document]); // Re-run effect if isOpen or document changes

  const handleReview = async (decision) => {
    setError("");
    try {
      await apiCall(`/documents/${document.id}/review`, "POST", {
        decision, // 'Approved' or 'Rejected'
        comments,
      });
      onReviewSuccess(); // Tell the dashboard to refresh
      onClose(); // Explicitly close the modal on success (this will trigger the useEffect reset)
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen || !document) {
    // Added !document check for safety
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded bg-white p-6">
          <Dialog.Title className="text-lg font-bold">
            Review Document
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            You are reviewing: <strong>{document?.filename}</strong>
          </p>

          {error && (
            <p className="mt-2 p-2 text-sm text-center text-red-700 bg-red-100 rounded-lg">
              {error}
            </p>
          )}

          <div className="mt-4">
            <label
              htmlFor="comments"
              className="block text-sm font-medium text-gray-700"
            >
              Comments (Optional)
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleReview("Approved")}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={() => handleReview("Rejected")}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reject
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ReviewModal;
