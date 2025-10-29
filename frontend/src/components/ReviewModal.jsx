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
      } else {
        toast.success("Document withdrawn completely", { id: toastId });
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
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg backdrop-blur-sm">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <Dialog.Title className="text-xl font-bold text-white">
                  Technical Review
                </Dialog.Title>
                <p className="text-purple-100 text-sm mt-0.5">
                  {document.filename}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            {/* Decision Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Decision <span className="text-error-600">*</span>
              </label>
              <div className="space-y-3">
                {/* Approve Button */}
                <button
                  onClick={() => setDecision("Approved")}
                  disabled={isSubmitting}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    decision === "Approved"
                      ? "border-green-500 bg-green-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        decision === "Approved"
                          ? "border-green-600"
                          : "border-gray-300"
                      }`}
                    >
                      {decision === "Approved" && (
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">
                        Approve
                      </span>
                      <p className="text-sm text-gray-600">
                        Content meets technical requirements
                      </p>
                    </div>
                    {decision === "Approved" && (
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Request Changes */}
                <button
                  onClick={() => setDecision("RequestChanges")}
                  disabled={isSubmitting}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    decision === "RequestChanges"
                      ? "border-yellow-500 bg-yellow-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        decision === "RequestChanges"
                          ? "border-yellow-600"
                          : "border-gray-300"
                      }`}
                    >
                      {decision === "RequestChanges" && (
                        <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">
                        Request Changes
                      </span>
                      <p className="text-sm text-gray-600">
                        Minor fixes needed - returns to same reviewer
                      </p>
                    </div>
                    {decision === "RequestChanges" && (
                      <svg
                        className="w-5 h-5 text-yellow-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Reject Completely */}
                <button
                  onClick={() => setDecision("RejectedCompletely")}
                  disabled={isSubmitting}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    decision === "RejectedCompletely"
                      ? "border-error-500 bg-error-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        decision === "RejectedCompletely"
                          ? "border-error-600"
                          : "border-gray-300"
                      }`}
                    >
                      {decision === "RejectedCompletely" && (
                        <div className="w-2 h-2 rounded-full bg-error-600"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">
                        Reject Completely
                      </span>
                      <p className="text-sm text-gray-600">
                        Document withdrawn (no further action)
                      </p>
                    </div>
                    {decision === "RejectedCompletely" && (
                      <svg
                        className="w-5 h-5 text-error-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Comments Textarea */}
            <div>
              <label
                htmlFor="comment"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Comments
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                placeholder="Enter review comments..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !decision}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm ${
                decision === "Approved"
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  : decision === "RequestChanges"
                  ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                  : "bg-error-600 hover:bg-error-700 focus:ring-error-500"
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                </span>
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
