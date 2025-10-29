// frontend/src/components/MetadataPanel.jsx

import React, { useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";

function MetadataPanel({ document, versionHistory }) {
  const [activeTab, setActiveTab] = useState("details");
  const [isCopied, setIsCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!document) return null;

  let uploadDate = "";
  if (document.uploadDate) {
    const dt = new Date(document.uploadDate);
    uploadDate = isNaN(dt.valueOf())
      ? "Unknown"
      : dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  }

  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleVerifySignature = async () => {
    setIsVerifying(true);
    const toastId = toast.loading("Verifying signature...");
    try {
      const response = await apiCall(
        `/documents/${document.id}/verify-signature`,
        "POST"
      );
      if (response.verified) {
        toast.success("Success! The signature is valid.", { id: toastId });
      } else {
        toast.error("Verification Failed: The signature is NOT valid.", {
          id: toastId,
        });
      }
    } catch (err) {
      toast.error(`Verification Error: ${err.message}`, { id: toastId });
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusExplanation = (status) => {
    const explanations = {
      "QC Rejected": {
        text: "Rejected during QC – needs author resubmission",
        color: "text-error-600",
      },
      "Under Revision": {
        text: "Changes requested by reviewer – awaiting revision",
        color: "text-warning-600",
      },
      Rejected: {
        text: "Document rejected during Technical Review",
        color: "text-error-700",
      },
      Superseded: {
        text: "Replaced by newer approved version",
        color: "text-gray-600",
      },
      Archived: {
        text: "Archived after study conclusion – read-only",
        color: "text-gray-700",
      },
    };
    return explanations[status] || null;
  };

  const statusExplanation = getStatusExplanation(document.status);

  const tabs = [
    {
      id: "details",
      label: "Details",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: "workflow",
      label: "Workflow",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      id: "tmf",
      label: "TMF",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
    },
    {
      id: "history",
      label: "History",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white flex flex-col h-full">
      {/* Header Section */}
      <div className="flex-shrink-0 p-5 border-b border-gray-200">
        <h2 className="text-base font-bold text-gray-900 mb-3 truncate">
          {document.filename}
        </h2>

        {/* Document Number */}
        {document.doc_number && (
          <div className="flex items-center gap-2 mb-4">
            <code className="text-xs font-mono text-gray-600 bg-gray-50 px-2.5 py-1.5 border border-gray-200 flex-1 truncate">
              {document.doc_number}
            </code>
            {isCopied ? (
              <span className="inline-flex items-center text-xs font-medium text-success-600 whitespace-nowrap">
                <svg
                  className="w-3.5 h-3.5 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Copied
              </span>
            ) : (
              <button
                onClick={() => handleCopyToClipboard(document.doc_number)}
                title="Copy document number"
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="h-4 w-4"
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
        )}

        {/* Digital Signature */}
        {document.signature && (
          <div className="p-3 bg-success-50 border border-success-200 mb-4">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg
                    className="w-4 h-4 text-success-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p className="text-xs font-semibold text-success-800">
                    Digitally Signed
                  </p>
                </div>
                <p className="text-xs text-success-700 truncate">
                  by {document.signed_by_username}
                </p>
                <p className="text-xs text-success-600 mt-0.5">
                  {new Date(document.signed_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={handleVerifySignature}
                disabled={isVerifying}
                className="px-2.5 py-1.5 text-xs font-semibold text-success-700 bg-success-100 hover:bg-success-200 disabled:opacity-50 disabled:cursor-wait transition-colors flex-shrink-0"
              >
                {isVerifying ? "..." : "Verify"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Status
              </p>
              <div className="mb-2">
                <StatusBadge status={document.status} />
              </div>
              {statusExplanation && (
                <p className={`text-xs font-medium ${statusExplanation.color}`}>
                  {statusExplanation.text}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Author
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 bg-primary-100 rounded-full flex-shrink-0">
                  <span className="text-xs font-semibold text-primary-700">
                    {document.author_username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {document.author_username}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Version
              </p>
              <p className="text-sm font-mono font-medium text-gray-900">
                {document.version}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Upload Date
              </p>
              <p className="text-sm text-gray-900">{uploadDate}</p>
            </div>
          </div>
        )}

        {/* Workflow Tab */}
        {activeTab === "workflow" && (
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Workflow Timeline
            </h3>
            <div className="space-y-4">
              {document.history && document.history.length > 0 ? (
                document.history.map((entry, index) => (
                  <div
                    key={index}
                    className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-l-0 last:pb-0"
                  >
                    <div className="absolute left-0 top-0 -translate-x-[9px] w-4 h-4 bg-white border-2 border-primary-500 rounded-full"></div>
                    <p className="font-semibold text-sm text-gray-900 mb-1">
                      {entry.action}
                    </p>
                    <p className="text-xs text-gray-600">by {entry.user}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(entry.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {entry.details && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 border border-gray-200">
                        "{entry.details}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-sm text-gray-500">
                    No workflow events yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TMF Tab - COMPLETE VERSION */}
        {activeTab === "tmf" && (
          <div className="p-4">
            {document.tmf_metadata &&
            Object.keys(document.tmf_metadata).length > 0 ? (
              <div className="space-y-4">
                {document.tmf_metadata.study_id && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Study ID
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {document.tmf_metadata.study_id}
                    </p>
                  </div>
                )}

                {document.tmf_metadata.country && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Country
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {document.tmf_metadata.country}
                    </p>
                  </div>
                )}

                {document.tmf_metadata.site_id && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Site ID
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {document.tmf_metadata.site_id}
                    </p>
                  </div>
                )}

                {document.tmf_metadata.tmf_zone && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      TMF Zone
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {document.tmf_metadata.tmf_zone}
                    </p>
                  </div>
                )}

                {document.tmf_metadata.tmf_section && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      TMF Section
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {document.tmf_metadata.tmf_section}
                    </p>
                  </div>
                )}

                {document.tmf_metadata.tmf_artifact && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      TMF Artifact
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {document.tmf_metadata.tmf_artifact}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm text-gray-500">
                  No TMF metadata available
                </p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {/* History Tab */}
        {activeTab === "history" && (
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Version History
            </h3>
            {versionHistory && versionHistory.length > 0 ? (
              <ul className="space-y-2">
                {versionHistory.map((version) => (
                  <li key={version.id}>
                    <Link
                      to={`/documents/${version.id}`}
                      className={`block p-3 transition-all border rounded-lg ${
                        version.id === document.id
                          ? "bg-primary-50 border-primary-200"
                          : "hover:bg-gray-50 border-gray-200"
                      }`}
                    >
                      {/* ✅ Version Number & Date */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-mono font-semibold text-sm text-gray-900">
                            v{version.version}
                          </span>
                          <span className="block text-xs text-gray-500 mt-0.5">
                            {new Date(version.uploadDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>

                        {/* ✅ Current version indicator */}
                        {version.id === document.id && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-primary-100 text-primary-700">
                            Current
                          </span>
                        )}
                      </div>

                      {/* ✅ Status Badge - Separate row */}
                      <div className="flex items-center gap-2">
                        <StatusBadge status={version.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500">No version history</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MetadataPanel;
