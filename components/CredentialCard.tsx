"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

type CredentialStatus = "pending" | "approved" | "rejected" | "expired";

interface Credential {
  id: string;
  name: string;
  type: string;
  status: CredentialStatus;
  expiryDate: string | null;
  fileUrl: string | null;
  submittedAt: string;
  submittedBy: string;
}

interface CredentialCardProps {
  credential: Credential;
  isComplianceOfficer?: boolean;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
}

const statusConfig: Record<
  CredentialStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending Review",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 border border-green-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  expired: {
    label: "Expired",
    className: "bg-gray-100 text-gray-700 border border-gray-200",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 30;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CredentialCard({
  credential,
  isComplianceOfficer = false,
  onApprove,
  onReject,
}: CredentialCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [actionError, setActionError] = useState("");

  const statusInfo = statusConfig[credential.status];
  const expiringSoon = isExpiringSoon(credential.expiryDate);

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    setActionError("");
    try {
      await onApprove(credential.id);
    } catch (err) {
      setActionError("Failed to approve credential. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!onReject) return;
    if (!rejectReason.trim()) {
      setRejectReasonError("Please provide a reason for rejection.");
      return;
    }
    setIsRejecting(true);
    setActionError("");
    try {
      await onReject(credential.id, rejectReason.trim());
      setShowRejectModal(false);
      setRejectReason("");
    } catch (err) {
      setActionError("Failed to reject credential. Please try again.");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setRejectReason("");
    setRejectReasonError("");
    setActionError("");
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {credential.name}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{credential.type}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.className}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        {/* Card Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Submitted By */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Submitted by</span>
            <span className="text-gray-800 font-medium">
              {credential.submittedBy}
            </span>
          </div>

          {/* Submitted At */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Submitted on</span>
            <span className="text-gray-800">
              {formatDate(credential.submittedAt)}
            </span>
          </div>

          {/* Expiry Date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Expiry date</span>
            <div className="flex items-center gap-1.5">
              {expiringSoon && (
                <AlertTriangle
                  className="w-3.5 h-3.5 text-amber-500"
                  aria-label="Expiring soon"
                />
              )}
              <span
                className={`font-medium ${
                  expiringSoon
                    ? "text-amber-600"
                    : credential.status === "expired"
                      ? "text-red-600"
                      : "text-gray-800"
                }`}
              >
                {formatDate(credential.expiryDate)}
              </span>
            </div>
          </div>

          {expiringSoon && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-1.5">
              This credential expires within 30 days.
            </p>
          )}

          {/* File Link */}
          {credential.fileUrl ? (
            <a
              href={credential.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              View Document
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-gray-400">
              <FileText className="w-4 h-4 flex-shrink-0" />
              No document attached
            </div>
          )}
        </div>

        {/* Action Buttons — Compliance Officers Only, Pending Status */}
        {isComplianceOfficer && credential.status === "pending" && (
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
            {actionError && (
              <p className="text-xs text-red-600 mb-3 bg-red-50 border border-red-100 rounded-md px-3 py-1.5">
                {actionError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {isApproving ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Approving…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isApproving || isRejecting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2
                id="reject-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                Reject Credential
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Please provide a reason for rejecting{" "}
                <span className="font-medium text-gray-700">
                  {credential.name}
                </span>
                .
              </p>
            </div>

            <div>
              <label
                htmlFor="reject-reason"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (e.target.value.trim()) setRejectReasonError("");
                }}
                placeholder="Enter the reason for rejection…"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none ${
                  rejectReasonError
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
              />
              {rejectReasonError && (
                <p className="text-xs text-red-600 mt-1">{rejectReasonError}</p>
              )}
            </div>

            {actionError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-1.5">
                {actionError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleRejectCancel}
                disabled={isRejecting}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isRejecting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {isRejecting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Rejecting…
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
