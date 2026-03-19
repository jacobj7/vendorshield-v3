import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const RequestSchema = z.object({
  notes: z.string().optional(),
});

interface VendorRow {
  id: string;
  name: string;
  email: string;
  company: string;
  website: string | null;
  description: string | null;
  credentials: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

interface ReviewRow {
  id: string;
  vendor_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  status: string;
  created_at: Date;
}

interface RiskScoreRow {
  id: string;
  vendor_id: string;
  score: number;
  risk_level: string;
  assessment: string;
  factors: Record<string, unknown>;
  notes: string | null;
  created_at: Date;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { vendor_id: string } },
) {
  const client = await pool.connect();

  try {
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

    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { notes } = parseResult.data;

    // Fetch vendor details
    const vendorResult = await client.query<VendorRow>(
      `SELECT id, name, email, company, website, description, credentials, created_at, updated_at
       FROM vendors
       WHERE id = $1`,
      [vendor_id],
    );

    if (vendorResult.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const vendor = vendorResult.rows[0];

    // Fetch review history
    const reviewsResult = await client.query<ReviewRow>(
      `SELECT id, vendor_id, reviewer_id, rating, comment, status, created_at
       FROM vendor_reviews
       WHERE vendor_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [vendor_id],
    );

    const reviews = reviewsResult.rows;

    // Calculate review statistics
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : null;
    const statusCounts = reviews.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    // Build prompt for Anthropic
    const vendorInfo = `
Vendor Information:
- Name: ${vendor.name}
- Company: ${vendor.company}
- Email: ${vendor.email}
- Website: ${vendor.website || "Not provided"}
- Description: ${vendor.description || "Not provided"}
- Member since: ${vendor.created_at.toISOString()}
- Credentials: ${vendor.credentials ? JSON.stringify(vendor.credentials, null, 2) : "None provided"}

Review History Summary:
- Total reviews: ${totalReviews}
- Average rating: ${averageRating !== null ? averageRating.toFixed(2) : "No reviews"}
- Status breakdown: ${JSON.stringify(statusCounts)}

Recent Reviews (last ${Math.min(totalReviews, 10)}):
${reviews
  .slice(0, 10)
  .map(
    (r) =>
      `- Rating: ${r.rating}/5, Status: ${r.status}, Comment: ${r.comment || "No comment"}, Date: ${r.created_at.toISOString()}`,
  )
  .join("\n")}

${notes ? `Additional Notes: ${notes}` : ""}
`;

    const prompt = `You are a vendor risk assessment specialist. Analyze the following vendor information and provide a comprehensive risk assessment.

${vendorInfo}

Please provide a risk assessment in the following JSON format:
{
  "score": <number between 0-100, where 0 is lowest risk and 100 is highest risk>,
  "risk_level": <"low" | "medium" | "high" | "critical">,
  "assessment": <detailed assessment text explaining the risk evaluation>,
  "factors": {
    "credential_completeness": <score 0-10>,
    "review_sentiment": <score 0-10>,
    "review_volume": <score 0-10>,
    "account_age": <score 0-10>,
    "compliance_status": <score 0-10>,
    "key_risks": [<list of identified risk factors>],
    "positive_indicators": [<list of positive indicators>]
  }
}

Respond ONLY with the JSON object, no additional text.`;

    // Call Anthropic API
    const anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropicClient.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format from AI" },
        { status: 500 },
      );
    }

    let riskAssessment: {
      score: number;
      risk_level: string;
      assessment: string;
      factors: Record<string, unknown>;
    };

    try {
      riskAssessment = JSON.parse(responseContent.text);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: responseContent.text },
        { status: 500 },
      );
    }

    // Validate the parsed response
    const RiskAssessmentSchema = z.object({
      score: z.number().min(0).max(100),
      risk_level: z.enum(["low", "medium", "high", "critical"]),
      assessment: z.string(),
      factors: z.record(z.unknown()),
    });

    const validationResult = RiskAssessmentSchema.safeParse(riskAssessment);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid AI response structure",
          details: validationResult.error.flatten(),
        },
        { status: 500 },
      );
    }

    const validatedAssessment = validationResult.data;

    // Store result in risk_scores table
    const insertResult = await client.query<RiskScoreRow>(
      `INSERT INTO risk_scores (vendor_id, score, risk_level, assessment, factors, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, vendor_id, score, risk_level, assessment, factors, notes, created_at`,
      [
        vendor_id,
        validatedAssessment.score,
        validatedAssessment.risk_level,
        validatedAssessment.assessment,
        JSON.stringify(validatedAssessment.factors),
        notes || null,
      ],
    );

    const savedRiskScore = insertResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          risk_score: savedRiskScore,
          vendor: {
            id: vendor.id,
            name: vendor.name,
            company: vendor.company,
          },
          review_summary: {
            total_reviews: totalReviews,
            average_rating: averageRating,
            status_breakdown: statusCounts,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error generating risk score:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
