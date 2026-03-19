import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const credentialsSchema = z.object({
  api_key: z.string().min(1),
  api_secret: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vendor_id } = params;

  return NextResponse.json({ vendor_id, message: "Credentials endpoint" });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vendor_id } = params;

  try {
    const body = await request.json();
    const validated = credentialsSchema.parse(body);

    return NextResponse.json({ vendor_id, ...validated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
