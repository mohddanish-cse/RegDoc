// frontend/src/components/RecallModal.jsx

import React, { useState, useMemo } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

const RecallModal = ({ isOpen, onClose, document, onSuccess }) => {
  const [reason, setReason] = useState("");
  const [recalling, setRecalling] = useState(false);

  // ✅ Calculate the return status based on current status
  const returnInfo = useMemo(() => {
    if (!document) return { status: "Draft", stage: "draft" };

    switch (document.status) {
      case "In QC":
        return { status: "Draft", stage: "draft" };
      case "In Review":
        return {
          status: "QC Complete",
          stage: "the previous stage (QC Complete)",
        };
      case "Pending Approval":
        return {
          status: "Review Complete",
          stage: "the previous stage (Review Complete)",
        };
      default:
        return { status: "Draft", stage: "draft" };
    }
  }, [document]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Please provide a reason for recalling");
      return;
    }

    setRecalling(true);

    try {
      await apiCall(`/documents/${document.id}/recall`, "POST", { reason });

      toast.success("Document recalled successfully!");
      onSuccess();
      onClose();
      setReason("");
    } catch (error) {
      console.error("Error recalling document:", error);
      toast.error(error.message || "Failed to recall document");
    } finally {
      setRecalling(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold text-gray-900 mb-4">
            Recall Document
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-4">
            Are you sure you want to recall{" "}
            <span className="font-medium">{document.doc_number}</span> from the
            current workflow stage? This will return the document to{" "}
            <span className="font-medium">{returnInfo.stage}</span>.
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Recall <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain why you need to recall this document..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Warning:</strong> Recalling will remove assignments
                from the current stage and return the document to{" "}
                {returnInfo.stage}.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={recalling}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recalling || !reason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {recalling ? "Recalling..." : "Recall Document"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default RecallModal;
