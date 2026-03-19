"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Credential {
  id: string;
  certificate_name: string;
  certificate_type: string;
  expiry_date: string;
  file_name: string;
  uploaded_at: string;
}

interface PageClientProps {
  vendorId?: string;
  vendorName?: string;
  token?: string;
  existingCredentials?: Credential[];
}

const CERTIFICATE_TYPES = [
  "ISO 9001",
  "ISO 14001",
  "ISO 27001",
  "SOC 2",
  "PCI DSS",
  "GDPR Compliance",
  "Business License",
  "Insurance Certificate",
  "Safety Certification",
  "Other",
];

export default function PageClient({
  vendorId = '',
  vendorName = '',
  token = '',
  existingCredentials = [],
}: PageClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [credentials, setCredentials] =
    useState<Credential[]>(existingCredentials);
  const [form, setForm] = useState({
    certificate_name: "",
    certificate_type: "",
    expiry_date: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.certificate_name.trim()) {
      newErrors.certificate_name = "Certificate name is required";
    } else if (form.certificate_name.trim().length < 2) {
      newErrors.certificate_name =
        "Certificate name must be at least 2 characters";
    }

    if (!form.certificate_type) {
      newErrors.certificate_type = "Certificate type is required";
    }

    if (!form.expiry_date) {
      newErrors.expiry_date = "Expiry date is required";
    } else {
      const expiry = new Date(form.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiry < today) {
        newErrors.expiry_date = "Expiry date must be in the future";
      }
    }

    if (!file) {
      newErrors.file = "Please upload a certificate file";
    } else {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        newErrors.file = "File must be PDF, JPEG, PNG, or WebP";
      }
      if (file.size > 10 * 1024 * 1024) {
        newErrors.file = "File size must be less than 10MB";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (errors.file) {
      setErrors((prev) => ({ ...prev, file: "" }));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("certificate_name", form.certificate_name.trim());
      formData.append("certificate_type", form.certificate_type);
      formData.append("expiry_date", form.expiry_date);
      formData.append("file", file!);
      formData.append("token", token);

      const response = await fetch(`/api/vendors/${vendorId}/credentials`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload credential");
      }

      setCredentials((prev) => [data.credential, ...prev]);
      setForm({ certificate_name: "", certificate_type: "", expiry_date: "" });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccessMessage("Credential uploaded successfully!");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpiringSoon = (dateString: string) => {
    const expiry = new Date(dateString);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Vendor Onboarding Portal
              </h1>
              <p className="text-sm text-gray-500">Welcome, {vendorName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Upload Form */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload Credential
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Submit your certificates and compliance documents below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {/* Success / Error Messages */}
            {successMessage && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Certificate Name */}
            <div>
              <label
                htmlFor="certificate_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Certificate Name <span className="text-red-500">*</span>
              </label>
              <input
                id="certificate_name"
                name="certificate_name"
                type="text"
                value={form.certificate_name}
                onChange={handleInputChange}
                placeholder="e.g. ISO 9001:2015 Quality Management"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.certificate_name
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              />
              {errors.certificate_name && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.certificate_name}
                </p>
              )}
            </div>

            {/* Certificate Type */}
            <div>
              <label
                htmlFor="certificate_type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Certificate Type <span className="text-red-500">*</span>
              </label>
              <select
                id="certificate_type"
                name="certificate_type"
                value={form.certificate_type}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.certificate_type
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <option value="">Select a type...</option>
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.certificate_type && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.certificate_type}
                </p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label
                htmlFor="expiry_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                id="expiry_date"
                name="expiry_date"
                type="date"
                value={form.expiry_date}
                onChange={handleInputChange}
                min={new Date().toISOString().split("T")[0]}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.expiry_date
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              />
              {errors.expiry_date && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.expiry_date}
                </p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certificate File <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : errors.file
                      ? "border-red-300 bg-red-50"
                      : file
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg
                      className="w-8 h-8 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileChange(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <svg
                      className="w-10 h-10 text-gray-400 mx-auto mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">
                      Drop your file here, or{" "}
                      <span className="text-blue-600">browse</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPEG, PNG, WebP up to 10MB
                    </p>
                  </>
                )}
              </div>
              {errors.file && (
                <p className="mt-1 text-xs text-red-600">{errors.file}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Upload Credential
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Existing Credentials */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Uploaded Credentials
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {credentials.length === 0
                ? "No credentials uploaded yet."
                : `${credentials.length} credential${credentials.length !== 1 ? "s" : ""} on file.`}
            </p>
          </div>

          {credentials.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm text-gray-500">
                Upload your first credential using the form above.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {credentials.map((cred) => (
                <li key={cred.id} className="px-6 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-blue-600"
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
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {cred.certificate_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cred.certificate_type}
                        </p>
                      </div>
                      {isExpiringSoon(cred.expiry_date) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex-shrink-0">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Expiring Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="text-xs text-gray-500">
                        <span className="font-medium">Expires:</span>{" "}
                        {formatDate(cred.expiry_date)}
                      </span>
                      <span className="text-xs text-gray-500">
                        <span className="font-medium">File:</span>{" "}
                        {cred.file_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        <span className="font-medium">Uploaded:</span>{" "}
                        {formatDate(cred.uploaded_at)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
