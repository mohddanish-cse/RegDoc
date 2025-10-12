// frontend/src/components/SubmitModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";
import RoleAssigner from "./RoleAssigner"; // <-- Import our new modular component

function SubmitModal({ isOpen, onClose, document, onSubmitSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to hold the user IDs selected for each part of the workflow
  const [selectedQcUsers, setSelectedQcUsers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState([]); // Will only hold one ID

  const handleSubmit = async () => {
    // Validation
    if (
      selectedQcUsers.length === 0 ||
      selectedReviewers.length === 0 ||
      selectedApprover.length === 0
    ) {
      toast.error(
        "You must assign at least one user for QC, Review, and Approval."
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting workflow...");

    // This simple payload is what our new backend endpoint expects
    const payload = {
      qc_users: selectedQcUsers,
      reviewers: selectedReviewers,
      approver: selectedApprover[0], // Get the single ID from the array
    };

    try {
      await apiCall(`/documents/${document.id}/submit`, "POST", payload);
      toast.success("Document submitted for Quality Control!", { id: toastId });
      onSubmitSuccess(); // This will close the modal and refresh the parent page's data
      handleClose();
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset all state when closing
    setSelectedQcUsers([]);
    setSelectedReviewers([]);
    setSelectedApprover([]);
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && handleClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900">
            Submit for Review:{" "}
            <span className="text-primary">{document.filename}</span>
          </Dialog.Title>
          <p className="text-sm text-gray-600 mt-1">
            This will initiate the "Simple TMF Workflow".
          </p>

          <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* We use our new component three times, once for each role */}
            <RoleAssigner
              roleName="QC"
              selectedUsers={selectedQcUsers}
              onSelectionChange={setSelectedQcUsers}
            />
            <RoleAssigner
              roleName="Reviewer"
              selectedUsers={selectedReviewers}
              onSelectionChange={setSelectedReviewers}
            />
            <RoleAssigner
              roleName="Approver"
              selectedUsers={selectedApprover}
              onSelectionChange={setSelectedApprover}
              isSingleSelect={true} // Approver is a single-select radio button
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Confirm and Submit"}
            </button>
            <button
              onClick={handleClose}
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

export default SubmitModal;
