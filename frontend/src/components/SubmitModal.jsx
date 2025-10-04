import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function SubmitModal({
  isOpen,
  onClose,
  document,
  reviewers,
  selectedReviewers,
  onReviewerSelect,
  onSubmitSuccess,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting for review...");

    try {
      await apiCall(`/documents/${document.id}/submit`, "POST", {
        reviewers: selectedReviewers,
      });
      toast.success("Document submitted successfully!", { id: toastId });
      onSubmitSuccess(); // This will close the modal and refresh the data
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
      setIsSubmitting(false); // Only re-enable buttons on error
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
            Submit for Review
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            Select reviewers for: <strong>{document.filename}</strong>
          </p>
          <div className="mt-4 max-h-40 overflow-y-auto border rounded-md p-2">
            {reviewers && reviewers.length > 0 ? (
              reviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="flex items-center space-x-2 p-1"
                >
                  <input
                    type="checkbox"
                    id={`reviewer-${reviewer.id}`}
                    checked={selectedReviewers.includes(reviewer.id)}
                    onChange={() => onReviewerSelect(reviewer.id)}
                    disabled={isSubmitting}
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
              onClick={handleSubmit}
              className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
              disabled={isSubmitting || selectedReviewers.length === 0}
            >
              {isSubmitting ? "Submitting..." : "Confirm Submit"}
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

export default SubmitModal;
