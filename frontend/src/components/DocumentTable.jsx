// frontend/src/components/DocumentTable.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

function DocumentTable({ documents, currentUser }) {
  const navigate = useNavigate();

  const handleRowClick = (docId) => {
    navigate(`/documents/${docId}`);
  };

  if (!documents || documents.length === 0) {
    return <p className="text-gray-500">No documents found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-100">
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
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => handleRowClick(doc.id)}
              className="hover:bg-gray-50 cursor-pointer transition"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {doc.doc_number || "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                {doc.filename || "Unknown"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    doc.status === "Draft"
                      ? "bg-gray-100 text-gray-800"
                      : doc.status === "In QC"
                      ? "bg-purple-100 text-purple-800"
                      : doc.status === "QC Rejected"
                      ? "bg-red-100 text-red-800"
                      : doc.status === "QC Complete"
                      ? "bg-blue-100 text-blue-800"
                      : doc.status === "In Review"
                      ? "bg-indigo-100 text-indigo-800"
                      : doc.status === "Under Revision"
                      ? "bg-yellow-100 text-yellow-800"
                      : doc.status === "Rejected"
                      ? "bg-red-200 text-red-900"
                      : doc.status === "Review Complete"
                      ? "bg-green-100 text-green-800"
                      : doc.status === "Pending Approval"
                      ? "bg-orange-100 text-orange-800"
                      : doc.status === "Approved"
                      ? "bg-green-200 text-green-900"
                      : doc.status === "Superseded"
                      ? "bg-gray-300 text-gray-700"
                      : doc.status === "Archived"
                      ? "bg-gray-400 text-gray-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {doc.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {doc.author_username || "Unknown"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentTable;
