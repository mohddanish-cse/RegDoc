import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import ReviewModal from "./ReviewModal";
import DocumentTable from "./DocumentTable";
import ApprovalModal from "./ApprovalModal"; // <-- Import the new modal

function Dashboard({ currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  // State for Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  // State for Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // State for Approval Modal
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      const data = await apiCall("/documents/");
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // --- Submit Modal Functions ---
  const openSubmitModal = async (doc) => {
    setSelectedDoc(doc);
    setIsSubmitModalOpen(true);
    try {
      const reviewerData = await apiCall("/user/reviewers");
      setReviewers(reviewerData);
    } catch (err) {
      alert(`Error fetching reviewers: ${err.message}`);
    }
  };
  const closeSubmitModal = () => setIsSubmitModalOpen(false);
  const handleReviewerSelection = (reviewerId) => {
    setSelectedReviewers((prev) =>
      prev.includes(reviewerId)
        ? prev.filter((id) => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };
  const handleConfirmSubmit = async () => {
    if (!selectedDoc) return;
    try {
      await apiCall(`/documents/${selectedDoc.id}/submit`, "POST", {
        reviewers: selectedReviewers,
      });
      closeSubmitModal();
      fetchDocuments();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // --- Review Modal Functions ---
  const openReviewModal = (doc) => {
    setSelectedDoc(doc);
    setIsReviewModalOpen(true);
  };
  const closeReviewModal = () => setIsReviewModalOpen(false);
  const handleReviewSuccess = () => {
    closeReviewModal();
    fetchDocuments();
  };

  // --- Approval Modal Functions ---
  const openApprovalModal = (doc) => {
    setSelectedDoc(doc);
    setIsApprovalModalOpen(true);
  };
  const closeApprovalModal = () => setIsApprovalModalOpen(false);
  const handleApprovalSuccess = () => {
    closeApprovalModal();
    fetchDocuments();
  };

  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!currentUser) return <p>Loading user...</p>;

  return (
    <>
      <DocumentTable
        documents={documents}
        currentUser={currentUser}
        onOpenSubmitModal={openSubmitModal}
        onOpenReviewModal={openReviewModal}
        onOpenApprovalModal={openApprovalModal} // <-- Pass the new function
      />

      {/* Submit Modal */}
      <Dialog
        open={isSubmitModalOpen}
        onClose={closeSubmitModal}
        className="relative z-50"
      >
        {/* ... (JSX is unchanged) ... */}
      </Dialog>

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeReviewModal}
        document={selectedDoc}
        onReviewSuccess={handleReviewSuccess}
      />

      {/* --- NEW: Approval Modal --- */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={closeApprovalModal}
        document={selectedDoc}
        onApprovalSuccess={handleApprovalSuccess}
      />
    </>
  );
}

export default Dashboard;
