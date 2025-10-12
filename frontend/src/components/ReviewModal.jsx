// frontend/src/components/ReviewModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function ReviewModal({ isOpen, onClose, document, onReviewSuccess }) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (decision) => {
    // Validation: Require a comment for non-approval decisions
    if (
      (decision === "Rejected" || decision === "ChangesRequested") &&
      !comment.trim()
    ) {
      toast.error("A comment is required for this decision.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Submitting review: ${decision}...`);

    try {
      // --- THE FIX: Call the new, correct backend endpoint ---
      await apiCall(`/documents/${document.id}/peer-review`, "POST", {
        decision,
        comment,
      });
      toast.success("Review submitted successfully!", { id: toastId });
      onReviewSuccess(); // Refresh the parent page's data
      handleClose();
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComment("");
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && handleClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900">
            Perform Peer Review
          </Dialog.Title>
          <p className="text-sm text-gray-600 mt-1">
            Document: {document.filename}
          </p>

          <div className="mt-4">
            <label
              htmlFor="review-comment"
              className="block text-sm font-medium text-gray-700"
            >
              Comments (Required for 'Reject' or 'Request Changes')
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-6 flex justify-between gap-4">
            <div>
              <button
                onClick={() => handleSubmit("Approved")}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleSubmit("ChangesRequested")}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                Request Changes
              </button>
              <button
                onClick={() => handleSubmit("Rejected")}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="ml-auto inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm"
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
