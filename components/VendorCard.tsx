import Link from "next/link";

interface VendorCardProps {
  id: string;
  name: string;
  category: string;
  complianceScore: number;
  credentialCount: number;
}

function getComplianceHealth(score: number): {
  label: string;
  color: string;
  bgColor: string;
  dotColor: string;
} {
  if (score >= 80) {
    return {
      label: "Healthy",
      color: "text-green-700",
      bgColor: "bg-green-100",
      dotColor: "bg-green-500",
    };
  } else if (score >= 50) {
    return {
      label: "At Risk",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
      dotColor: "bg-yellow-500",
    };
  } else {
    return {
      label: "Critical",
      color: "text-red-700",
      bgColor: "bg-red-100",
      dotColor: "bg-red-500",
    };
  }
}

export default function VendorCard({
  id,
  name,
  category,
  complianceScore,
  credentialCount,
}: VendorCardProps) {
  const health = getComplianceHealth(complianceScore);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {name}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{category}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${health.bgColor} ${health.color}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${health.dotColor}`}
            aria-hidden="true"
          />
          {health.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">
            Compliance Score
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  complianceScore >= 80
                    ? "bg-green-500"
                    : complianceScore >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, complianceScore))}%`,
                }}
              />
            </div>
            <span className="text-gray-700 font-semibold">
              {complianceScore}%
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">
            Credentials
          </span>
          <span className="text-gray-700 font-semibold">{credentialCount}</span>
        </div>
      </div>

      <Link
        href={`/vendors/${id}`}
        className="mt-auto inline-flex items-center justify-center w-full px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors duration-150"
      >
        View Details
        <svg
          className="ml-1.5 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </div>
  );
}
