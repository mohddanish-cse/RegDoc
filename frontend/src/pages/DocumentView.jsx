import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiCall } from "../utils/api";

function DocumentView() {
  const { documentId } = useParams();
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Get the token from localStorage to build the preview URL
  const token = localStorage.getItem("token");
  const pdfPreviewUrl = `http://127.0.0.1:5000/api/documents/${documentId}/preview?jwt=${token}`;

  useEffect(() => {
    const fetchDocumentMetadata = async () => {
      try {
        setIsLoading(true);
        const data = await apiCall(`/documents/${documentId}`);
        setDocument(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentMetadata();
  }, [documentId]);

  if (isLoading)
    return <div className="text-center p-8">Loading document...</div>;
  if (error)
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (!document)
    return <div className="text-center p-8">Document not found.</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <Link to="/" className="text-indigo-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Metadata */}
        <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-2xl font-bold mb-4">{document.filename}</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-lg font-semibold text-gray-800">
                {document.status}
              </p>
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
          <h3 className="text-xl font-bold mt-8 mb-4 border-t pt-4">
            Audit Trail
          </h3>
          <ul className="space-y-4">
            {document.history.map((entry, index) => (
              <li key={index} className="border-l-4 pl-4 border-gray-200">
                <p className="font-semibold">{entry.action}</p>
                <p className="text-sm text-gray-600">
                  by {entry.user} on{" "}
                  {new Date(entry.timestamp).toLocaleString()}
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

        {/* Right Column: Document Preview using iframe */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-md">
          <iframe
            src={pdfPreviewUrl}
            title={document.filename}
            className="w-full h-[85vh]"
          />
        </div>
      </div>
    </div>
  );
}

export default DocumentView;
