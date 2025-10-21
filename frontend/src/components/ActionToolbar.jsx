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

  // status-driven button visibility rules
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Actions</h3>
          <p className="text-sm text-gray-500">
            Take the next step in the document workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          {showSubmitQc && (
            <button
              onClick={onOpenSubmitQcModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
            >
              Submit for QC
            </button>
          )}

          {showQcReview && (
            <button
              onClick={onOpenQcModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700"
            >
              QC Review
            </button>
          )}

          {showSubmitReview && (
            <button
              onClick={onOpenSubmitReviewModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
            >
              Submit for Review
            </button>
          )}

          {showTechReview && (
            <button
              onClick={onOpenReviewModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700"
            >
              Technical Review
            </button>
          )}

          {showSubmitApproval && (
            <button
              onClick={onOpenSubmitApprovalModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
            >
              Submit for Approval
            </button>
          )}

          {showFinalApproval && (
            <button
              onClick={onOpenApprovalModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700"
            >
              Final Approval
            </button>
          )}

          {showAmend && (
            <button
              onClick={onOpenAmendModal}
              className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700"
            >
              Create Amendment
            </button>
          )}

          {showArchive && (
            <button
              onClick={onArchiveDocument}
              className="px-4 py-2 bg-yellow-700 text-white rounded-md font-semibold hover:bg-yellow-800"
            >
              Archive Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionToolbar;
