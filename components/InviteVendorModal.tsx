"use client";

import { useState } from "react";
import { z } from "zod";

const InvitationResponseSchema = z.object({
  invitation_url: z.string().url(),
  token: z.string(),
  expires_at: z.string(),
});

type InvitationResponse = z.infer<typeof InvitationResponseSchema>;

interface InviteVendorModalProps {
  vendorId: string;
  vendorName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteVendorModal({
  vendorId,
  vendorName,
  isOpen,
  onClose,
}: InviteVendorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateInvitation = async () => {
    setIsLoading(true);
    setError(null);
    setInvitation(null);

    try {
      const response = await fetch(`/api/vendors/${vendorId}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to generate invitation (${response.status})`,
        );
      }

      const data = await response.json();
      const parsed = InvitationResponseSchema.safeParse(data);

      if (!parsed.success) {
        throw new Error("Invalid response format from server");
      }

      setInvitation(parsed.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!invitation?.invitation_url) return;

    try {
      await navigator.clipboard.writeText(invitation.invitation_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

  const handleClose = () => {
    setInvitation(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  const formatExpiryDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-vendor-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="invite-vendor-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Invite Vendor
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4">
          {vendorName && (
            <p className="text-sm text-gray-600">
              Generate an invitation link for{" "}
              <span className="font-medium text-gray-900">{vendorName}</span>.
            </p>
          )}

          {!vendorName && (
            <p className="text-sm text-gray-600">
              Generate an invitation link for this vendor to join the platform.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Generated Invitation */}
          {invitation && (
            <div className="space-y-3 rounded-md bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-green-800">
                  Invitation link generated!
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Invitation URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={invitation.invitation_url}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="flex-shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Expires:{" "}
                <span className="font-medium">
                  {formatExpiryDate(invitation.expires_at)}
                </span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
            >
              {invitation ? "Close" : "Cancel"}
            </button>

            {!invitation && (
              <button
                onClick={handleGenerateInvitation}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {isLoading && (
                  <svg
                    className="h-4 w-4 animate-spin"
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
                )}
                {isLoading ? "Generating..." : "Generate Invitation Link"}
              </button>
            )}

            {invitation && (
              <button
                onClick={handleGenerateInvitation}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {isLoading && (
                  <svg
                    className="h-4 w-4 animate-spin"
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
                )}
                {isLoading ? "Regenerating..." : "Regenerate Link"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
