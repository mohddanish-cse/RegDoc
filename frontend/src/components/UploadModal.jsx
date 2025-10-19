// frontend/src/components/UploadModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import toast from "react-hot-toast";
import { apiCall } from "../utils/api";

function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // TMF metadata fields
  const [studyId, setStudyId] = useState("");
  const [country, setCountry] = useState("");
  const [siteId, setSiteId] = useState("");
  const [tmfZone, setTmfZone] = useState("");
  const [tmfSection, setTmfSection] = useState("");
  const [tmfArtifact, setTmfArtifact] = useState("");
  const [comment, setComment] = useState("");

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    // Validate file selection
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    // ✅ MANDATORY FIELD VALIDATION (except Country & Site ID)
    if (!studyId || !tmfZone || !tmfSection || !tmfArtifact) {
      toast.error(
        "Please fill all required fields (Study ID, TMF Zone, Section, and Artifact)."
      );
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading document...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("study_id", studyId);
    formData.append("country", country);
    formData.append("site_id", siteId);
    formData.append("tmf_zone", tmfZone);
    formData.append("tmf_section", tmfSection);
    formData.append("tmf_artifact", tmfArtifact);
    formData.append("comment", comment);

    try {
      const response = await apiCall(
        "/documents/upload",
        "POST",
        formData,
        true
      );

      toast.success(`Document ${response.doc_number} uploaded successfully!`, {
        id: toastId,
      });
      onUploadSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setStudyId("");
    setCountry("");
    setSiteId("");
    setTmfZone("");
    setTmfSection("");
    setTmfArtifact("");
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900">
            Upload New TMF Document
          </Dialog.Title>
          <div className="mt-4 space-y-4">
            {/* File Input */}
            <div>
              <label
                htmlFor="file-upload"
                className="block text-sm font-medium text-gray-700"
              >
                Document File *
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                disabled={isUploading}
                required
              />
            </div>

            {/* TMF Metadata Fields */}
            <fieldset className="border p-4 rounded-md">
              <legend className="text-sm font-semibold text-gray-700 px-2">
                TMF Metadata
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Study ID"
                  value={studyId}
                  onChange={setStudyId}
                  disabled={isUploading}
                  required={true}
                />
                <InputField
                  label="Country"
                  value={country}
                  onChange={setCountry}
                  disabled={isUploading}
                  required={false}
                />
                <InputField
                  label="Site ID"
                  value={siteId}
                  onChange={setSiteId}
                  disabled={isUploading}
                  required={false}
                />
                <InputField
                  label="TMF Zone"
                  value={tmfZone}
                  onChange={setTmfZone}
                  disabled={isUploading}
                  required={true}
                />
                <InputField
                  label="TMF Section"
                  value={tmfSection}
                  onChange={setTmfSection}
                  disabled={isUploading}
                  required={true}
                />
                <InputField
                  label="TMF Artifact"
                  value={tmfArtifact}
                  onChange={setTmfArtifact}
                  disabled={isUploading}
                  required={true}
                />
              </div>
            </fieldset>

            {/* Comment Field */}
            <div>
              <label
                htmlFor="comment"
                className="block text-sm font-medium text-gray-700"
              >
                Comment (Optional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-800 focus:ring-gray-800 sm:text-sm"
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleUpload}
              className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
              disabled={isUploading || !file}
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </button>
            <button
              onClick={handleClose}
              disabled={isUploading}
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

// ✅ Updated InputField with asterisk (*) for required fields
const InputField = ({ label, value, onChange, disabled, required }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-800 focus:ring-gray-800 sm:text-sm"
    />
  </div>
);

export default UploadModal;
