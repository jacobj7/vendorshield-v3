"use client";

import { cn } from "@/lib/utils";

interface Finding {
  id: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
}

interface RiskScoreDisplayProps {
  score: number;
  findings?: Finding[];
  lastUpdated?: Date | string | null;
  className?: string;
  isLoading?: boolean;
}

type RiskLevel = "Critical" | "High" | "Medium" | "Low" | "Minimal";

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Minimal";
}

function getRiskColors(level: RiskLevel) {
  switch (level) {
    case "Critical":
      return {
        badge: "bg-red-100 text-red-800 border-red-200",
        ring: "stroke-red-500",
        text: "text-red-600",
        bar: "bg-red-500",
      };
    case "High":
      return {
        badge: "bg-orange-100 text-orange-800 border-orange-200",
        ring: "stroke-orange-500",
        text: "text-orange-600",
        bar: "bg-orange-500",
      };
    case "Medium":
      return {
        badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
        ring: "stroke-yellow-500",
        text: "text-yellow-600",
        bar: "bg-yellow-500",
      };
    case "Low":
      return {
        badge: "bg-blue-100 text-blue-800 border-blue-200",
        ring: "stroke-blue-500",
        text: "text-blue-600",
        bar: "bg-blue-500",
      };
    case "Minimal":
      return {
        badge: "bg-green-100 text-green-800 border-green-200",
        ring: "stroke-green-500",
        text: "text-green-600",
        bar: "bg-green-500",
      };
  }
}

function getSeverityColors(severity: Finding["severity"]) {
  switch (severity) {
    case "critical":
      return {
        dot: "bg-red-500",
        text: "text-red-700",
        badge: "bg-red-100 text-red-700 border-red-200",
      };
    case "high":
      return {
        dot: "bg-orange-500",
        text: "text-orange-700",
        badge: "bg-orange-100 text-orange-700 border-orange-200",
      };
    case "medium":
      return {
        dot: "bg-yellow-500",
        text: "text-yellow-700",
        badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
      };
    case "low":
      return {
        dot: "bg-blue-500",
        text: "text-blue-700",
        badge: "bg-blue-100 text-blue-700 border-blue-200",
      };
    case "info":
      return {
        dot: "bg-gray-400",
        text: "text-gray-600",
        badge: "bg-gray-100 text-gray-600 border-gray-200",
      };
  }
}

function CircularProgress({
  score,
  level,
}: {
  score: number;
  level: RiskLevel;
}) {
  const colors = getRiskColors(level);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-gray-100"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700 ease-out", colors.ring)}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold leading-none", colors.text)}>
          {clampedScore}
        </span>
        <span className="text-xs text-gray-500 mt-1">/ 100</span>
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-36 h-36 rounded-full bg-gray-200" />
        <div className="h-6 w-24 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-2 mt-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-40 mt-4" />
    </div>
  );
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function RiskScoreDisplay({
  score,
  findings = [],
  lastUpdated,
  className,
  isLoading = false,
}: RiskScoreDisplayProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const level = getRiskLevel(clampedScore);
  const colors = getRiskColors(level);

  const sortedFindings = [...findings].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-200 shadow-sm p-6",
        className,
      )}
    >
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Risk Score</h2>
            <span
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                colors.badge,
              )}
            >
              {level}
            </span>
          </div>

          {/* Score Circle */}
          <div className="flex flex-col items-center gap-2">
            <CircularProgress score={clampedScore} level={level} />

            {/* Score Bar */}
            <div className="w-full mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>0</span>
                <span>Risk Score</span>
                <span>100</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    colors.bar,
                  )}
                  style={{ width: `${clampedScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Key Findings */}
          {sortedFindings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Key Findings
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  {sortedFindings.length}
                </span>
              </h3>
              <ul className="space-y-2">
                {sortedFindings.map((finding) => {
                  const sc = getSeverityColors(finding.severity);
                  return (
                    <li
                      key={finding.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <span
                        className={cn(
                          "mt-1.5 flex-shrink-0 w-2 h-2 rounded-full",
                          sc.dot,
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-snug">
                          {finding.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize",
                          sc.badge,
                        )}
                      >
                        {finding.severity}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {sortedFindings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <svg
                className="w-10 h-10 text-green-400 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <p className="text-sm text-gray-500">No findings detected</p>
            </div>
          )}

          {/* Last Updated */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
            <svg
              className="w-3.5 h-3.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs text-gray-400">
              Last updated:{" "}
              <time
                dateTime={
                  lastUpdated
                    ? typeof lastUpdated === "string"
                      ? lastUpdated
                      : lastUpdated.toISOString()
                    : undefined
                }
                className="font-medium text-gray-500"
              >
                {formatDate(lastUpdated)}
              </time>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
