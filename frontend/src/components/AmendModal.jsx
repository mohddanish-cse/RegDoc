// frontend/src/components/AmendModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function AmendModal({
  isOpen,
  onClose,
  document,
  onActionSuccess,
  onAmendSuccess,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);

  const handleAmend = async () => {
    if (!selectedFile) {
      toast.error("Please select a new version of the file.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Submitting new version...");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("comment", comment);

    try {
      const response = await apiCall(
        `/documents/${document.id}/amend`,
        "POST",
        formData,
        true
      );
      toast.success(response.message || "Action successful!", { id: toastId });

      if (response.new_document_id) {
        onAmendSuccess(response.new_document_id); // Navigate to new major version
      } else {
        onActionSuccess(); // Refresh current page for minor revision
      }
      handleClose();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
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
          <Dialog.Title className="text-lg font-bold text-gray-900">
            Amend Document
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            You are submitting a new version for:{" "}
            <strong>{document.filename}</strong>
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="amend-file-upload"
                className="block text-sm font-medium text-gray-700"
              >
                New Document File
              </label>
              <input
                id="amend-file-upload"
                type="file"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0"
              />
            </div>
            <div>
              <label
                htmlFor="amend-comment"
                className="block text-sm font-medium text-gray-700"
              >
                Comment (Optional)
              </label>
              <textarea
                id="amend-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleAmend}
              disabled={isSubmitting || !selectedFile}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit New Version"}
            </button>
            <button
              onClick={handleClose}
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

export default AmendModal;
