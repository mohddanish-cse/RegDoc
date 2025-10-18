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

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const handleAmend = async () => {
    if (!selectedFile) {
      toast.error("Please select a new file.");
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
        onAmendSuccess(response.new_document_id);
      } else {
        onActionSuccess();
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
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold">
            Amend Document
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            You are submitting a new version for:{" "}
            <strong>{document.filename}</strong>
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">
                New Document File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
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
              onClick={handleAmend}
              disabled={isSubmitting || !selectedFile}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit New Version"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
export default AmendModal;
