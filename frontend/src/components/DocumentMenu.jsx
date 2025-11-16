// frontend/src/components/DocumentMenu.jsx
import React, { Fragment, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import { useNavigate } from "react-router-dom";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";
import DeleteConfirmModal from "./DeleteConfirmModal";

function DocumentMenu({
  document,
  user,
  canAmend,
  onWithdraw,
  onMarkObsolete,
  onArchive,
  onAmend,
  onDelete,
}) {
  const navigate = useNavigate();
  const [availableSystems, setAvailableSystems] = useState([]);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [showIntegrationSubmenu, setShowIntegrationSubmenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // ✅ NEW

  if (!document || !user) return null;

  const { status, author_id, id: docId } = document;
  const { id: userId, role } = user;

  const isAdmin = role === "Admin";
  const isAuthor = author_id === userId;

  const canWithdraw =
    [
      "In QC",
      "In Review",
      "Pending Approval",
      "QC Rejected",
      "Review Rejected",
      "Approval Rejected",
      "Under Revision",
    ].includes(status) &&
    (isAuthor || isAdmin);

  // ✅ NEW: Can delete only Draft and Withdrawn documents
  const canDelete =
    ["Draft", "Withdrawn"].includes(status) && (isAuthor || isAdmin);

  const canMarkObsolete =
    status === "Approved" && (isAdmin || role === "Quality Manager");

  const canArchive =
    ["Approved", "Superseded"].includes(status) &&
    (isAdmin || role === "Archivist");

  const showAmend = status === "Approved" && canAmend;
  const canSendToSystems = status === "Approved";

  const hasAnyAction =
    canWithdraw ||
    canMarkObsolete ||
    canArchive ||
    showAmend ||
    canSendToSystems ||
    canDelete; // ✅ NEW

  // Fetch available systems
  const fetchAvailableSystems = async () => {
    if (!canSendToSystems || loadingSystems) return;

    setLoadingSystems(true);
    try {
      const response = await apiCall(
        `/integrations/available-systems/${docId}`,
        "GET"
      );
      setAvailableSystems(response.available_systems || []);
    } catch (error) {
      console.error("Error fetching systems:", error);
      setAvailableSystems([]);
    } finally {
      setLoadingSystems(false);
    }
  };

  // Send document to system
  const handleSendToSystem = async (system) => {
    try {
      await apiCall("/integrations/push", "POST", {
        document_id: docId,
        target_system: system,
      });
      toast.success(`Document successfully sent to ${system}`);
    } catch (error) {
      console.error("Error sending document:", error);
      toast.error(error.message || "Failed to send document");
    }
  };

  const handleDelete = async () => {
    const toastId = toast.loading("Deleting document...");
    try {
      await apiCall(`/documents/${docId}`, "DELETE");
      toast.success("Document deleted successfully", { id: toastId });
      setShowDeleteModal(false);
      navigate("/library", { replace: true });

      if (onDelete) onDelete(); // Notify parent component
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(error.message || "Failed to delete document", {
        id: toastId,
      });
    }
  };

  if (!hasAnyAction) return null;

  return (
    <>
      <Menu as="div" className="relative">
        <Menu.Button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => {
            if (canSendToSystems && availableSystems.length === 0) {
              fetchAvailableSystems();
            }
          }}
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 focus:outline-none">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Document Actions
              </p>
            </div>

            {showAmend && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onAmend}
                    className={`w-full text-left px-4 py-3 text-sm flex items-start gap-3 ${
                      active ? "bg-gray-50" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5"
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
                    <div>
                      <p className="font-medium text-gray-900">
                        Create Amendment
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Make changes to approved document
                      </p>
                    </div>
                  </button>
                )}
              </Menu.Item>
            )}

            {canSendToSystems && (
              <Menu.Item>
                {({ active }) => (
                  <div
                    className={`w-full text-left px-4 py-3 text-sm ${
                      active ? "bg-blue-50" : ""
                    }`}
                    onMouseEnter={() => setShowIntegrationSubmenu(true)}
                    onMouseLeave={() => setShowIntegrationSubmenu(false)}
                  >
                    <div className="flex items-start gap-3 cursor-pointer">
                      <svg
                        className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Send to...</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Push to external systems
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 text-gray-400 mt-1"
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
                    </div>

                    {showIntegrationSubmenu && (
                      <div className="mt-2 ml-8 space-y-1">
                        {loadingSystems ? (
                          <p className="text-xs text-gray-500 py-2">
                            Loading systems...
                          </p>
                        ) : availableSystems.length > 0 ? (
                          availableSystems.map((system) => (
                            <button
                              key={system}
                              onClick={() => handleSendToSystem(system)}
                              className="w-full text-left px-3 py-2 text-xs rounded hover:bg-blue-100 text-gray-700 hover:text-blue-900 transition-colors"
                            >
                              {system}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 py-2">
                            No systems available
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Menu.Item>
            )}

            {(canWithdraw || canMarkObsolete || canArchive || canDelete) &&
              (showAmend || canSendToSystems) && (
                <div className="border-t border-gray-100 my-1" />
              )}

            {canWithdraw && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onWithdraw}
                    className={`w-full text-left px-4 py-3 text-sm flex items-start gap-3 ${
                      active ? "bg-red-50" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
                    <div>
                      <p className="font-medium text-red-900">
                        Withdraw Document
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Cancel and stop workflow
                      </p>
                    </div>
                  </button>
                )}
              </Menu.Item>
            )}

            {canMarkObsolete && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onMarkObsolete}
                    className={`w-full text-left px-4 py-3 text-sm flex items-start gap-3 ${
                      active ? "bg-yellow-50" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-yellow-900">
                        Mark as Obsolete
                      </p>
                      <p className="text-xs text-yellow-600 mt-0.5">
                        Content no longer valid
                      </p>
                    </div>
                  </button>
                )}
              </Menu.Item>
            )}

            {canArchive && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onArchive}
                    className={`w-full text-left px-4 py-3 text-sm flex items-start gap-3 ${
                      active ? "bg-gray-50" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5"
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
                    <div>
                      <p className="font-medium text-gray-900">
                        Archive Document
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Move to long-term storage
                      </p>
                    </div>
                  </button>
                )}
              </Menu.Item>
            )}

            {/* ✅ NEW: Delete Button */}
            {canDelete && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className={`w-full text-left px-4 py-3 text-sm flex items-start gap-3 ${
                      active ? "bg-error-50" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <div>
                      <p className="font-medium text-error-900">
                        Delete Document
                      </p>
                      <p className="text-xs text-error-600 mt-0.5">
                        Permanently remove from system
                      </p>
                    </div>
                  </button>
                )}
              </Menu.Item>
            )}
          </Menu.Items>
        </Transition>
      </Menu>

      {/* ✅ NEW: Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        document={document}
      />
    </>
  );
}

export default DocumentMenu;
