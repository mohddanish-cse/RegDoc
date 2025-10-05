import React, { useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

function MetadataPanel({ document, versionHistory }) {
  const [isCopied, setIsCopied] = useState(false);

  if (!document) {
    return null; // Don't render anything if there's no document
  }

  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      // Reset the "Copied!" message after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
      <h2 className="text-2xl font-bold mb-4">{document.filename}</h2>
      {/* <div className="mb-4">
        <p className="text-sm font-medium text-gray-500">Document Number</p>
        <p className="text-lg font-semibold text-gray-800">
          {document.document_number}
        </p>
      </div> */}

      <div className="flex items-center gap-2 mb-4">
        <p className="text-lg font-mono text-gray-500">
          {document.document_number}
        </p>
        {isCopied ? (
          <span className="text-sm font-medium text-green-600 transition-opacity">
            Copied!
          </span>
        ) : (
          <button
            onClick={() => handleCopyToClipboard(document.document_number)}
            title="Copy document number"
            className="p-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          >
            {/* SVG icon for "copy" */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        )}
      </div>

      {document.signature && (
        <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 rounded-r-lg">
          <p className="font-bold text-green-800">Digitally Signed</p>
          <p className="text-sm text-green-700">
            by {document.signed_by_username} on{" "}
            {new Date(document.signed_at).toLocaleString()}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Status</p>
          <div className="text-lg font-semibold text-gray-800">
            <StatusBadge status={document.status} />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Author</p>
          <p className="text-gray-800">{document.author}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Version</p>
          <p className="text-gray-800">{document.version}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Upload Date</p>
          <p className="text-gray-800">
            {new Date(document.uploadDate).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Version History Section */}
      <h3 className="text-xl font-bold mt-8 mb-4 border-t pt-4">
        Version History
      </h3>
      <ul className="space-y-2">
        {versionHistory.map((version) => (
          <li key={version.id}>
            <Link
              to={`/documents/${version.id}`}
              className={`flex justify-between items-center p-2 rounded-md hover:bg-gray-100 ${
                version.id === document.id ? "bg-blue-50" : ""
              }`}
            >
              <div>
                <span className="font-semibold">v{version.version}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({new Date(version.uploadDate).toLocaleDateString()})
                </span>
              </div>
              <StatusBadge status={version.status} />
            </Link>
          </li>
        ))}
      </ul>

      {/* Audit Trail Section */}
      <h3 className="text-xl font-bold mt-8 mb-4 border-t pt-4">Audit Trail</h3>
      <ul className="space-y-4">
        {document.history &&
          document.history.map((entry, index) => (
            <li key={index} className="border-l-4 pl-4 border-gray-200">
              <p className="font-semibold">{entry.action}</p>
              <p className="text-sm text-gray-600">
                by {entry.user} on {new Date(entry.timestamp).toLocaleString()}
              </p>
              {entry.details && (
                <p className="text-sm text-gray-500 mt-1 italic">
                  "{entry.details}"
                </p>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}

export default MetadataPanel;
