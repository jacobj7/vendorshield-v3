import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const credentialsSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      "SELECT id, key, created_at FROM vendor_credentials WHERE vendor_id = $1",
      [params.vendor_id],
    );
    return NextResponse.json({ credentials: result.rows });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = credentialsSchema.parse(body);

    const result = await pool.query(
      "INSERT INTO vendor_credentials (vendor_id, key, value) VALUES ($1, $2, $3) RETURNING id, key, created_at",
      [params.vendor_id, validated.key, validated.value],
    );
    return NextResponse.json({ credential: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating credential:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("id");

    if (!credentialId) {
      return NextResponse.json(
        { error: "Credential ID required" },
        { status: 400 },
      );
    }

    await pool.query(
      "DELETE FROM vendor_credentials WHERE id = $1 AND vendor_id = $2",
      [credentialId, params.vendor_id],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
