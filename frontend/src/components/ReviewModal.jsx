import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function ReviewModal({ isOpen, onClose, document, onReviewSuccess }) {
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setComments("");
    }
  }, [isOpen]);

  const handleReview = async (decision) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting review...");
    try {
      await apiCall(`/documents/${document.id}/review`, "POST", {
        decision,
        comments,
      });
      toast.success("Review submitted successfully!", { id: toastId });
      onReviewSuccess();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !document) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && onClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-gray-900">
            Review Document
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            You are reviewing: <strong>{document?.filename}</strong>
          </p>
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
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm"
              disabled={isSubmitting}
            />
          </div>
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleReview("Accepted")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Accept Review"}
            </button>
            <button
              onClick={() => handleReview("Rejected")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Reject"}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
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
