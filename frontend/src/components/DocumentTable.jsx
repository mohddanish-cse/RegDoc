import React from "react";
import { Link } from "react-router-dom";

function DocumentTable({
  documents,
  currentUser,
  onOpenSubmitModal,
  onOpenReviewModal,
  onOpenApprovalModal,
}) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-800">Document Dashboard</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link
                        to={`documents/${doc.id}`}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {doc.filename}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.author}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {doc.status === "Draft" && isAuthor && (
                        <button
                          onClick={() => onOpenSubmitModal(doc)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Submit
                        </button>
                      )}
                      {doc.status === "In Review" && isReviewer && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onOpenReviewModal(doc)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onOpenReviewModal(doc)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {doc.status === "Approved" &&
                        currentUser.role === "Admin" && (
                          <button
                            onClick={() => onOpenApprovalModal(doc)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Final Approve
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DocumentTable;
