import React, { useState, useEffect } from "react";
import {
  useParams,
  Link,
  useOutletContext,
  useNavigate,
} from "react-router-dom";
import { apiCall } from "../utils/api";

import ActionToolbar from "../components/ActionToolbar";
import ReviewModal from "../components/ReviewModal";
import ApprovalModal from "../components/ApprovalModal";
import SubmitModal from "../components/SubmitModal";
import AmendModal from "../components/AmendModal";
import StatusBadge from "../components/StatusBadge";

function DocumentView() {
  const { documentId } = useParams();
  const { user: currentUser } = useOutletContext();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  useEffect(() => {
    const fetchAllDocumentData = async () => {
      try {
        setIsLoading(true);
        // Step 1: Fetch the main document's details
        const docData = await apiCall(`/documents/${documentId}`);
        setDocument(docData);

        // Step 2: If the document has a lineage_id, fetch its full version history
        if (docData.lineage_id) {
          const historyData = await apiCall(
            `/documents/lineage/${docData.lineage_id}`
          );
          setVersionHistory(historyData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllDocumentData();
  }, [documentId]);

  const closeModal = () => {
    setIsSubmitModalOpen(false);
    setIsReviewModalOpen(false);
    setIsApprovalModalOpen(false);
    setIsAmendModalOpen(false);
  };

  const openSubmitModal = async () => {
    setIsSubmitModalOpen(true);
    try {
      const reviewerData = await apiCall("/user/reviewers");
      setReviewers(reviewerData);
    } catch (err) {
      alert(`Error fetching reviewers: ${err.message}`);
    }
  };

  const handleActionSuccess = () => {
    closeModal();
    fetchDocument();
  };

  // --- NEW: Special handler for a successful amendment ---
  const handleAmendSuccess = (newDocumentId) => {
    closeModal();
    // Navigate the user to the new version's page for a seamless experience
    navigate(`/documents/${newDocumentId}`);
  };

  const handleReviewerSelection = (reviewerId) => {
    setSelectedReviewers((prev) =>
      prev.includes(reviewerId)
        ? prev.filter((id) => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  const handleConfirmSubmit = async () => {
    if (!document) return;
    try {
      await apiCall(`/documents/${document.id}/submit`, "POST", {
        reviewers: selectedReviewers,
      });
      handleActionSuccess();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (isLoading)
    return <div className="text-center p-8">Loading document...</div>;
  if (error)
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (!document || !currentUser)
    return (
      <div className="text-center p-8">
        Document not found or user not loaded.
      </div>
    );

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Link to="/" className="text-blue-600 hover:underline">
            &larr; Back to My Tasks
          </Link>
        </div>

        <ActionToolbar
          document={document}
          user={currentUser}
          onOpenSubmitModal={openSubmitModal}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
          onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
          onOpenAmendModal={() => setIsAmendModalOpen(true)} // <-- Wire up the new function
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Metadata */}
          <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
            <h2 className="text-2xl font-bold mb-4">{document.filename}</h2>

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
            {/* --- NEW: Version History Section --- */}
            <h3 className="text-xl font-bold mt-8 mb-4 border-t pt-4">
              Version History
            </h3>
            <ul className="space-y-2">
              {versionHistory.map((version) => (
                <li key={version.id}>
                  <Link
                    to={`/documents/${version.id}`}
                    className={`flex justify-between items-center p-2 rounded-md hover:bg-gray-100 ${
                      version.id === documentId ? "bg-blue-50" : ""
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

            <h3 className="text-xl font-bold mt-8 mb-4 border-t pt-4">
              Audit Trail
            </h3>
            <ul className="space-y-4">
              {document.history &&
                document.history.map((entry, index) => (
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

          {/* Right Column: Document Preview */}
          <div className="md:col-span-2 bg-white rounded-lg shadow-md">
            <iframe
              src={`http://127.0.0.1:5000/api/documents/${documentId}/preview?jwt=${localStorage.getItem(
                "token"
              )}`}
              title={document.filename}
              className="w-full h-[85vh]"
            />
          </div>
        </div>
      </div>

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeModal}
        document={document}
        onReviewSuccess={handleActionSuccess}
      />
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={closeModal}
        document={document}
        onApprovalSuccess={handleActionSuccess}
      />
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={closeModal}
        document={document}
        reviewers={reviewers}
        selectedReviewers={selectedReviewers}
        onReviewerSelect={handleReviewerSelection}
        onSubmit={handleConfirmSubmit}
      />

      {/* --- NEW: Render the AmendModal --- */}
      <AmendModal
        isOpen={isAmendModalOpen}
        onClose={closeModal}
        document={document}
        onAmendSuccess={handleAmendSuccess}
      />
    </>
  );
}

export default DocumentView;
