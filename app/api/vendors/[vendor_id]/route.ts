import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const paramsSchema = z.object({
  vendor_id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid vendor_id", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { vendor_id } = parsed.data;

    const client = await pool.connect();
    try {
      const vendorResult = await client.query(
        `SELECT
          v.id,
          v.name,
          v.description,
          v.website,
          v.contact_email,
          v.contact_phone,
          v.address,
          v.category,
          v.status,
          v.created_at,
          v.updated_at
        FROM vendors v
        WHERE v.id = $1`,
        [vendor_id],
      );

      if (vendorResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 },
        );
      }

      const vendor = vendorResult.rows[0];

      const credentialsResult = await client.query(
        `SELECT
          vc.id,
          vc.credential_type,
          vc.credential_name,
          vc.issuer,
          vc.issued_at,
          vc.expires_at,
          vc.status,
          vc.document_url,
          vc.created_at,
          vc.updated_at
        FROM vendor_credentials vc
        WHERE vc.vendor_id = $1
        ORDER BY vc.created_at DESC`,
        [vendor_id],
      );

      const riskScoresResult = await client.query(
        `SELECT
          vrs.id,
          vrs.score_type,
          vrs.score_value,
          vrs.score_label,
          vrs.assessed_at,
          vrs.assessed_by,
          vrs.notes,
          vrs.created_at,
          vrs.updated_at
        FROM vendor_risk_scores vrs
        WHERE vrs.vendor_id = $1
        ORDER BY vrs.assessed_at DESC`,
        [vendor_id],
      );

      const alertsResult = await client.query(
        `SELECT
          va.id,
          va.alert_type,
          va.severity,
          va.title,
          va.message,
          va.is_read,
          va.resolved_at,
          va.created_at,
          va.updated_at
        FROM vendor_alerts va
        WHERE va.vendor_id = $1
        ORDER BY va.created_at DESC`,
        [vendor_id],
      );

      const response = {
        ...vendor,
        credentials: credentialsResult.rows,
        risk_scores: riskScoresResult.rows,
        alerts: alertsResult.rows,
      };

      return NextResponse.json(response, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
