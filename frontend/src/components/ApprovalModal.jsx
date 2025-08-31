import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";

function ApprovalModal({ isOpen, onClose, document, onApprovalSuccess }) {
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setComments("");
      setError("");
    }
  }, [isOpen]);

  const handleApproval = async (decision) => {
    setError("");
    try {
      await apiCall(`/documents/${document.id}/approve`, "POST", {
        decision, // 'Finally Approved' or 'Finally Rejected'
        comments,
      });
      onApprovalSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen || !document) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded bg-white p-6">
          <Dialog.Title className="text-lg font-bold">
            Final Approval
          </Dialog.Title>
          <p className="mt-2 text-sm text-gray-600">
            You are giving final approval for:{" "}
            <strong>{document?.filename}</strong>
          </p>

          {error && (
            <p className="mt-2 p-2 text-sm text-center text-red-700 bg-red-100 rounded-lg">
              {error}
            </p>
          )}

          <div className="mt-4">
            <label
              htmlFor="approval-comments"
              className="block text-sm font-medium text-gray-700"
            >
              Comments (Optional)
            </label>
            <textarea
              id="approval-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleApproval("Finally Approved")}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Finally Approve
            </button>
            <button
              onClick={() => handleApproval("Finally Rejected")}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Finally Reject
            </button>
            <button
              onClick={onClose}
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

export default ApprovalModal;
