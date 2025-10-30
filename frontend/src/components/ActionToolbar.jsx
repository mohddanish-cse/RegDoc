// frontend/src/components/ActionToolbar.jsx
import React from "react";
import DueDateBadge from "./DueDateBadge";
import { getDueDateFromDocument } from "../utils/dateUtils";

function ActionToolbar({
  document,
  user,
  canAmend, // ✅ NEW prop
  amendmentInfo, // ✅ NEW prop
  onOpenSubmitQcModal,
  onOpenSubmitReviewModal,
  onOpenSubmitApprovalModal,
  onOpenQcModal,
  onOpenReviewModal,
  onOpenApprovalModal,
  onOpenAmendModal,
  onArchiveDocument,
  onOpenUploadRevisionModal,
  onOpenRecallModal,
  onOpenSkipQcModal,
  onOpenUploadCorrectedFileModal,
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

  const showSubmitQc = status === "Draft" && (isAuthor || isAdmin);
  const showSkipQc = status === "Draft" && (isAuthor || isAdmin);
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

  // ✅ UPDATED: Use canAmend prop instead of just checking status
  const showAmend = status === "Approved" && canAmend;

  const showArchive =
    ["Approved", "Superseded"].includes(status) && (isArchivist || isAdmin);

  const showUploadRevision =
    ["QC Rejected", "Review Rejected", "Approval Rejected"].includes(status) &&
    (isAuthor || isAdmin);

  const showRecall =
    ["In QC", "In Review", "Pending Approval"].includes(status) &&
    (isAuthor || isAdmin);

  const showUploadCorrectedFile =
    status === "Under Revision" && (isAuthor || isAdmin);

  const hasAnyAction =
    showSubmitQc ||
    showQcReview ||
    showSubmitReview ||
    showTechReview ||
    showSubmitApproval ||
    showFinalApproval ||
    showAmend ||
    showArchive ||
    showUploadRevision ||
    showUploadCorrectedFile ||
    showRecall ||
    (status === "Approved" && !canAmend); // ✅ Show toolbar even if amendment blocked

  // Get due date for display
  const dueDate = getDueDateFromDocument(document);

  if (!hasAnyAction) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
      {/* ✅ NEW: Amendment Blocked Info Banner */}
      {status === "Approved" && !canAmend && amendmentInfo && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              Amendment in Progress
            </p>
            <p className="text-sm text-blue-700 mt-1">{amendmentInfo.reason}</p>
            {amendmentInfo.existing_amendment && (
              <a
                href={`/documents/${amendmentInfo.existing_amendment.id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2 inline-flex items-center gap-1 transition-colors"
              >
                View {amendmentInfo.existing_amendment.version} in progress
                <svg
                  className="w-4 h-4"
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
              </a>
            )}
          </div>
        </div>
      )}

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
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900">
              Workflow Actions
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                Available actions for this document
              </p>
              {dueDate && (
                <>
                  <span className="text-gray-300">•</span>
                  <DueDateBadge dueDate={dueDate} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Upload Corrected File for "Under Revision" */}
        {showUploadCorrectedFile && (
          <button
            onClick={onOpenUploadCorrectedFileModal}
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload Corrected File
          </button>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          {/* ✅ Upload Revised File button */}
          {showUploadRevision && (
            <button
              onClick={onOpenUploadRevisionModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload Revised File
            </button>
          )}

          {/* ✅ Recall button */}
          {showRecall && (
            <button
              onClick={onOpenRecallModal}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
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
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Recall Document
            </button>
          )}

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

          {showSkipQc && (
            <button
              onClick={onOpenSkipQcModal}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Skip QC & Submit for Review
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

          {/* ✅ Amend button - only shown if allowed */}
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
