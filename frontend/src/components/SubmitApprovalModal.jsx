// frontend/src/components/SubmitApprovalModal.jsx

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function SubmitApprovalModal({ isOpen, onClose, document, onSubmitSuccess }) {
  const [approvers, setApprovers] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchApprovers();
    }
  }, [isOpen]);

  const fetchApprovers = async () => {
    try {
      const data = await apiCall("/users/users-by-role/Approver");
      setApprovers(data);
    } catch (err) {
      toast.error("Failed to fetch approvers");
    }
  };

  const handleSubmit = async () => {
    if (!selectedApprover) {
      toast.error("Please select an approver");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting for approval...");

    try {
      await apiCall(`/documents/${document.id}/submit-approval`, "POST", {
        approver: selectedApprover,
      });

      toast.success("Document submitted for final approval!", { id: toastId });
      onSubmitSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedApprover("");
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            Submit for Final Approval: {document.filename}
          </Dialog.Title>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Approver *
            </label>
            <select
              value={selectedApprover}
              onChange={(e) => setSelectedApprover(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm"
              disabled={isSubmitting}
            >
              <option value="">-- Select Approver --</option>
              {approvers.map((approver) => (
                <option key={approver.id} value={approver.id}>
                  {approver.username}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Note:</strong> The approver will digitally sign and
              lock the document upon approval.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedApprover}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </button>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default SubmitApprovalModal;
