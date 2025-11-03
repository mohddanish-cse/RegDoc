// frontend/src/components/DocumentMenu.jsx
import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";

function DocumentMenu({
  document,
  user,
  canAmend,
  onWithdraw,
  onMarkObsolete,
  onArchive,
  onAmend,
}) {
  if (!document || !user) return null;

  const { status, author_id } = document;
  const { id: userId, role } = user;

  const isAdmin = role === "Admin";
  const isAuthor = author_id === userId;

  // Permission checks
  const canWithdraw =
    [
      "Draft",
      "In QC",
      "In Review",
      "Pending Approval",
      "QC Rejected",
      "Review Rejected",
      "Approval Rejected",
      "Under Revision",
    ].includes(status) &&
    (isAuthor || isAdmin);

  const canMarkObsolete =
    status === "Approved" && (isAdmin || role === "Quality Manager");

  const canArchive =
    ["Approved", "Superseded"].includes(status) &&
    (isAdmin || role === "Archivist");

  const showAmend = status === "Approved" && canAmend;

  const hasAnyAction =
    canWithdraw || canMarkObsolete || canArchive || showAmend;

  if (!hasAnyAction) return null;

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Document Actions
            </p>
          </div>

          {/* Neutral Actions */}
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

          {/* Divider if there are destructive actions */}
          {(canWithdraw || canMarkObsolete || canArchive) && showAmend && (
            <div className="border-t border-gray-100 my-1" />
          )}

          {/* Destructive Actions */}
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
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export default DocumentMenu;
