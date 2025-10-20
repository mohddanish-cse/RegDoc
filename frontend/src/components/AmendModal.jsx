// frontend/src/components/AmendModal.jsx

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function AmendModal({ isOpen, onClose, document, onAmendSuccess }) {
  const [amendmentType, setAmendmentType] = useState("minor");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAmend = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for amendment");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating amendment...");

    try {
      const response = await apiCall(
        `/documents/${document.id}/amend`,
        "POST",
        {
          amendment_type: amendmentType,
          reason: reason,
        }
      );

      toast.success("Amendment created successfully!", { id: toastId });
      onAmendSuccess(response.new_document_id);
    } catch (err) {
      toast.error(`Amendment failed: ${err.message}`, { id: toastId });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmendmentType("minor");
    setReason("");
    onClose();
  };

  if (!isOpen || !document) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            Create Amendment
          </Dialog.Title>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Current Version: <strong>v{document.version}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amendment Type *
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setAmendmentType("minor")}
                  className={`w-full py-2 px-4 rounded-md font-semibold text-left transition ${
                    amendmentType === "minor"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  disabled={isSubmitting}
                >
                  <div>
                    <div className="font-bold">Minor Amendment</div>
                    <div className="text-sm opacity-90">
                      Small changes (v{document.major_version}.
                      {document.minor_version + 1})
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setAmendmentType("major")}
                  className={`w-full py-2 px-4 rounded-md font-semibold text-left transition ${
                    amendmentType === "major"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  disabled={isSubmitting}
                >
                  <div>
                    <div className="font-bold">Major Amendment</div>
                    <div className="text-sm opacity-90">
                      Significant changes (v{document.major_version + 1}.0)
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Amendment *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm"
                placeholder="Explain why this amendment is needed..."
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleAmend}
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold hover:bg-gray-900 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Amendment"}
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

export default AmendModal;
