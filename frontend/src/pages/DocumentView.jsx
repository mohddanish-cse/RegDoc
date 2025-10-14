// frontend/src/pages/DocumentView.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  useParams,
  Link,
  useOutletContext,
  useNavigate,
} from "react-router-dom";
import { apiCall } from "../utils/api";
import PdfViewer from "../components/PdfViewer";
import ActionToolbar from "../components/ActionToolbar";
import MetadataPanel from "../components/MetadataPanel";

// Import ALL modals that this page controls
import SubmitModal from "../components/SubmitModal";
import QcModal from "../components/QcModal"; // <-- We need this
import ReviewModal from "../components/ReviewModal";
import ApprovalModal from "../components/ApprovalModal";
import AmendModal from "../components/AmendModal";

function DocumentView() {
  const { documentId } = useParams();
  const { user: currentUser } = useOutletContext();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- State management for ALL modals on this page ---
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isQcModalOpen, setIsQcModalOpen] = useState(false); // <-- FIX: Add state for the QC Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);

  const fetchAllDocumentData = useCallback(async () => {
    // ... (This function remains unchanged)
    try {
      setIsLoading(true);
      const docData = await apiCall(`/documents/${documentId}`);
      setDocument(docData);
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
  }, [documentId]);

  useEffect(() => {
    fetchAllDocumentData();
  }, [fetchAllDocumentData]);

  const closeModal = () => {
    setIsSubmitModalOpen(false);
    setIsQcModalOpen(false); // <-- FIX: Ensure the QC modal can be closed
    setIsReviewModalOpen(false);
    setIsApprovalModalOpen(false);
    setIsAmendModalOpen(false);
  };

  const handleActionSuccess = () => {
    closeModal();
    fetchAllDocumentData(); // Universal success handler
  };

  const handleAmendSuccess = (newDocumentId) => {
    closeModal();
    navigate(`/documents/${newDocumentId}`);
  };

  if (isLoading)
    return <div className="text-center p-8">Loading document...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
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

        {/* --- FIX: Pass the onOpenQcModal prop (the "wire") to the ActionToolbar --- */}
        <ActionToolbar
          document={document}
          user={currentUser}
          onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
          onOpenQcModal={() => setIsQcModalOpen(true)} // <-- THE FIX IS HERE
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
          onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
          onOpenAmendModal={() => setIsAmendModalOpen(true)}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetadataPanel document={document} versionHistory={versionHistory} />
          <div className="md:col-span-2 bg-white rounded-lg shadow-md flex flex-col h-[90vh] overflow-hidden">
            <PdfViewer
              fileUrl={`http://127.0.0.1:5000/api/documents/${document.id}/preview`}
              token={localStorage.getItem("token")}
            />
          </div>
        </div>
      </div>

      {/* --- FIX: Render the QcModal and connect it to its state --- */}
      <QcModal
        isOpen={isQcModalOpen}
        onClose={closeModal}
        document={document}
        onActionSuccess={handleActionSuccess}
      />

      {/* Other modals remain correctly configured */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={closeModal}
        document={document}
        onSubmitSuccess={handleActionSuccess}
      />
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
      <AmendModal
        isOpen={isAmendModalOpen}
        onClose={closeModal}
        document={document}
        onActionSuccess={handleActionSuccess}
        onAmendSuccess={handleAmendSuccess} // For navigation
      />
    </>
  );
}

export default DocumentView;
