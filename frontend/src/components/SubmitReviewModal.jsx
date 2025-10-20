// frontend/src/components/SubmitReviewModal.jsx

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import Select from "react-select";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function SubmitReviewModal({ isOpen, onClose, document, onSubmitSuccess }) {
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReviewers();
    }
  }, [isOpen]);

  const fetchReviewers = async () => {
    try {
      const data = await apiCall("/users/users-by-role/Reviewer");
      const options = data.map((user) => ({
        value: user.id,
        label: user.username,
      }));
      setReviewers(options);
    } catch (err) {
      toast.error("Failed to fetch reviewers");
    }
  };

  const handleSubmit = async () => {
    if (selectedReviewers.length === 0) {
      toast.error("Please select at least one reviewer");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting for technical review...");

    try {
      const reviewerIds = selectedReviewers.map((r) => r.value);
      await apiCall(`/documents/${document.id}/submit-review`, "POST", {
        reviewers: reviewerIds,
      });

      toast.success("Document submitted for technical review!", {
        id: toastId,
      });
      onSubmitSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReviewers([]);
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            Submit for Technical Review: {document.filename}
          </Dialog.Title>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Technical Reviewer(s) *
            </label>
            <Select
              isMulti
              options={reviewers}
              value={selectedReviewers}
              onChange={setSelectedReviewers}
              placeholder="Search and select reviewers..."
              isDisabled={isSubmitting}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedReviewers.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit for Review"}
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

export default SubmitReviewModal;
