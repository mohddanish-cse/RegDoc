// frontend/src/components/ReviewModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function ReviewModal({ isOpen, onClose, document, onReviewSuccess }) {
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!decision) {
      toast.error("Please select a decision");
      return;
    }

    if (decision === "RequestChanges" && !comment.trim()) {
      toast.error("Comments are required when requesting changes");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting review...");

    try {
      await apiCall(`/documents/${document.id}/technical-review`, "POST", {
        decision: decision,
        comment: comment,
      });

      if (decision === "Approved") {
        toast.success("Technical review approved!", { id: toastId });
      } else if (decision === "RequestChanges") {
        toast.success("Changes requested - document returned to author", {
          id: toastId,
        });
      }

      onReviewSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Review failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDecision("");
      setComment("");
      onClose();
    }
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-xl">
            <Dialog.Title className="text-xl font-bold">
              Technical Review
            </Dialog.Title>
            <p className="text-sm text-purple-100 mt-1">{document.filename}</p>
          </div>

          {/* Scrollable Content */}
          <div className="px-6 py-4 max-h-[500px] overflow-y-auto space-y-4">
            {/* Decision Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Decision <span className="text-error-500">*</span>
              </label>

              <div className="space-y-3">
                {/* Approve Button */}
                <button
                  type="button"
                  onClick={() => setDecision("Approved")}
                  disabled={isSubmitting}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    decision === "Approved"
                      ? "border-green-500 bg-green-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {decision === "Approved" && (
                        <svg
                          className="w-5 h-5 text-green-500 inline mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span className="font-semibold text-gray-900">
                        Approve
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Content meets technical requirements
                      </p>
                    </div>
                    {decision === "Approved" && (
                      <svg
                        className="w-6 h-6 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Request Changes */}
                <button
                  type="button"
                  onClick={() => setDecision("RequestChanges")}
                  disabled={isSubmitting}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    decision === "RequestChanges"
                      ? "border-yellow-500 bg-yellow-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {decision === "RequestChanges" && (
                        <svg
                          className="w-5 h-5 text-yellow-500 inline mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span className="font-semibold text-gray-900">
                        Request Changes
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Minor fixes needed - returns to author for corrections
                      </p>
                    </div>
                    {decision === "RequestChanges" && (
                      <svg
                        className="w-6 h-6 text-yellow-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Comments Textarea */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Comments
                {decision === "RequestChanges" && (
                  <span className="text-red-500"> *</span>
                )}
                {decision === "RequestChanges" && (
                  <span className="text-xs text-gray-500 font-normal ml-1">
                    (Required when requesting changes)
                  </span>
                )}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 text-sm border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none ${
                  decision === "RequestChanges" && !comment.trim()
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
                placeholder={
                  decision === "RequestChanges"
                    ? "Please explain what changes are needed..."
                    : "Enter review comments..."
                }
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !decision}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ReviewModal;
