"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Credential {
  id: string;
  type: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  uploadedAt: string;
  fileUrl?: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  riskScore: number | null;
  riskLevel: string | null;
  riskSummary: string | null;
  createdAt: string;
  credentials: Credential[];
}

interface PageClientProps {
  vendor: Vendor;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  under_review: "bg-blue-100 text-blue-800",
};

const riskLevelColors: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-600",
  critical: "text-red-800",
};

export default function PageClient({ vendor: initialVendor }: PageClientProps) {
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor>(initialVendor);
  const [loadingCredential, setLoadingCredential] = useState<string | null>(
    null,
  );
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCredentialAction = async (
    credentialId: string,
    action: "approve" | "reject",
  ) => {
    setLoadingCredential(credentialId);
    setError(null);
    try {
      const response = await fetch(
        `/api/vendors/${vendor.id}/credentials/${credentialId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update credential");
      }

      const updated = await response.json();
      setVendor((prev) => ({
        ...prev,
        credentials: prev.credentials.map((c) =>
          c.id === credentialId ? { ...c, status: updated.status } : c,
        ),
      }));
      showSuccess(`Credential ${action}d successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingCredential(null);
    }
  };

  const handleTriggerRiskScoring = async () => {
    setLoadingRisk(true);
    setError(null);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}/risk-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to trigger risk scoring");
      }

      const data = await response.json();
      setVendor((prev) => ({
        ...prev,
        riskScore: data.riskScore,
        riskLevel: data.riskLevel,
        riskSummary: data.riskSummary,
      }));
      showSuccess("Risk scoring completed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingRisk(false);
    }
  };

  const getRiskScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-500";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Details</h1>
          <div className="w-20" />
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0"
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
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <svg
              className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
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
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vendor Info Card */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {vendor.name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">{vendor.company}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusColors[vendor.status] || "bg-gray-100 text-gray-800"
                }`}
              >
                {vendor.status.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Email</p>
                <p className="text-gray-900 mt-1">{vendor.email}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Member Since</p>
                <p className="text-gray-900 mt-1">
                  {new Date(vendor.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Score Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Risk Score
              </h3>
              <button
                onClick={handleTriggerRiskScoring}
                disabled={loadingRisk}
                className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingRisk ? (
                  <>
                    <svg
                      className="animate-spin w-3 h-3 mr-1.5"
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
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3 mr-1.5"
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
                    Run AI Analysis
                  </>
                )}
              </button>
            </div>

            <div className="text-center py-4">
              <div
                className={`text-5xl font-bold ${getRiskScoreColor(vendor.riskScore)}`}
              >
                {vendor.riskScore !== null ? vendor.riskScore : "—"}
              </div>
              {vendor.riskScore !== null && (
                <p className="text-sm text-gray-500 mt-1">out of 100</p>
              )}
              {vendor.riskLevel && (
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    statusColors[vendor.riskLevel] ||
                    "bg-gray-100 text-gray-800"
                  }`}
                >
                  {vendor.riskLevel} risk
                </span>
              )}
            </div>

            {vendor.riskSummary && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 leading-relaxed">
                  {vendor.riskSummary}
                </p>
              </div>
            )}

            {!vendor.riskScore && !loadingRisk && (
              <p className="text-center text-sm text-gray-400 mt-2">
                No risk assessment yet
              </p>
            )}
          </div>
        </div>

        {/* Credentials Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Credentials
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                {vendor.credentials.length}
              </span>
            </h3>
          </div>

          {vendor.credentials.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 mx-auto mb-3"
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
              <p className="text-gray-500 text-sm">
                No credentials submitted yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {vendor.credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-indigo-600"
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
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {credential.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {credential.type} •{" "}
                        {new Date(credential.uploadedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusColors[credential.status] ||
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {credential.status}
                    </span>

                    {credential.fileUrl && (
                      <a
                        href={credential.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                      >
                        View
                      </a>
                    )}

                    {credential.status === "pending" && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleCredentialAction(credential.id, "approve")
                          }
                          disabled={loadingCredential === credential.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingCredential === credential.id ? (
                            <svg
                              className="animate-spin w-3 h-3"
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
                          ) : (
                            "Approve"
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleCredentialAction(credential.id, "reject")
                          }
                          disabled={loadingCredential === credential.id}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loadingCredential === credential.id ? (
                            <svg
                              className="animate-spin w-3 h-3"
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
                          ) : (
                            "Reject"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
