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
    const toastId = toast.loading(`Submitting QC decision: ${decision}...`);

    try {
      await apiCall(`/documents/${document.id}/qc-review`, "POST", {
        decision,
        comment,
      });
      toast.success("QC decision submitted successfully!", { id: toastId });
      onActionSuccess();
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
            Perform Quality Control Check
          </Dialog.Title>
          <p className="text-sm text-gray-600 mt-1">
            Document: {document.filename}
          </p>

          <div className="mt-4">
            <label
              htmlFor="qc-comment"
              className="block text-sm font-medium text-gray-700"
            >
              Comments (Required if failing)
            </label>
            <textarea
              id="qc-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleSubmit("Pass")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Pass QC
            </button>
            <button
              onClick={() => handleSubmit("Fail")}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Fail QC
            </button>
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

export default QcModal;
