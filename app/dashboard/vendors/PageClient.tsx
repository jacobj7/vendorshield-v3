"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Vendor {
  id: string;
  name: string;
  category: string;
  contactEmail: string;
  contactName: string;
  complianceScore: number;
  status: "active" | "inactive" | "pending";
  lastAuditDate: string | null;
  documentsCount: number;
  openIssuesCount: number;
  createdAt: string;
}

interface PageClientProps {
  initialVendors: Vendor[];
}

function getComplianceHealthBadge(score: number, openIssues: number) {
  if (score >= 80 && openIssues === 0) {
    return {
      label: "Healthy",
      className: "bg-green-100 text-green-800 border border-green-200",
      dotColor: "bg-green-500",
    };
  } else if (score >= 60 && openIssues <= 2) {
    return {
      label: "At Risk",
      className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      dotColor: "bg-yellow-500",
    };
  } else {
    return {
      label: "Critical",
      className: "bg-red-100 text-red-800 border border-red-200",
      dotColor: "bg-red-500",
    };
  }
}

function getStatusBadge(status: Vendor["status"]) {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "inactive":
      return "bg-gray-100 text-gray-600 border border-gray-200";
    case "pending":
      return "bg-purple-100 text-purple-800 border border-purple-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function ScoreRing({ score }: { score: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="56" height="56" className="-rotate-90">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="5"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function AddVendorModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (vendor: Vendor) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    contactName: "",
    contactEmail: "",
    status: "active" as Vendor["status"],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Vendor name is required";
    if (!form.category.trim()) errs.category = "Category is required";
    if (!form.contactName.trim()) errs.contactName = "Contact name is required";
    if (!form.contactEmail.trim()) {
      errs.contactEmail = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      errs.contactEmail = "Invalid email address";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setServerError(data.error || "Failed to create vendor");
        return;
      }
      const data = await res.json();
      onSuccess(data.vendor);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add New Vendor</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? "border-red-400" : "border-gray-300"
              }`}
              placeholder="Acme Corp"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.category ? "border-red-400" : "border-gray-300"
              }`}
            >
              <option value="">Select a category</option>
              <option value="Software">Software</option>
              <option value="Hardware">Hardware</option>
              <option value="Services">Services</option>
              <option value="Cloud">Cloud</option>
              <option value="Security">Security</option>
              <option value="Consulting">Consulting</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && (
              <p className="text-red-500 text-xs mt-1">{errors.category}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.contactName ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="Jane Smith"
              />
              {errors.contactName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.contactName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as Vendor["status"],
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.contactEmail ? "border-red-400" : "border-gray-300"
              }`}
              placeholder="jane@acme.com"
            />
            {errors.contactEmail && (
              <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Add Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const health = getComplianceHealthBadge(
    vendor.complianceScore,
    vendor.openIssuesCount,
  );
  const statusClass = getStatusBadge(vendor.status);

  return (
    <Link
      href={`/dashboard/vendors/${vendor.id}`}
      className="group block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base truncate group-hover:text-indigo-700 transition-colors">
              {vendor.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{vendor.category}</p>
          </div>
          <ScoreRing score={vendor.complianceScore} />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${health.className}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${health.dotColor}`} />
            {health.label}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusClass}`}
          >
            {vendor.status}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg
              className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="truncate">{vendor.contactName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg
              className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{vendor.contactEmail}</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">
              {vendor.documentsCount}
            </p>
            <p className="text-xs text-gray-500">Documents</p>
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-center ${vendor.openIssuesCount > 0 ? "bg-red-50" : "bg-green-50"}`}
          >
            <p
              className={`text-lg font-bold ${vendor.openIssuesCount > 0 ? "text-red-700" : "text-green-700"}`}
            >
              {vendor.openIssuesCount}
            </p>
            <p
              className={`text-xs ${vendor.openIssuesCount > 0 ? "text-red-500" : "text-green-500"}`}
            >
              Open Issues
            </p>
          </div>
        </div>

        {vendor.lastAuditDate && (
          <p className="mt-3 text-xs text-gray-400">
            Last audit:{" "}
            {new Date(vendor.lastAuditDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function PageClient({ initialVendors }: PageClientProps) {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | Vendor["status"]>(
    "all",
  );
  const [filterHealth, setFilterHealth] = useState<
    "all" | "Healthy" | "At Risk" | "Critical"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "score" | "issues">("name");

  function handleVendorAdded(vendor: Vendor) {
    setVendors((prev) => [vendor, ...prev]);
    setShowModal(false);
  }

  const filtered = vendors
    .filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.category.toLowerCase().includes(search.toLowerCase()) ||
        v.contactName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === "all" || v.status === filterStatus;
      const health = getComplianceHealthBadge(
        v.complianceScore,
        v.openIssuesCount,
      ).label;
      const matchesHealth = filterHealth === "all" || health === filterHealth;
      return matchesSearch && matchesStatus && matchesHealth;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "score") return b.complianceScore - a.complianceScore;
      if (sortBy === "issues") return b.openIssuesCount - a.openIssuesCount;
      return 0;
    });

  const healthCounts = {
    healthy: vendors.filter(
      (v) =>
        getComplianceHealthBadge(v.complianceScore, v.openIssuesCount).label ===
        "Healthy",
    ).length,
    atRisk: vendors.filter(
      (v) =>
        getComplianceHealthBadge(v.complianceScore, v.openIssuesCount).label ===
        "At Risk",
    ).length,
    critical: vendors.filter(
      (v) =>
        getComplianceHealthBadge(v.complianceScore, v.openIssuesCount).label ===
        "Critical",
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showModal && (
        <AddVendorModal
          onClose={() => setShowModal(false)}
          onSuccess={handleVendorAdded}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vendor Portfolio
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Vendor
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() =>
              setFilterHealth(filterHealth === "Healthy" ? "all" : "Healthy")
            }
            className={`bg-white rounded-xl border p-4 text-left transition-all ${
              filterHealth === "Healthy"
                ? "border-green-400 ring-2 ring-green-200"
                : "border-gray-200 hover:border-green-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-gray-600">Healthy</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {healthCounts.healthy}
            </p>
          </button>
          <button
            onClick={() =>
              setFilterHealth(filterHealth === "At Risk" ? "all" : "At Risk")
            }
            className={`bg-white rounded-xl border p-4 text-left transition-all ${
              filterHealth === "At Risk"
                ? "border-yellow-400 ring-2 ring-yellow-200"
                : "border-gray-200 hover:border-yellow-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs font-medium text-gray-600">At Risk</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {healthCounts.atRisk}
            </p>
          </button>
          <button
            onClick={() =>
              setFilterHealth(filterHealth === "Critical" ? "all" : "Critical")
            }
            className={`bg-white rounded-xl border p-4 text-left transition-all ${
              filterHealth === "Critical"
                ? "border-red-400 ring-2 ring-red-200"
                : "border-gray-200 hover:border-red-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-gray-600">
                Critical
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {healthCounts.critical}
            </p>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as typeof filterStatus)
            }
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="name">Sort: Name</option>
            <option value="score">Sort: Score</option>
            <option value="issues">Sort: Issues</option>
          </select>
        </div>

        {/* Vendor Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              No vendors found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {vendors.length === 0
                ? "Get started by adding your first vendor."
                : "Try adjusting your search or filters."}
            </p>
            {vendors.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Your First Vendor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
