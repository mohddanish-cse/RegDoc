import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../utils/api";

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  // State for managing the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

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

  const openSubmitModal = (doc) => {
    setSelectedDoc(doc);
    setIsModalOpen(true);
  };

  const closeSubmitModal = () => {
    setSelectedDoc(null);
    setIsModalOpen(false);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedDoc) return;

    try {
      await apiCall(`/documents/${selectedDoc.id}/submit`, "POST");

      // Close the modal and refresh the document list
      closeSubmitModal();
      fetchDocuments();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* ... (Table is mostly unchanged, but we add a new column for Actions) ... */}
        <div className="px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Document Dashboard
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {doc.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {doc.status === "Draft" && (
                      <button
                        onClick={() => openSubmitModal(doc)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Submit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- The Modal Dialog --- */}
      <Dialog
        open={isModalOpen}
        onClose={closeSubmitModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded bg-white p-6">
            <Dialog.Title className="text-lg font-bold">
              Submit for Review
            </Dialog.Title>
            <p className="mt-2 text-sm">
              Are you sure you want to submit "{selectedDoc?.filename}" for
              review? This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleConfirmSubmit}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Confirm Submit
              </button>
              <button
                onClick={closeSubmitModal}
                className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}

export default Dashboard;
