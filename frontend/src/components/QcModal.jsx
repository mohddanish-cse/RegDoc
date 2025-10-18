// frontend/src/components/QcModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function QcModal({ isOpen, onClose, document, onActionSuccess }) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (decision) => {
    if (decision === "Fail" && !comment.trim()) {
      toast.error("A comment is required to fail a QC check.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting QC decision...");
    try {
      // --- THE FIX: Call the new generic /review endpoint ---
      await apiCall(`/documents/${document.id}/review`, "POST", {
        decision,
        comment,
      });
      toast.success("QC decision submitted!", { id: toastId });
      onActionSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`, { id: toastId });
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
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold">
            Perform Quality Control Check
          </Dialog.Title>
          <p className="text-sm text-gray-600 mt-1">
            Document: {document.filename}
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium">
              Comments (Required if failing)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              disabled={isSubmitting}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit("Fail")}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              Fail QC
            </button>
            <button
              onClick={() => handleSubmit("Pass")}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Pass QC
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
export default QcModal;
