import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast";

// Renamed prop for clarity
function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Uploading document...");
    const formData = new FormData();
    formData.append("file", selectedFile);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/documents/upload",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      toast.success("Document uploaded successfully!", { id: toastId });

      // --- THE FIX ---
      // Call the parent function with the new document's ID
      onUploadComplete(data.file_id);
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
      setIsSubmitting(false); // Only re-enable buttons on error
    }
  };

  if (!isOpen) return null;

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
            Upload New Document
          </Dialog.Title>
          <div className="mt-4">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-700"
            >
              Document File
            </label>
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0"
            />
          </div>
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleUpload}
              disabled={isSubmitting || !selectedFile}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Uploading..." : "Upload"}
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
export default UploadModal;
