// frontend/src/components/ApprovalModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function ApprovalModal({ isOpen, onClose, document, onApprovalSuccess }) {
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!decision) {
      toast.error("Please select a decision");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please provide a comment");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Processing approval decision...");

    try {
      await apiCall(`/documents/${document.id}/final-approval`, "POST", {
        decision,
        comment: comment.trim(),
      });

      const successMessages = {
        Approved: "Document approved and digitally signed!",
        RejectedWithRevisions:
          "Document rejected - author will receive revision feedback",
        RejectedCompletely: "Document withdrawn completely",
      };

      toast.success(successMessages[decision], { id: toastId });

      onApprovalSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Approval failed: ${err.message}`, { id: toastId });
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

  const getDecisionConfig = () => {
    const configs = {
      Approved: {
        color: "from-green-600 to-green-700",
        icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
        title: "Final Approval",
      },
      RejectedWithRevisions: {
        color: "from-yellow-600 to-yellow-700",
        icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
        title: "Reject with Revisions",
      },
      RejectedCompletely: {
        color: "from-red-600 to-red-700",
        icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
        title: "Reject Completely",
      },
    };
    return configs[decision] || configs.Approved;
  };

  const config = getDecisionConfig();

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className={`bg-gradient-to-r ${config.color} px-5 py-3`}>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 bg-white/20 rounded-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={config.icon}
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-lg font-bold text-white truncate">
                  {config.title}
                </Dialog.Title>
                <p className="text-white/90 text-xs truncate">
                  {document.filename}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <svg
                  className="w-5 h-5"
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

          {/* Content - Scrollable */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            {/* Decision Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Approval Decision <span className="text-error-600">*</span>
              </label>
              <div className="space-y-2">
                {/* Approve */}
                <label
                  className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    decision === "Approved"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="Approved"
                    checked={decision === "Approved"}
                    onChange={(e) => setDecision(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-0.5 w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <div className="ml-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-semibold text-sm text-gray-900">
                        Approve & Sign
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Approve and apply digital signature. Version will be
                      incremented.
                    </p>
                  </div>
                </label>

                {/* Reject with Revisions */}
                <label
                  className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    decision === "RejectedWithRevisions"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-200 hover:border-yellow-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="RejectedWithRevisions"
                    checked={decision === "RejectedWithRevisions"}
                    onChange={(e) => setDecision(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-0.5 w-4 h-4 text-yellow-600 focus:ring-yellow-500"
                  />
                  <div className="ml-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4 text-yellow-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span className="font-semibold text-sm text-gray-900">
                        Reject with Revisions
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Return to author for corrections. Will go through QC,
                      Review, and Approval again.
                    </p>
                  </div>
                </label>

                {/* Reject Completely */}
                <label
                  className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    decision === "RejectedCompletely"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="decision"
                    value="RejectedCompletely"
                    checked={decision === "RejectedCompletely"}
                    onChange={(e) => setDecision(e.target.value)}
                    disabled={isSubmitting}
                    className="mt-0.5 w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <div className="ml-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      <span className="font-semibold text-sm text-gray-900">
                        Reject Completely
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Permanently withdraw. Marked as "Withdrawn" and cannot be
                      resubmitted.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Comment / Feedback <span className="text-error-600">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder={
                  decision === "Approved"
                    ? "Provide approval notes..."
                    : "Explain the reason for rejection..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                {decision === "Approved"
                  ? "Approval notes (visible in history)"
                  : "This feedback will be sent to the author"}
              </p>
            </div>

            {/* Warning */}
            {decision === "RejectedCompletely" && (
              <div className="p-2.5 bg-red-50 border-l-4 border-red-400 rounded flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-xs text-red-700">
                  <strong>Permanent Action:</strong> This document will be
                  withdrawn and cannot be recovered.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !decision || !comment.trim()}
              className={`px-3.5 py-2 text-sm font-semibold text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors ${
                decision === "Approved"
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  : decision === "RejectedWithRevisions"
                  ? "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500"
                  : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
              }`}
            >
              {isSubmitting
                ? "Processing..."
                : decision === "Approved"
                ? "Approve & Sign"
                : decision === "RejectedWithRevisions"
                ? "Reject & Request Revisions"
                : "Reject Completely"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ApprovalModal;
