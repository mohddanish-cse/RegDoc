// frontend/src/components/ActionToolbar.jsx

import React from "react";

function ActionToolbar({
  document,
  user,
  onOpenSubmitModal,
  onOpenQcModal,
  onOpenReviewModal,
  onOpenApprovalModal,
  onOpenAmendModal,
}) {
  if (!document || !user) return null;
  const { status } = document;
  const { role } = user;
  const isAuthor = user.id === document.author_id;

  const getAction = () => {
    if (isAuthor && status === "Draft") {
      return (
        <button
          onClick={onOpenSubmitModal}
          className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Submit for Review
        </button>
      );
    }
    if (
      isAuthor &&
      ["Rejected", "Changes Requested", "Approved"].includes(status)
    ) {
      return (
        <button
          onClick={onOpenAmendModal}
          className="w-full sm:w-auto bg-yellow-500 text-black font-semibold px-4 py-2 rounded-md hover:bg-yellow-600"
        >
          Amend and Resubmit
        </button>
      );
    }
    if ((role === "QC" || role === "Admin") && status === "In QC") {
      return (
        <button
          onClick={onOpenQcModal}
          className="w-full sm:w-auto bg-indigo-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Perform QC Check
        </button>
      );
    }
    if ((role === "Reviewer" || role === "Admin") && status === "In Review") {
      return (
        <button
          onClick={onOpenReviewModal}
          className="w-full sm:w-auto bg-purple-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-purple-700"
        >
          Perform Review
        </button>
      );
    }
    if (
      (role === "Approver" || role === "Admin") &&
      status === "Review Complete"
    ) {
      return (
        <button
          onClick={onOpenApprovalModal}
          className="w-full sm:w-auto bg-green-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-700"
        >
          Perform Final Approval
        </button>
      );
    }
    return (
      <p className="text-sm text-gray-500">
        No actions available for you at this time.
      </p>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-center">
      <div>
        <h3 className="text-lg font-bold text-gray-800">Actions</h3>
        <p className="text-sm text-gray-600">
          Take the next step in the document workflow.
        </p>
      </div>
      <div className="mt-4 sm:mt-0">{getAction()}</div>
    </div>
  );
}

export default ActionToolbar;
