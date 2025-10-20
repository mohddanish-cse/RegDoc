// frontend/src/components/ActionToolbar.jsx - Complete replacement

import React from "react";

function ActionToolbar({
  document,
  user,
  onOpenSubmitQcModal,
  onOpenSubmitReviewModal,
  onOpenSubmitApprovalModal,
  onOpenQcModal,
  onOpenReviewModal,
  onOpenApprovalModal,
  onOpenAmendModal,
}) {
  if (!document || !user) return null;

  const {
    status,
    author_id,
    qc_reviewers = [],
    reviewers = [],
    approver = {},
  } = document;
  const { role, id: userId } = user;
  const isAuthor = author_id === userId;
  const isAdmin = role === "Admin";

  // Check if user is assigned to current stage
  const isQcReviewer = qc_reviewers.some(
    (r) => r.user_id === userId && r.status === "Pending"
  );
  const isTechReviewer = reviewers.some(
    (r) => r.user_id === userId && r.status === "Pending"
  );
  const isApprover =
    approver.user_id === userId && approver.status === "Pending";

  // Debug logging (remove after testing)
  console.log("ActionToolbar Debug:", {
    status,
    userId,
    isAdmin,
    isQcReviewer,
    qc_reviewers,
    role,
  });

  // Button visibility logic
  const showSubmitQc = status === "Draft" && (isAuthor || isAdmin);
  const showQcReview = status === "In QC" && (isQcReviewer || isAdmin);
  const showSubmitReview = status === "QC Complete" && (isAuthor || isAdmin);
  const showTechReview = status === "In Review" && (isTechReviewer || isAdmin);
  const showSubmitApproval =
    status === "Review Complete" && (isAuthor || isAdmin);
  const showFinalApproval =
    status === "Pending Approval" && (isApprover || isAdmin);
  const showAmend = status === "Approved";

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Actions</h3>
          <p className="text-sm text-gray-500">
            Take the next step in the document workflow.
          </p>
        </div>
        <div className="flex gap-3">
          {showSubmitQc && (
            <button
              onClick={onOpenSubmitQcModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition"
            >
              Submit for QC
            </button>
          )}

          {showQcReview && (
            <button
              onClick={onOpenQcModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 transition"
            >
              QC Review
            </button>
          )}

          {showSubmitReview && (
            <button
              onClick={onOpenSubmitReviewModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition"
            >
              Submit for Technical Review
            </button>
          )}

          {showTechReview && (
            <button
              onClick={onOpenReviewModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 transition"
            >
              Technical Review
            </button>
          )}

          {showSubmitApproval && (
            <button
              onClick={onOpenSubmitApprovalModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition"
            >
              Submit for Approval
            </button>
          )}

          {showFinalApproval && (
            <button
              onClick={onOpenApprovalModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition"
            >
              Final Approval
            </button>
          )}

          {showAmend && (
            <button
              onClick={onOpenAmendModal}
              className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 transition"
            >
              Create Amendment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionToolbar;
