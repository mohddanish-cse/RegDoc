// frontend/src/components/SubmitModal.jsx

import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { apiCall } from "../../utils/api";
import toast from "react-hot-toast";
import UserSelector from "../UserSelector";

function SubmitModal({ isOpen, onClose, document, onSubmitSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        try {
          const data = await apiCall("/workflow-templates");
          setTemplates(data);
          if (data.length > 0) {
            handleTemplateChange(data[0].id, data);
          }
        } catch (err) {
          toast.error("Could not fetch workflow templates.");
        }
      };
      fetchTemplates();
    }
  }, [isOpen]);

  const handleTemplateChange = (templateId, allTemplates = templates) => {
    setSelectedTemplateId(templateId);
    const template = allTemplates.find((t) => t.id === templateId);
    if (template) {
      const initialAssignments = {};
      template.stages.forEach((stage) => {
        initialAssignments[stage.role_required] = [];
      });
      setAssignments(initialAssignments);
    }
  };

  const handleSubmit = async () => {
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      toast.error("Please select a workflow template.");
      return;
    }

    const assignmentIds = Object.keys(assignments).reduce((acc, role) => {
      acc[role] = assignments[role].map((user) => user.id);
      return acc;
    }, {});

    for (const stage of selectedTemplate.stages) {
      if (
        !assignmentIds[stage.role_required] ||
        assignmentIds[stage.role_required].length === 0
      ) {
        toast.error(
          `You must assign at least one user for the '${stage.stage_name}' stage.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting workflow...");
    const payload = {
      template_id: selectedTemplate.id,
      assignments: assignmentIds,
    };

    try {
      await apiCall(`/documents/${document.id}/submit`, "POST", payload);
      toast.success("Document submitted successfully!", { id: toastId });
      onSubmitSuccess();
      handleClose();
    } catch (err) {
      toast.error(`Submission failed: ${err.message}`, { id: toastId });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplateId("");
    setAssignments({});
    onClose();
  };
  if (!isOpen || !document) return null;
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog
      open={isOpen}
      onClose={() => !isSubmitting && handleClose()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900">
            Submit for Review:{" "}
            <span className="text-primary">{document.filename}</span>
          </Dialog.Title>

          <div className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Workflow Template
              </label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                disabled={templates.length === 0 || isSubmitting}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate &&
              selectedTemplate.stages.map((stage) => (
                <UserSelector
                  key={`${selectedTemplate.id}-${stage.stage_number}`}
                  stageName={stage.stage_name}
                  roleName={stage.role_required}
                  selectedUsers={assignments[stage.role_required] || []}
                  onSelectionChange={(users) =>
                    setAssignments((prev) => ({
                      ...prev,
                      [stage.role_required]: users,
                    }))
                  }
                  isSingleSelect={stage.role_required === "Approver"}
                  disabled={isSubmitting}
                />
              ))}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-gray-800 px-4 py-2"
            >
              Confirm and Submit
            </button>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default SubmitModal;
