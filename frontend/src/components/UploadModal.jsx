// frontend/src/components/UploadModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import Select from "react-select";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";
import tmfStructure from "../data/tmf-structure.json";

function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [studyId, setStudyId] = useState("");
  const [country, setCountry] = useState("");
  const [site, setSite] = useState("");

  // TMF Cascading Dropdowns
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedArtifact, setSelectedArtifact] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate dropdown options
  const zoneOptions = tmfStructure.zones.map((z) => ({
    value: z.code,
    label: `${z.code} - ${z.name}`,
    data: z,
  }));

  const sectionOptions = selectedZone
    ? selectedZone.data.sections.map((s) => ({
        value: s.code,
        label: `${s.code} - ${s.name}`,
        data: s,
      }))
    : [];

  const artifactOptions = selectedSection
    ? selectedSection.data.artifacts.map((a) => ({
        value: a,
        label: a,
      }))
    : [];

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleZoneChange = (option) => {
    setSelectedZone(option);
    setSelectedSection(null);
    setSelectedArtifact(null);
  };

  const handleSectionChange = (option) => {
    setSelectedSection(option);
    setSelectedArtifact(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    // Validation - ONLY file, studyId, and TMF fields are mandatory
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (!studyId) {
      toast.error("Please enter Study ID");
      return;
    }
    if (!selectedZone || !selectedSection || !selectedArtifact) {
      toast.error("Please select TMF Zone, Section, and Artifact");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Uploading document...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("study_id", studyId);
    formData.append("country", country);
    formData.append("site_id", site);
    formData.append("tmf_zone", selectedZone.label);
    formData.append("tmf_section", selectedSection.label);
    formData.append("tmf_artifact", selectedArtifact.value);

    try {
      const response = await apiCall("/documents/upload", "POST", formData, {
        "Content-Type": "multipart/form-data",
      });

      toast.success("Document uploaded successfully!", { id: toastId });

      // Reset form
      setFile(null);
      setStudyId("");
      setCountry("");
      setSite("");
      setSelectedZone(null);
      setSelectedSection(null);
      setSelectedArtifact(null);

      onUploadSuccess(response.document);
      onClose();
    } catch (error) {
      toast.error(error.message || "Upload failed", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Input field class with better focus styling
  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-2xl rounded-lg bg-white shadow-xl">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 rounded-t-lg">
            <div className="flex items-center gap-3">
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
              <Dialog.Title className="text-xl font-semibold text-white">
                Upload New Document
              </Dialog.Title>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document File <span className="text-red-600">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Accepted formats: PDF, DOC, DOCX (Max 10MB)
                </p>
              </div>

              {/* Study Info Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study ID <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={studyId}
                    onChange={(e) => setStudyId(e.target.value)}
                    placeholder="e.g., STUDY-001"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g., USA"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site
                  </label>
                  <input
                    type="text"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    placeholder="e.g., Site-101"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* TMF Structure - Cascading Dropdowns */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  TMF Classification <span className="text-red-600">*</span>
                </h3>

                {/* TMF Zone */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TMF Zone
                  </label>
                  <Select
                    options={zoneOptions}
                    value={selectedZone}
                    onChange={handleZoneChange}
                    placeholder="Select TMF Zone..."
                    isSearchable
                  />
                </div>

                {/* TMF Section */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TMF Section
                  </label>
                  <Select
                    options={sectionOptions}
                    value={selectedSection}
                    onChange={handleSectionChange}
                    placeholder="Select TMF Section..."
                    isSearchable
                    isDisabled={!selectedZone}
                  />
                </div>

                {/* TMF Artifact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TMF Artifact
                  </label>
                  <Select
                    options={artifactOptions}
                    value={selectedArtifact}
                    onChange={setSelectedArtifact}
                    placeholder="Select TMF Artifact..."
                    isSearchable
                    isDisabled={!selectedSection}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </span>
              ) : (
                "Upload Document"
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default UploadModal;
