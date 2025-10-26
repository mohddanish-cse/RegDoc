// frontend/src/components/UploadRevisionModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

const UploadRevisionModal = ({ isOpen, onClose, document, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("comment", comment || "Revised after rejection");

      await apiCall(
        `/documents/${document.id}/upload-revision`,
        "POST",
        formData,
        true // isFormData = true
      );

      toast.success("Revised file uploaded successfully!");
      onSuccess();
      onClose();
      setFile(null);
      setComment("");
    } catch (error) {
      console.error("Error uploading revision:", error);
      toast.error(error.message || "Failed to upload revised file");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-gray-900 mb-4">
            Upload Revised File
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-4">
            Upload a corrected version of{" "}
            <span className="font-medium">{document.doc_number}</span> to
            address the rejection feedback.
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Revised File <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                required
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revision Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Describe what was fixed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload Revised File"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default UploadRevisionModal;
