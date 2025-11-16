// frontend/src/components/QcModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function QcModal({ isOpen, onClose, document, onQcSuccess }) {
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!decision) {
      toast.error("Please select Pass or Fail");
      return;
    }

    if (decision === "Fail" && !comment.trim()) {
      toast.error("Please provide comments explaining why QC failed");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting QC review...");

    try {
      await apiCall(`/documents/${document.id}/qc-review`, "POST", {
        decision: decision,
        comment: comment,
      });

      toast.success(`QC Review: ${decision}`, { id: toastId });
      onQcSuccess();
      handleClose();
    } catch (err) {
      toast.error(`QC review failed: ${err.message}`, { id: toastId });
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
        <Dialog.Panel className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
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
                  Quality Control Review
                </Dialog.Title>
                <p className="text-amber-100 text-sm">{document.filename}</p>
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

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Decision Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                QC Decision <span className="text-error-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDecision("Pass")}
                  disabled={isSubmitting}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    decision === "Pass"
                      ? "border-green-500 bg-green-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        decision === "Pass" ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <svg
                        className={`w-6 h-6 ${
                          decision === "Pass"
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
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
                    </div>
                    <span
                      className={`font-semibold text-sm ${
                        decision === "Pass" ? "text-green-700" : "text-gray-700"
                      }`}
                    >
                      Pass
                    </span>
                    <p className="text-xs text-gray-600">
                      Quality standards met
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setDecision("Fail")}
                  disabled={isSubmitting}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    decision === "Fail"
                      ? "border-error-500 bg-error-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        decision === "Fail" ? "bg-error-100" : "bg-gray-100"
                      }`}
                    >
                      <svg
                        className={`w-6 h-6 ${
                          decision === "Fail"
                            ? "text-error-600"
                            : "text-gray-400"
                        }`}
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
                    </div>
                    <span
                      className={`font-semibold text-sm ${
                        decision === "Fail" ? "text-error-700" : "text-gray-700"
                      }`}
                    >
                      Fail
                    </span>
                    <p className="text-xs text-gray-600">Issues found</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Comments Textarea */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                QC Comments{" "}
                {decision === "Fail" && (
                  <span className="text-error-600">*</span>
                )}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none text-sm"
                placeholder={
                  decision === "Fail"
                    ? "Explain quality issues (required)..."
                    : "Enter comments (optional)..."
                }
                disabled={isSubmitting}
              />
              {decision === "Fail" && (
                <p className="text-xs text-error-600 mt-1">
                  Comments are required when failing QC
                </p>
              )}
            </div>

            {/* Warning */}
            {decision === "Fail" && (
              <div className="p-2.5 bg-error-50 border-l-4 border-error-400 rounded flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-error-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-xs text-error-700">
                  <strong>QC Failed:</strong> Document will return to author for
                  corrections.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !decision ||
                (decision === "Fail" && !comment.trim())
              }
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  Submitting...
                </span>
              ) : (
                "Submit QC Review"
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default QcModal;
