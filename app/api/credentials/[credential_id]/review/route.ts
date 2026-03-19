import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  notes: z.string().optional().default(""),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { credential_id: string } },
) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { credential_id } = params;

  if (!credential_id) {
    return NextResponse.json(
      { error: "credential_id is required" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = reviewSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { status, notes } = parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const credentialCheck = await client.query(
      "SELECT id, status FROM credentials WHERE id = $1",
      [credential_id],
    );

    if (credentialCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 },
      );
    }

    const previousStatus = credentialCheck.rows[0].status;

    const updatedCredential = await client.query(
      `UPDATE credentials
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, credential_id],
    );

    const reviewerEmail = session.user.email ?? "unknown";
    const reviewerName = session.user.name ?? reviewerEmail;

    await client.query(
      `INSERT INTO review_actions (credential_id, reviewer_email, reviewer_name, status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [credential_id, reviewerEmail, reviewerName, status, notes],
    );

    await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_email, actor_name, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        "credential",
        credential_id,
        "review",
        reviewerEmail,
        reviewerName,
        JSON.stringify({
          previous_status: previousStatus,
          new_status: status,
          notes,
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Credential reviewed successfully",
        credential: updatedCredential.rows[0],
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error reviewing credential:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
