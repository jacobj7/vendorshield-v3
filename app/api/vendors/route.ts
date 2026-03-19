import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CreateVendorSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  contact_email: z.string().email().optional(),
  contact_name: z.string().max(255).optional(),
  website: z.string().url().optional(),
  description: z.string().optional(),
  risk_level: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .default("medium"),
});

function computeComplianceHealth(vendor: {
  risk_score: number | null;
  credentials_count: number;
  valid_credentials_count: number;
  expired_credentials_count: number;
  risk_level: string;
}): {
  status: "healthy" | "warning" | "critical" | "unknown";
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  if (vendor.credentials_count === 0) {
    return {
      status: "unknown",
      score: 0,
      issues: ["No credentials on file"],
    };
  }

  if (vendor.expired_credentials_count > 0) {
    const expiredRatio =
      vendor.expired_credentials_count / vendor.credentials_count;
    score -= Math.round(expiredRatio * 40);
    issues.push(`${vendor.expired_credentials_count} expired credential(s)`);
  }

  if (vendor.risk_score !== null) {
    if (vendor.risk_score > 80) {
      score -= 30;
      issues.push("High risk score");
    } else if (vendor.risk_score > 60) {
      score -= 15;
      issues.push("Elevated risk score");
    } else if (vendor.risk_score > 40) {
      score -= 5;
    }
  }

  if (vendor.risk_level === "critical") {
    score -= 20;
    issues.push("Critical risk level");
  } else if (vendor.risk_level === "high") {
    score -= 10;
    issues.push("High risk level");
  }

  const validRatio =
    vendor.credentials_count > 0
      ? vendor.valid_credentials_count / vendor.credentials_count
      : 0;

  if (validRatio < 0.5) {
    score -= 20;
    issues.push("Less than 50% of credentials are valid");
  } else if (validRatio < 0.8) {
    score -= 10;
    issues.push("Less than 80% of credentials are valid");
  }

  score = Math.max(0, Math.min(100, score));

  let status: "healthy" | "warning" | "critical" | "unknown";
  if (score >= 80) {
    status = "healthy";
  } else if (score >= 50) {
    status = "warning";
  } else {
    status = "critical";
  }

  return { status, score, issues };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const riskLevel = searchParams.get("risk_level");
    const search = searchParams.get("search");

    const client = await pool.connect();
    try {
      let query = `
        SELECT
          v.id,
          v.name,
          v.category,
          v.contact_email,
          v.contact_name,
          v.website,
          v.description,
          v.risk_level,
          v.risk_score,
          v.created_at,
          v.updated_at,
          COUNT(vc.id)::int AS credentials_count,
          COUNT(CASE WHEN vc.status = 'valid' AND (vc.expires_at IS NULL OR vc.expires_at > NOW()) THEN 1 END)::int AS valid_credentials_count,
          COUNT(CASE WHEN vc.expires_at IS NOT NULL AND vc.expires_at <= NOW() THEN 1 END)::int AS expired_credentials_count
        FROM vendors v
        LEFT JOIN vendor_credentials vc ON vc.vendor_id = v.id
        WHERE 1=1
      `;

      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND v.category = $${paramIndex++}`;
        params.push(category);
      }

      if (riskLevel) {
        query += ` AND v.risk_level = $${paramIndex++}`;
        params.push(riskLevel);
      }

      if (search) {
        query += ` AND (v.name ILIKE $${paramIndex} OR v.description ILIKE $${paramIndex} OR v.contact_email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` GROUP BY v.id ORDER BY v.name ASC`;

      const result = await client.query(query, params);

      const vendors = result.rows.map((row) => {
        const complianceHealth = computeComplianceHealth({
          risk_score: row.risk_score,
          credentials_count: row.credentials_count,
          valid_credentials_count: row.valid_credentials_count,
          expired_credentials_count: row.expired_credentials_count,
          risk_level: row.risk_level,
        });

        return {
          id: row.id,
          name: row.name,
          category: row.category,
          contact_email: row.contact_email,
          contact_name: row.contact_name,
          website: row.website,
          description: row.description,
          risk_level: row.risk_level,
          risk_score: row.risk_score,
          credentials_count: row.credentials_count,
          valid_credentials_count: row.valid_credentials_count,
          expired_credentials_count: row.expired_credentials_count,
          compliance_health: complianceHealth,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      });

      return NextResponse.json({ vendors, total: vendors.length });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/vendors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = CreateVendorSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const data = parseResult.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO vendors (name, category, contact_email, contact_name, website, description, risk_level, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          data.name,
          data.category,
          data.contact_email ?? null,
          data.contact_name ?? null,
          data.website ?? null,
          data.description ?? null,
          data.risk_level,
        ],
      );

      const vendor = result.rows[0];

      const complianceHealth = computeComplianceHealth({
        risk_score: vendor.risk_score,
        credentials_count: 0,
        valid_credentials_count: 0,
        expired_credentials_count: 0,
        risk_level: vendor.risk_level,
      });

      return NextResponse.json(
        {
          vendor: {
            ...vendor,
            credentials_count: 0,
            valid_credentials_count: 0,
            expired_credentials_count: 0,
            compliance_health: complianceHealth,
          },
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/vendors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
