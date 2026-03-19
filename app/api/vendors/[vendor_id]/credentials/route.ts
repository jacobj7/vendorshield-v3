import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const credentialSchema = z.object({
  credential_type: z.string().min(1, "Credential type is required"),
  expiry_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendor_id } = params;

    if (!vendor_id || isNaN(Number(vendor_id))) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    const vendorResult = await query("SELECT id FROM vendors WHERE id = $1", [
      vendor_id,
    ]);

    if (vendorResult.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const formData = await request.formData();

    const credential_type = formData.get("credential_type") as string | null;
    const expiry_date = formData.get("expiry_date") as string | null;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("file") as File | null;

    const validationResult = credentialSchema.safeParse({
      credential_type,
      expiry_date: expiry_date || null,
      notes: notes || null,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;

    let file_url: string | null = null;
    let file_name: string | null = null;
    let file_size: number | null = null;
    let file_type: string | null = null;

    if (file && file.size > 0) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 10MB limit" },
          { status: 400 },
        );
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "File type not allowed" },
          { status: 400 },
        );
      }

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blobPath = `vendors/${vendor_id}/credentials/${timestamp}_${sanitizedFileName}`;

      const blob = await put(blobPath, file, {
        access: "public",
        contentType: file.type,
      });

      file_url = blob.url;
      file_name = file.name;
      file_size = file.size;
      file_type = file.type;
    }

    let parsedExpiryDate: string | null = null;
    if (validatedData.expiry_date) {
      const dateObj = new Date(validatedData.expiry_date);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiry date format" },
          { status: 400 },
        );
      }
      parsedExpiryDate = dateObj.toISOString().split("T")[0];
    }

    const insertResult = await query(
      `INSERT INTO vendor_credentials (
        vendor_id,
        credential_type,
        expiry_date,
        notes,
        file_url,
        file_name,
        file_size,
        file_type,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        Number(vendor_id),
        validatedData.credential_type,
        parsedExpiryDate,
        validatedData.notes || null,
        file_url,
        file_name,
        file_size,
        file_type,
      ],
    );

    const credential = insertResult.rows[0];

    return NextResponse.json(
      {
        message: "Credential created successfully",
        credential,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating vendor credential:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        return NextResponse.json(
          { error: "Database table not found. Please run migrations." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
