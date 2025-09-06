import React, { useState, useEffect, useCallback } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";
import ReviewModal from "./ReviewModal";
import DocumentTable from "./DocumentTable";
import ApprovalModal from "./ApprovalModal";
import UploadModal from "./UploadModal";
import { useOutletContext } from "react-router-dom";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { user: currentUser } = useOutletContext();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // State for Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // <-- New state for upload modal

  // State for Submit Modal Data
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);

  // const fetchDocuments = async () => {
  //   try {
  //     const data = await apiCall("/documents/");
  //     setDocuments(data);
  //   } catch (err) {
  //     setError(err.message);
  //   }
  // };

  // useEffect(() => {
  //   fetchDocuments();
  // }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      // Pass page and search params to the API call
      const data = await apiCall(
        `/documents/?page=${currentPage}&limit=10&search=${searchQuery}`
      );
      setDocuments(data.documents);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // --- Modal Control Functions ---
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

  const openReviewModal = (doc) => {
    setSelectedDoc(doc);
    setIsReviewModalOpen(true);
  };

  const openApprovalModal = (doc) => {
    setSelectedDoc(doc);
    setIsApprovalModalOpen(true);
  };

  const closeModal = () => {
    setIsSubmitModalOpen(false);
    setIsReviewModalOpen(false);
    setIsApprovalModalOpen(false);
    setIsUploadModalOpen(false);
    setSelectedDoc(null);
  };

  // --- Action Handlers ---
  const handleActionSuccess = () => {
    closeModal();
    fetchDocuments(); // Refresh data after any successful action
  };

  const handleUploadSuccess = () => {
    // <-- New handler for successful upload
    closeModal();
    fetchDocuments();
  };

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
      handleActionSuccess();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // --- Render Logic ---
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!currentUser) return <p>Loading user...</p>;

  return (
    <>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-800">
            Document Dashboard
          </h2>

          {/* --- NEW: Search Input --- */}
          <input
            type="text"
            placeholder="Search by name or number..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-full sm:w-1/3"
          />

          {/* --- The New Upload Button --- */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Upload Document
          </button>
        </div>
        <DocumentTable
          documents={documents}
          currentUser={currentUser}
          onOpenSubmitModal={openSubmitModal}
          onOpenReviewModal={openReviewModal}
          onOpenApprovalModal={openApprovalModal}
        />
      </div>

      {/* --- NEW: Pagination Controls --- */}
      <div className="px-6 py-4 flex justify-between items-center border-t">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Submit Modal */}
      <Dialog
        open={isSubmitModalOpen}
        onClose={closeModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg rounded bg-white p-6">
            <Dialog.Title className="text-lg font-bold">
              Submit for Review
            </Dialog.Title>
            <p className="mt-2 text-sm text-gray-600">
              Select reviewers for: <strong>{selectedDoc?.filename}</strong>
            </p>
            <div className="mt-4 max-h-40 overflow-y-auto border rounded-md p-2">
              {reviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="flex items-center space-x-2 p-1"
                >
                  <input
                    type="checkbox"
                    id={`reviewer-${reviewer.id}`}
                    checked={selectedReviewers.includes(reviewer.id)}
                    onChange={() => handleReviewerSelection(reviewer.id)}
                  />
                  <label htmlFor={`reviewer-${reviewer.id}`}>
                    {reviewer.username}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-4">
              <button
                onClick={handleConfirmSubmit}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-400"
                disabled={selectedReviewers.length === 0}
              >
                Confirm Submit
              </button>
              <button
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Review Modal (Unchanged) */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeModal}
        document={selectedDoc}
        onReviewSuccess={handleActionSuccess}
      />

      {/* Approval Modal (Unchanged) */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={closeModal}
        document={selectedDoc}
        onApprovalSuccess={handleActionSuccess}
      />

      {/* --- The New Upload Modal --- */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={closeModal}
        onUploadSuccess={handleUploadSuccess}
      />
    </>
  );
}

export default Dashboard;
