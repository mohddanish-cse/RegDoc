import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import Select from "react-select";
import { apiCall } from "../utils/api";
import toast from "react-hot-toast";
import tmfStructure from "../data/tmf-structure.json";

function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  // CTMS data - fetched once on mount
  const [allStudies, setAllStudies] = useState([]);
  const [allCountries, setAllCountries] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [isLoadingCTMS, setIsLoadingCTMS] = useState(false);

  // User selections
  const [studyId, setStudyId] = useState("");
  const [country, setCountry] = useState("");
  const [site, setSite] = useState("");
  const [showAddPanel, setShowAddPanel] = useState("");
  const [addFields, setAddFields] = useState({});
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TMF selections
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedArtifact, setSelectedArtifact] = useState(null);

  // Fetch ALL CTMS data once when modal opens
  useEffect(() => {
    if (isOpen && allStudies.length === 0) {
      setIsLoadingCTMS(true);
      Promise.all([
        apiCall("/ctms/studies", "GET"),
        apiCall("/ctms/countries", "GET"),
        apiCall("/ctms/sites", "GET"),
      ])
        .then(([studiesRes, countriesRes, sitesRes]) => {
          setAllStudies(studiesRes.data || []);
          setAllCountries(countriesRes.data || []);
          setAllSites(sitesRes.data || []);
        })
        .catch((err) => {
          console.error("Failed to load CTMS data:", err);
          toast.error("Failed to load CTMS data");
        })
        .finally(() => setIsLoadingCTMS(false));
    }
  }, [isOpen, allStudies.length]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStudyId("");
      setCountry("");
      setSite("");
      setShowAddPanel("");
      setAddFields({});
      setFile(null);
      setSelectedZone(null);
      setSelectedSection(null);
      setSelectedArtifact(null);
    }
  }, [isOpen]);

  // Filtered lists based on selections
  const availableCountries = studyId
    ? allCountries.filter((c) =>
        allSites.some((s) => s.study_id === studyId && s.country === c.code)
      )
    : [];

  const availableSites = allSites.filter(
    (s) =>
      (!studyId || s.study_id === studyId) &&
      (!country || s.country === country)
  );

  // TMF Options
  const zoneOptions = tmfStructure.zones.map((z) => ({
    value: z.code,
    label: `${z.code} - ${z.name}`,
    data: z,
  }));
  const sectionOptions = selectedZone
    ? selectedZone.data.sections.map((s) => ({
        value: s.code,
        label: `${s.code} - ${s.name}`,
        data: s,
      }))
    : [];
  const artifactOptions = selectedSection
    ? selectedSection.data.artifacts.map((a) => ({
        value: a,
        label: a,
      }))
    : [];

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return toast.error("Please select a file");
    if (!studyId) return toast.error("Please select Study");
    if (country && !studyId)
      return toast.error("Please select Study before Country");
    if (site && !country)
      return toast.error("Please select Country before Site");
    if (!selectedZone || !selectedSection || !selectedArtifact)
      return toast.error("Please select TMF Zone, Section & Artifact");

    setIsSubmitting(true);
    const toastId = toast.loading("Uploading document...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("study_id", studyId);
    formData.append("country", country);
    formData.append("site_id", site);
    formData.append("tmf_zone", selectedZone.label);
    formData.append("tmf_section", selectedSection.label);
    formData.append("tmf_artifact", selectedArtifact.value);

    try {
      const response = await apiCall("/documents/upload", "POST", formData, {
        "Content-Type": "multipart/form-data",
      });
      toast.success("Document uploaded successfully!", { id: toastId });
      onUploadSuccess(response.document);
      onClose();
    } catch (error) {
      toast.error(error.message || "Upload failed", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Modern floating card for Add New
  const glassPanel =
    "absolute z-40 top-14 left-1/2 -translate-x-1/2 w-80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-fadein";
  const inputMinimal =
    "w-full px-2 py-2 text-lg bg-transparent border-0 border-b-2 border-gray-300 focus:border-cyan-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500";
  const pillBtn =
    "px-6 py-2 rounded-full font-medium text-base transition-all hover:scale-105 focus:ring-2 focus:ring-cyan-400";
  const cancelBtn =
    pillBtn + " bg-gray-100 hover:bg-gray-200 text-gray-600 mr-2";
  const addBtn =
    pillBtn + " bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50";

  function renderAddPanel() {
    if (!showAddPanel) return null;
    let fields = [];
    if (showAddPanel === "study")
      fields = [
        { name: "id", label: "Study ID", required: true },
        { name: "name", label: "Study Name", required: true },
      ];
    if (showAddPanel === "country")
      fields = [{ name: "name", label: "Country Name", required: true }];
    if (showAddPanel === "site")
      fields = [
        { name: "id", label: "Site ID", required: true },
        { name: "name", label: "Site Name", required: true },
      ];

    return (
      <div className={glassPanel} style={{ marginTop: 10 }}>
        <div className="mb-3 text-gray-800 dark:text-gray-200 text-lg font-bold">
          {showAddPanel === "study"
            ? "Add New Study"
            : showAddPanel === "country"
            ? "Add New Country"
            : "Add New Site"}
        </div>
        {fields.map(({ name, label, required }) => (
          <input
            key={name}
            className={inputMinimal + " mb-2"}
            placeholder={label + (required ? " *" : "")}
            value={addFields[name] || ""}
            onChange={(e) =>
              setAddFields((f) => ({ ...f, [name]: e.target.value }))
            }
            autoFocus={fields[0].name === name}
          />
        ))}
        <div className="flex w-full justify-end mt-2">
          <button
            type="button"
            className={cancelBtn}
            onClick={() => {
              setShowAddPanel("");
              setAddFields({});
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={addBtn}
            disabled={fields.some(
              (f) => f.required && !addFields[f.name]?.trim()
            )}
            onClick={() => {
              if (showAddPanel === "study") {
                const newStudy = {
                  id: addFields.id.trim(),
                  name: addFields.name.trim(),
                };
                setAllStudies([...allStudies, newStudy]);
                setStudyId(newStudy.id);
                setCountry("");
                setSite("");
              } else if (showAddPanel === "country") {
                const newCountry = {
                  code: addFields.name.trim().substring(0, 2).toUpperCase(),
                  name: addFields.name.trim(),
                };
                setAllCountries([...allCountries, newCountry]);
                setCountry(newCountry.code);
                setSite("");
              } else if (showAddPanel === "site") {
                const newSite = {
                  id: addFields.id.trim(),
                  name: addFields.name.trim(),
                  study_id: studyId,
                  country: country,
                  status: "Active",
                };
                setAllSites([...allSites, newSite]);
                setSite(newSite.id);
              }
              setShowAddPanel("");
              setAddFields({});
            }}
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-cyan-500 transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const headerClass =
    "bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 rounded-t-lg";
  const panelClass =
    "mx-auto w-full max-w-4xl min-w-[900px] rounded-lg bg-white shadow-xl";
  const bodyClass = "px-6 py-4 max-h-[70vh] overflow-y-auto";
  const footerClass =
    "flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200";
  const primaryBtn =
    "px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors";
  const secondaryBtn =
    "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors";

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className={panelClass}>
          <div className={headerClass}>
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <Dialog.Title className="text-xl font-semibold text-white">
                Upload New Document
              </Dialog.Title>
              {isLoadingCTMS && (
                <span className="ml-auto text-sm text-white/80">
                  Loading CTMS data...
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            {renderAddPanel()}
            <div className={bodyClass}>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Document File <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx"
                    className={inputClass}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Accepted formats: PDF, DOC, DOCX (Max 10MB)
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>
                      Study <span className="text-red-600">*</span>
                    </label>
                    <Select
                      options={[
                        ...allStudies.map((s) => ({
                          value: s.id,
                          label: `${s.id} - ${s.name}`,
                        })),
                        { value: "__add_new__", label: "➕ Add New Study..." },
                      ]}
                      value={
                        studyId
                          ? {
                              value: studyId,
                              label: allStudies.find((s) => s.id === studyId)
                                ?.name
                                ? `${studyId} - ${
                                    allStudies.find((s) => s.id === studyId)
                                      .name
                                  }`
                                : studyId,
                            }
                          : null
                      }
                      onChange={(opt) => {
                        if (opt.value === "__add_new__")
                          setShowAddPanel("study");
                        else {
                          setStudyId(opt.value);
                          setCountry("");
                          setSite("");
                        }
                      }}
                      placeholder="Select Study..."
                      isSearchable
                      required
                      isDisabled={!!showAddPanel || isLoadingCTMS}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <Select
                      options={[
                        ...availableCountries.map((c) => ({
                          value: c.code,
                          label: c.name,
                        })),
                        {
                          value: "__add_new__",
                          label: "➕ Add New Country...",
                        },
                      ]}
                      value={
                        country
                          ? {
                              value: country,
                              label:
                                allCountries.find((c) => c.code === country)
                                  ?.name || country,
                            }
                          : null
                      }
                      onChange={(opt) => {
                        if (opt.value === "__add_new__")
                          setShowAddPanel("country");
                        else {
                          setCountry(opt.value);
                          setSite("");
                        }
                      }}
                      placeholder={
                        studyId ? "Select Country..." : "Select Study First"
                      }
                      isSearchable
                      isDisabled={!studyId || !!showAddPanel || isLoadingCTMS}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Site</label>
                    <Select
                      options={[
                        ...availableSites.map((s) => ({
                          value: s.id,
                          label: `${s.id} - ${s.name}`,
                        })),
                        { value: "__add_new__", label: "➕ Add New Site..." },
                      ]}
                      value={
                        site
                          ? {
                              value: site,
                              label: allSites.find((s) => s.id === site)?.name
                                ? `${site} - ${
                                    allSites.find((s) => s.id === site).name
                                  }`
                                : site,
                            }
                          : null
                      }
                      onChange={(opt) => {
                        if (opt.value === "__add_new__")
                          setShowAddPanel("site");
                        else setSite(opt.value);
                      }}
                      placeholder={
                        country ? "Select Site..." : "Select Country First"
                      }
                      isSearchable
                      isDisabled={
                        !country || !studyId || !!showAddPanel || isLoadingCTMS
                      }
                    />
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    TMF Classification <span className="text-red-600">*</span>
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>TMF Zone</label>
                      <Select
                        options={zoneOptions}
                        value={selectedZone}
                        onChange={(opt) => {
                          setSelectedZone(opt);
                          setSelectedSection(null);
                          setSelectedArtifact(null);
                        }}
                        placeholder="Select TMF Zone..."
                        isSearchable
                        isDisabled={!!showAddPanel}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>TMF Section</label>
                      <Select
                        options={sectionOptions}
                        value={selectedSection}
                        onChange={(opt) => {
                          setSelectedSection(opt);
                          setSelectedArtifact(null);
                        }}
                        placeholder="Select TMF Section..."
                        isSearchable
                        isDisabled={!selectedZone || !!showAddPanel}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>TMF Artifact</label>
                      <Select
                        options={artifactOptions}
                        value={selectedArtifact}
                        onChange={setSelectedArtifact}
                        placeholder="Select TMF Artifact..."
                        isSearchable
                        isDisabled={!selectedSection || !!showAddPanel}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className={footerClass}>
            <button
              type="button"
              onClick={onClose}
              className={secondaryBtn}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isSubmitting || !!showAddPanel}
              className={primaryBtn}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </span>
              ) : (
                "Upload Document"
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default UploadModal;
