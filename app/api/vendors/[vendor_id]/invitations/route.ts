import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const InvitationSchema = z.object({
  email: z.string().email().optional(),
  role: z.string().optional().default("member"),
  expires_in_hours: z.number().int().positive().optional().default(72),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendor_id } = params;

    if (!vendor_id) {
      return NextResponse.json(
        { error: "Vendor ID is required" },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parseResult = InvitationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { email, role, expires_in_hours } = parseResult.data;

    const client = await pool.connect();

    try {
      const vendorCheck = await client.query(
        "SELECT id FROM vendors WHERE id = $1",
        [vendor_id],
      );

      if (vendorCheck.rowCount === 0) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 },
        );
      }

      const token = randomBytes(32).toString("hex");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

      const userEmail = session.user.email;

      const result = await client.query(
        `INSERT INTO invitations (
          vendor_id,
          token,
          email,
          role,
          expires_at,
          created_by,
          created_at,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'pending')
        RETURNING id, vendor_id, token, email, role, expires_at, created_at, status`,
        [vendor_id, token, email || null, role, expiresAt, userEmail],
      );

      const invitation = result.rows[0];

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`;

      const invitationUrl = `${baseUrl}/invitations/accept?token=${token}`;

      return NextResponse.json(
        {
          invitation: {
            id: invitation.id,
            vendor_id: invitation.vendor_id,
            email: invitation.email,
            role: invitation.role,
            expires_at: invitation.expires_at,
            created_at: invitation.created_at,
            status: invitation.status,
          },
          invitation_url: invitationUrl,
          token,
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating invitation:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
