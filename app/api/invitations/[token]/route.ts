import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const tokenSchema = z.string().min(1).max(500);

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const tokenValidation = tokenSchema.safeParse(params.token);
    if (!tokenValidation.success) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 },
      );
    }

    const token = tokenValidation.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          i.id,
          i.token,
          i.vendor_id,
          i.email,
          i.role,
          i.status,
          i.expires_at,
          i.created_at,
          i.invited_by,
          v.name AS vendor_name,
          v.slug AS vendor_slug
        FROM invitations i
        LEFT JOIN vendors v ON v.id = i.vendor_id
        WHERE i.token = $1`,
        [token],
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 },
        );
      }

      const invitation = result.rows[0];

      if (invitation.status !== "pending") {
        return NextResponse.json(
          { error: `Invitation has already been ${invitation.status}` },
          { status: 410 },
        );
      }

      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < now) {
        return NextResponse.json(
          { error: "Invitation has expired" },
          { status: 410 },
        );
      }

      return NextResponse.json({
        valid: true,
        invitation: {
          id: invitation.id,
          token: invitation.token,
          vendor_id: invitation.vendor_id,
          vendor_name: invitation.vendor_name,
          vendor_slug: invitation.vendor_slug,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          invited_by: invitation.invited_by,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error validating invitation token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
