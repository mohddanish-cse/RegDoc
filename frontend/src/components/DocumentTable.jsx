// frontend/src/components/DocumentTable.jsx

import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import DueDateBadge from "./DueDateBadge";
import { getDueDateFromDocument } from "../utils/dateUtils";

function DocumentTable({ documents, currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if we're on the tasks page
  const isTasksPage =
    location.pathname === "/" || location.pathname.includes("/tasks");

  const handleRowClick = (docId) => {
    const fromPage = location.pathname.includes("/library")
      ? "library"
      : "tasks";

    navigate(`/documents/${docId}`, {
      state: { from: fromPage },
    });
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-center">No documents found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Doc Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Filename
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            {/* Conditionally render Due Date header - Only in Tasks */}
            {isTasksPage && (
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Due Date
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Author
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {documents.map((doc) => {
            const dueDate = getDueDateFromDocument(doc);

            return (
              <tr
                key={doc.id}
                onClick={() => handleRowClick(doc.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-sm font-mono text-gray-700">
                    {doc.doc_number || "N/A"}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    {doc.filename || "Unknown"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={doc.status} />
                </td>
                {/* Conditionally render Due Date cell - Only in Tasks */}
                {isTasksPage && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <DueDateBadge dueDate={dueDate} />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary-100 rounded-full">
                      <span className="text-xs font-semibold text-primary-700">
                        {doc.author_username?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {doc.author_username || "Unknown"}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentTable;
