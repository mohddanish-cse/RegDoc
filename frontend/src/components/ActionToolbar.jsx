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
  onArchiveDocument,
}) {
  if (!document || !user) return null;

  const {
    status,
    author_id,
    qc_reviewers = [],
    reviewers = [],
    approver = {},
  } = document;
  const { id: userId, role } = user;

  const isAuthor = author_id === userId;
  const isAdmin = role === "Admin";
  const isArchivist = role === "Archivist";

  const isQcReviewer = qc_reviewers.some(
    (r) => r.user_id === userId && r.status === "Pending"
  );
  const isTechReviewer = reviewers.some(
    (r) => r.user_id === userId && r.status === "Pending"
  );
  const isApprover =
    approver.user_id === userId && approver.status === "Pending";

  // Status-driven button visibility rules
  const showSubmitQc = status === "Draft" && (isAuthor || isAdmin);
  const showQcReview =
    ["In QC", "QC Rejected"].includes(status) && (isQcReviewer || isAdmin);
  const showSubmitReview = status === "QC Complete" && (isAuthor || isAdmin);
  const showTechReview =
    ["In Review", "Under Revision"].includes(status) &&
    (isTechReviewer || isAdmin);
  const showSubmitApproval =
    status === "Review Complete" && (isAuthor || isAdmin);
  const showFinalApproval =
    status === "Pending Approval" && (isApprover || isAdmin);
  const showAmend = status === "Approved";
  const showArchive =
    ["Approved", "Superseded"].includes(status) && (isArchivist || isAdmin);

  const hasAnyAction =
    showSubmitQc ||
    showQcReview ||
    showSubmitReview ||
    showTechReview ||
    showSubmitApproval ||
    showFinalApproval ||
    showAmend ||
    showArchive;

  if (!hasAnyAction) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-accent-50 rounded-lg">
            <svg
              className="w-6 h-6 text-accent-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Workflow Actions
            </h3>
            <p className="text-sm text-gray-500">
              Available actions for this document
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          {showSubmitQc && (
            <button
              onClick={onOpenSubmitQcModal}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Submit for QC
            </button>
          )}

          {showQcReview && (
            <button
              onClick={onOpenQcModal}
              className="inline-flex items-center px-4 py-2 bg-clinical-600 text-white text-sm font-semibold rounded-lg hover:bg-clinical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              QC Review
            </button>
          )}

          {showSubmitReview && (
            <button
              onClick={onOpenSubmitReviewModal}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Submit for Review
            </button>
          )}

          {showTechReview && (
            <button
              onClick={onOpenReviewModal}
              className="inline-flex items-center px-4 py-2 bg-accent-600 text-white text-sm font-semibold rounded-lg hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Technical Review
            </button>
          )}

          {showSubmitApproval && (
            <button
              onClick={onOpenSubmitApprovalModal}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Submit for Approval
            </button>
          )}

          {showFinalApproval && (
            <button
              onClick={onOpenApprovalModal}
              className="inline-flex items-center px-4 py-2 bg-success-600 text-white text-sm font-semibold rounded-lg hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Final Approval
            </button>
          )}

          {showAmend && (
            <button
              onClick={onOpenAmendModal}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Create Amendment
            </button>
          )}

          {showArchive && (
            <button
              onClick={onArchiveDocument}
              className="inline-flex items-center px-4 py-2 bg-warning-600 text-white text-sm font-semibold rounded-lg hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-warning-500 transition-all duration-200"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              Archive Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionToolbar;
