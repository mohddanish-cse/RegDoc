import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge"; // We'll use our status badge component

function DocumentTable({ documents, currentUser }) {
  // We have removed the onOpen...Modal props as they are no longer needed here
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
            {/* The "Actions" header is now gone */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <tr key={doc.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {doc.document_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link
                    to={`/documents/${doc.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
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
                {/* The "Actions" cell is now gone */}
              </tr>
            ))
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
  );
}

export default DocumentTable;
