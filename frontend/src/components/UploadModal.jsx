// frontend/src/components/UploadModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [studyId, setStudyId] = useState("");
  const [country, setCountry] = useState("");
  const [siteId, setSiteId] = useState("");
  const [tmfZone, setTmfZone] = useState("");
  const [tmfSection, setTmfSection] = useState("");
  const [tmfArtifact, setTmfArtifact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast.error("Please select a valid PDF file");
      e.target.value = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }

    // Validate required fields (Country and Site ID are optional)
    if (!studyId || !tmfZone || !tmfSection || !tmfArtifact) {
      toast.error(
        "Please fill all required fields (Study ID, TMF Zone, Section, and Artifact)"
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Uploading document...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("study_id", studyId);
      formData.append("country", country);
      formData.append("site_id", siteId);
      formData.append("tmf_zone", tmfZone);
      formData.append("tmf_section", tmfSection);
      formData.append("tmf_artifact", tmfArtifact);

      await apiCall("/documents/upload", "POST", formData, true);

      toast.success("Document uploaded successfully!", { id: toastId });
      onUploadSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFile(null);
      setStudyId("");
      setCountry("");
      setSiteId("");
      setTmfZone("");
      setTmfSection("");
      setTmfArtifact("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg backdrop-blur-sm">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <Dialog.Title className="text-xl font-bold text-white">
                  Upload New Document
                </Dialog.Title>
                <p className="text-primary-100 text-sm mt-0.5">
                  Add a new document to the system
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PDF File <span className="text-error-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50"
                    required
                  />
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {file.name}
                  </p>
                )}
              </div>

              {/* TMF Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="studyId"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Study ID <span className="text-error-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="studyId"
                    value={studyId}
                    onChange={(e) => setStudyId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., STUDY-001"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="country"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Country
                  </label>
                  <input
                    type="text"
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., USA"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label
                    htmlFor="siteId"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Site ID
                  </label>
                  <input
                    type="text"
                    id="siteId"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., SITE-101"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label
                    htmlFor="tmfZone"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    TMF Zone <span className="text-error-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="tmfZone"
                    value={tmfZone}
                    onChange={(e) => setTmfZone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Zone 01"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="tmfSection"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    TMF Section <span className="text-error-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="tmfSection"
                    value={tmfSection}
                    onChange={(e) => setTmfSection(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Section 01.01"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="tmfArtifact"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    TMF Artifact <span className="text-error-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="tmfArtifact"
                    value={tmfArtifact}
                    onChange={(e) => setTmfArtifact(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Protocol"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !file}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  "Upload Document"
                )}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default UploadModal;
