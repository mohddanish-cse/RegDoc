// frontend/src/pages/DocumentView.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  useParams,
  Link,
  useOutletContext,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { apiCall } from "../utils/api";
import PdfViewer from "../components/PdfViewer";
import ActionToolbar from "../components/ActionToolbar";
import DocumentMenu from "../components/DocumentMenu";
import SubmitQcModal from "../components/SubmitQcModal";
import QcModal from "../components/QcModal";
import SubmitReviewModal from "../components/SubmitReviewModal";
import ReviewModal from "../components/ReviewModal";
import SubmitApprovalModal from "../components/SubmitApprovalModal";
import ApprovalModal from "../components/ApprovalModal";
import AmendModal from "../components/AmendModal";
import WithdrawModal from "../components/WithdrawModal";
import MarkObsoleteModal from "../components/MarkObsoleteModal";
import ArchiveModal from "../components/ArchiveModal";
import MetadataPanel from "../components/MetadataPanel";
import UploadRevisionModal from "../components/UploadRevisionModal";
import RecallModal from "../components/RecallModal";
import SkipQcModal from "../components/SkipQcModal";
import UploadCorrectedFileModal from "../components/UploadCorrectedFileModal";
import { API_BASE_URL } from "../utils/api";

function DocumentView() {
  const { documentId } = useParams();
  const { user: currentUser } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [document, setDocument] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [canAmend, setCanAmend] = useState(false);
  const [amendmentInfo, setAmendmentInfo] = useState(null);

  // Workflow Modals
  const [isSubmitQcModalOpen, setIsSubmitQcModalOpen] = useState(false);
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [isSubmitReviewModalOpen, setIsSubmitReviewModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmitApprovalModalOpen, setIsSubmitApprovalModalOpen] =
    useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [showUploadRevisionModal, setShowUploadRevisionModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [isSkipQcModalOpen, setIsSkipQcModalOpen] = useState(false);
  const [uploadCorrectedFileModalOpen, setUploadCorrectedFileModalOpen] =
    useState(false);

  // Lifecycle Modals (NEW)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isMarkObsoleteModalOpen, setIsMarkObsoleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const fetchAllDocumentData = useCallback(async () => {
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

  useEffect(() => {
    const checkAmendmentStatus = async () => {
      if (document?.status === "Approved") {
        try {
          const response = await apiCall(
            `/documents/${document.id}/can-amend`,
            "GET"
          );
          setCanAmend(response.can_amend);
          if (!response.can_amend) {
            setAmendmentInfo(response);
          }
        } catch (error) {
          console.error("Error checking amendment status:", error);
          setCanAmend(false);
        }
      } else {
        setCanAmend(false);
        setAmendmentInfo(null);
      }
    };

    if (document) {
      checkAmendmentStatus();
    }
  }, [document]);

  const closeModal = () => {
    setIsSubmitQcModalOpen(false);
    setIsQcModalOpen(false);
    setIsSubmitReviewModalOpen(false);
    setIsReviewModalOpen(false);
    setIsSubmitApprovalModalOpen(false);
    setIsApprovalModalOpen(false);
    setIsAmendModalOpen(false);
    setIsWithdrawModalOpen(false);
    setIsMarkObsoleteModalOpen(false);
    setIsArchiveModalOpen(false);
  };

  const handleActionSuccess = () => {
    closeModal();
    fetchAllDocumentData();
  };

  const handleAmendSuccess = (newDocumentId) => {
    closeModal();
    navigate(`/documents/${newDocumentId}`);
  };

  const getBackButton = () => {
    const fromLibrary =
      location.state?.from === "library" || document?.referrer === "library";
    return {
      path: fromLibrary ? "/library" : "/",
      text: fromLibrary ? "Library" : "My Tasks",
    };
  };

  const backButton = getBackButton();

  if (isLoading)
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <svg
            className="animate-spin h-6 w-6 text-primary-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-gray-600">Loading document...</span>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-4 text-sm text-error-700 bg-error-50 rounded-lg border border-error-200 flex items-center space-x-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );

  if (!document || !currentUser) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Bar - Document Title, Back Link & Document Menu */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            to={backButton.path}
            className="text-gray-600 hover:text-primary-600 transition-colors flex-shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {document.filename}
          </h1>
        </div>

        {/* Document Menu (⋮) */}
        <DocumentMenu
          document={document}
          user={currentUser}
          canAmend={canAmend}
          onWithdraw={() => setIsWithdrawModalOpen(true)}
          onMarkObsolete={() => setIsMarkObsoleteModalOpen(true)}
          onArchive={() => setIsArchiveModalOpen(true)}
          onAmend={() => setIsAmendModalOpen(true)}
        />
      </div>

      {/* Workflow Action Toolbar */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-3">
        <ActionToolbar
          document={{
            ...document,
            id: document.id,
            status: document.status,
            author_id: document.author_id,
            qc_reviewers: document.qc_reviewers || [],
            reviewers: document.reviewers || [],
            approver: document.approver || {},
          }}
          user={currentUser}
          canAmend={canAmend}
          amendmentInfo={amendmentInfo}
          onOpenSubmitQcModal={() => setIsSubmitQcModalOpen(true)}
          onOpenSubmitReviewModal={() => setIsSubmitReviewModalOpen(true)}
          onOpenSubmitApprovalModal={() => setIsSubmitApprovalModalOpen(true)}
          onOpenQcModal={() => setIsQcModalOpen(true)}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
          onOpenApprovalModal={() => setIsApprovalModalOpen(true)}
          onOpenAmendModal={() => setIsAmendModalOpen(true)}
          onOpenUploadRevisionModal={() => setShowUploadRevisionModal(true)}
          onOpenRecallModal={() => setShowRecallModal(true)}
          onOpenSkipQcModal={() => setIsSkipQcModalOpen(true)}
          onOpenUploadCorrectedFileModal={() =>
            setUploadCorrectedFileModalOpen(true)
          }
        />
      </div>

      {/* Main Content - Metadata + PDF */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Metadata Panel (Fixed 350px) */}
        <div className="w-[350px] flex-shrink-0 border-r border-gray-200 bg-white">
          <MetadataPanel document={document} versionHistory={versionHistory} />
        </div>

        {/* PDF Viewer - Takes all remaining space */}
        <div className="flex-1 bg-white">
          <PdfViewer
            fileUrl={`${API_BASE_URL}/documents/${document.id}/preview`}
            token={localStorage.getItem("token")}
          />
        </div>
      </div>

      {/* Workflow Modals */}
      <SubmitQcModal
        isOpen={isSubmitQcModalOpen}
        onClose={closeModal}
        document={document}
        onSubmitSuccess={handleActionSuccess}
      />
      <QcModal
        isOpen={isQcModalOpen}
        onClose={closeModal}
        document={document}
        onQcSuccess={handleActionSuccess}
      />
      <SubmitReviewModal
        isOpen={isSubmitReviewModalOpen}
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
      <SubmitApprovalModal
        isOpen={isSubmitApprovalModalOpen}
        onClose={closeModal}
        document={document}
        onSubmitSuccess={handleActionSuccess}
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
        onAmendSuccess={handleAmendSuccess}
      />

      <UploadRevisionModal
        isOpen={showUploadRevisionModal}
        onClose={() => setShowUploadRevisionModal(false)}
        document={document}
        documentNumber={document.doc_number}
        onSuccess={handleActionSuccess}
      />

      <RecallModal
        isOpen={showRecallModal}
        onClose={() => setShowRecallModal(false)}
        document={document}
        documentNumber={document.doc_number}
        onSuccess={handleActionSuccess}
      />

      <SkipQcModal
        isOpen={isSkipQcModalOpen}
        onClose={() => setIsSkipQcModalOpen(false)}
        document={document}
        onSubmitSuccess={handleActionSuccess}
      />

      <UploadCorrectedFileModal
        isOpen={uploadCorrectedFileModalOpen}
        onClose={() => setUploadCorrectedFileModalOpen(false)}
        document={document}
        onUploadSuccess={handleActionSuccess}
      />

      {/* Lifecycle Modals (NEW) */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={closeModal}
        document={document}
        onSuccess={handleActionSuccess}
      />

      <MarkObsoleteModal
        isOpen={isMarkObsoleteModalOpen}
        onClose={closeModal}
        document={document}
        onSuccess={handleActionSuccess}
      />

      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={closeModal}
        document={document}
        onSuccess={handleActionSuccess}
      />
    </div>
  );
}

export default DocumentView;
