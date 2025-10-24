// frontend/src/components/UploadTMFModal.jsx

import React, { useState } from "react";
import { apiCall } from "../../utils/api";

const tmfFields = [
  { key: "study_id", label: "Study ID" },
  { key: "country", label: "Country" },
  { key: "site_id", label: "Site ID" },
  { key: "tmf_zone", label: "Zone" },
  { key: "tmf_section", label: "Section" },
  { key: "tmf_artifact", label: "Artifact" },
];

function UploadTMFModal({ isOpen, onClose, onUploadSuccess }) {
  const [formVals, setFormVals] = useState({
    file: null,
    comment: "",
    ...Object.fromEntries(tmfFields.map((f) => [f.key, ""])),
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormVals((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleSubmit = async () => {
    if (!formVals.file) return alert("Select a document (PDF).");
    // Require all TMF fields
    for (const f of tmfFields) {
      if (!formVals[f.key]) return alert(`Please enter ${f.label}.`);
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", formVals.file);
      fd.append("comment", formVals.comment);
      tmfFields.forEach((f) => fd.append(f.key, formVals[f.key]));
      await apiCall("/documents/upload", "POST", fd, true);
      onUploadSuccess();
    } catch (e) {
      alert(e.message || "Upload failed");
    } finally {
      setIsUploading(false);
      onClose();
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="font-sans font-bold text-lg mb-4">
          Upload TMF Document
        </h2>
        <form className="flex flex-col gap-3">
          <input
            type="file"
            name="file"
            accept="application/pdf"
            onChange={handleChange}
            className="border rounded-md p-2"
            required
          />
          {tmfFields.map((f) => (
            <div key={f.key} className="flex flex-col">
              <label className="text-sm text-gray-700 font-semibold mb-1">
                {f.label}
              </label>
              <input
                type="text"
                name={f.key}
                value={formVals[f.key]}
                onChange={handleChange}
                className="border border-border rounded-md px-2 py-1 text-sm bg-gray-50"
                required
              />
            </div>
          ))}
          <label className="text-sm text-gray-700 font-semibold mb-1">
            Comment
          </label>
          <textarea
            name="comment"
            value={formVals.comment}
            onChange={handleChange}
            className="border border-border rounded-md px-2 py-1 text-sm bg-gray-50"
          />
        </form>
        <div className="flex gap-4 mt-4">
          <button
            className="px-4 py-2 bg-primary text-white rounded-md"
            onClick={handleSubmit}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
          <button
            className="px-4 py-2 bg-muted text-neutral rounded-md"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadTMFModal;
