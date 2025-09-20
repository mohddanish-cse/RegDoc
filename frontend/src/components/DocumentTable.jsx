import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

function DocumentTable({
  documents,
  currentUser,
  onOpenSubmitModal,
  onOpenReviewModal,
  onOpenApprovalModal,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Doc Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Filename
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Author
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.length > 0 ? (
            documents.map((doc) => {
              const isAuthor = doc.author_id === currentUser.id;
              const isReviewer = doc.reviewers?.includes(currentUser.id);

              return (
                <tr key={doc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.document_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="text-primary hover:text-indigo-800 hover:underline"
                    >
                      {doc.filename}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {doc.status === "Draft" && isAuthor && (
                      <button
                        onClick={() => onOpenSubmitModal(doc)}
                        className="text-primary hover:text-indigo-900"
                      >
                        Submit for Review
                      </button>
                    )}
                    {doc.status === "In Review" && isReviewer && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onOpenReviewModal(doc)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onOpenReviewModal(doc)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {doc.status === "Review Complete" &&
                      currentUser.role === "Admin" && (
                        <button
                          onClick={() => onOpenApprovalModal(doc)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Publish
                        </button>
                      )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan="5"
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                No documents found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentTable;
