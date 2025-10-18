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
import ReviewModal from "../components/ReviewModal";
import ApprovalModal from "../components/ApprovalModal";
import SubmitModal from "../components/SubmitModal"; // We will still render this
import AmendModal from "../components/AmendModal";
import MetadataPanel from "../components/MetadataPanel";
// toast is no longer needed for openSubmitModal
// import toast from "react-hot-toast";

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

  // --- REMOVED: These state variables are no longer needed in this component ---
  // const [reviewers, setReviewers] = useState([]);
  // const [selectedReviewers, setSelectedReviewers] = useState([]);

  const fetchAllDocumentData = useCallback(async () => {
    // ... (This function remains the same)
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
    setIsReviewModalOpen(false);
    setIsApprovalModalOpen(false);
    setIsAmendModalOpen(false);
  };

  // --- SIMPLIFIED: This function now ONLY opens the modal ---
  // It no longer fetches any data. The modal will fetch its own data.
  // This is the core of the fix.
  const openSubmitModal = () => {
    setIsSubmitModalOpen(true);
  };

  const handleActionSuccess = () => {
    closeModal();
    fetchAllDocumentData();
  };

  const handleAmendSuccess = (newDocumentId) => {
    closeModal();
    navigate(`/documents/${newDocumentId}`);
  };

  // --- REMOVED: This logic is now handled inside the modal ---
  // const handleReviewerSelection = (reviewerId) => { ... };

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

        <ActionToolbar
          document={document}
          user={currentUser}
          onOpenSubmitModal={openSubmitModal}
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

      {/* This modal is now self-sufficient and receives only the props it needs */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={closeModal}
        document={document}
        onSubmitSuccess={handleActionSuccess}
      />

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
