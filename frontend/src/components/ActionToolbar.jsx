import React from "react";

function ActionToolbar({
  document,
  user,
  onOpenSubmitModal,
  onOpenReviewModal,
  onOpenApprovalModal,
  onOpenAmendModal, // This is the new prop for the amend action
}) {
  const isAuthor = document.author_id === user.id;
  const isReviewer = document.reviewers?.includes(user.id);
  const isApprover = user.role === "Approver" || user.role === "Admin";

  // Define the conditions for showing each action
  const hasSubmitAction = document.status === "Draft" && isAuthor;
  const hasReviewAction = document.status === "In Review" && isReviewer;
  const hasApprovalAction = document.status === "Review Complete" && isApprover;
  const hasAmendAction = document.status === "Rejected" && isAuthor; // New condition for amend

  const hasAnyAction =
    hasSubmitAction || hasReviewAction || hasApprovalAction || hasAmendAction;

  // If there are no actions for the current user to take, render nothing.
  if (!hasAnyAction) {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Actions</h3>
          <p className="text-sm text-gray-500">
            Take the next step in the document workflow.
          </p>
        </div>
        <div className="flex space-x-3">
          {/* Submit for Review Button */}
          {hasSubmitAction && (
            <button
              onClick={() => onOpenSubmitModal(document)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Submit for Review
            </button>
          )}

          {/* Review Buttons */}
          {hasReviewAction && (
            <>
              <button
                onClick={() => onOpenReviewModal(document)}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900"
              >
                Accept Review
              </button>
              <button
                onClick={() => onOpenReviewModal(document)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Reject
              </button>
            </>
          )}

          {/* Final Approval Button */}
          {hasApprovalAction && (
            <button
              onClick={() => onOpenApprovalModal(document)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Publish Document
            </button>
          )}

          {/* NEW: Amend Document Button */}
          {hasAmendAction && (
            <button
              onClick={() => onOpenAmendModal(document)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Amend Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionToolbar;
