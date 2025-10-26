// frontend/src/components/SubmitReviewModal.jsx

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import Select from "react-select";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function SubmitReviewModal({ isOpen, onClose, document, onSubmitSuccess }) {
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReviewers();
    }
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 5);
    setDueDate(defaultDate.toISOString().split("T")[0]);
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
        due_date: dueDate,
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
    if (!isSubmitting) {
      setSelectedReviewers([]);
      setDueDate("");
      onClose();
    }
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <Dialog.Title className="text-xl font-bold text-white">
                  Submit for Review
                </Dialog.Title>
                <p className="text-purple-100 text-sm mt-0.5">
                  {document.filename}
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

          {/* Content */}
          <div className="px-6 py-5">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Technical Reviewers{" "}
                <span className="text-error-600">*</span>
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

            <div className="mb-4">
              <label
                htmlFor="review-due-date"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Due Date <span className="text-error-600">*</span>
              </label>
              <input
                type="date"
                id="review-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={isSubmitting}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                required
              />
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                The document will be reviewed by technical reviewers for content
                accuracy.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedReviewers.length === 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
                  Submitting...
                </span>
              ) : (
                "Submit for Review"
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default SubmitReviewModal;
