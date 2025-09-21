import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";

function AmendModal({ isOpen, onClose, document, onAmendSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");

  // Reset the state whenever the modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setError("");
    }
  }, [isOpen]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError("");
  };

  const handleAmend = async () => {
    if (!selectedFile) {
      setError("Please select a new version of the file.");
      return;
    }
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/documents/${document.id}/amend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData, // Use FormData for file uploads
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to amend document");
      }

      onAmendSuccess(data.new_document_id); // Pass the new ID to the parent
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen || !document) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-lg font-bold text-gray-900">
            Amend Document
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            You are submitting a new version for:{" "}
            <strong>{document.filename}</strong> (v{document.version}).
          </p>

          {error && (
            <p className="mt-2 p-2 text-sm text-center text-red-700 bg-red-100 rounded-lg">
              {error}
            </p>
          )}

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
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleAmend}
              disabled={!selectedFile}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Submit New Version
            </button>
            <button
              onClick={onClose}
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
