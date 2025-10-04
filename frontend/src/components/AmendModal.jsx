import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast";

function AmendModal({ isOpen, onClose, document, onAmendSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
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
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/documents/${document.id}/amend`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to amend");
      toast.success("New version submitted successfully!", { id: toastId });
      onAmendSuccess(data.new_document_id);
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && onClose()}
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
          <div className="mt-4">
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
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleAmend}
              disabled={isSubmitting || !selectedFile}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit New Version"}
            </button>
            <button
              onClick={onClose}
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
