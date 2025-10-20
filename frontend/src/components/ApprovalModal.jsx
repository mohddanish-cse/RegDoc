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
      toast.error("Please select Approve or Reject");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting final approval...");

    try {
      await apiCall(`/documents/${document.id}/final-approval`, "POST", {
        decision: decision,
        comment: comment,
      });

      if (decision === "Approved") {
        toast.success("Document approved and digitally signed!", {
          id: toastId,
        });
      } else {
        toast.success("Document rejected", { id: toastId });
      }

      onApprovalSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Approval failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDecision("");
    setComment("");
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            Final Approval: {document.filename}
          </Dialog.Title>

          <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Important:</strong> Approving will apply a digital
              signature and lock the document.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decision *
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setDecision("Approved")}
                  className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${
                    decision === "Approved"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  disabled={isSubmitting}
                >
                  ✓ Approve & Sign
                </button>
                <button
                  onClick={() => setDecision("Rejected")}
                  className={`flex-1 py-2 px-4 rounded-md font-semibold transition ${
                    decision === "Rejected"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  disabled={isSubmitting}
                >
                  ✗ Reject
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm"
                placeholder="Enter approval comments..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !decision}
              className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Submit Decision"}
            </button>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default ApprovalModal;
