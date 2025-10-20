// frontend/src/components/ResubmitModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function ResubmitModal({ isOpen, onClose, document, onResubmitSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResubmit = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading("Resubmitting document...");

    try {
      await apiCall(`/documents/${document.id}/resubmit`, "POST");
      toast.success("Document resubmitted successfully!", { id: toastId });
      onResubmitSuccess();
      onClose();
    } catch (err) {
      toast.error(`Resubmit failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            Revise & Resubmit
          </Dialog.Title>

          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              You are about to resubmit <strong>{document.filename}</strong> for
              review.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Note:</strong> The document will be resubmitted with
                the same workflow assignments. All reviewers will be notified.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleResubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-600 text-white rounded-md font-semibold hover:bg-orange-700 disabled:opacity-50"
            >
              {isSubmitting ? "Resubmitting..." : "Confirm Resubmit"}
            </button>
            <button
              onClick={onClose}
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

export default ResubmitModal;
