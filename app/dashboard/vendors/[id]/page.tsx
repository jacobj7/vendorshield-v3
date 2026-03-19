import PageClient from "./PageClient";
import { db } from "@/lib/db";

export default async function VendorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let vendor = null;
  try {
    const result = await db.query("SELECT * FROM vendors WHERE id = $1", [
      params.id,
    ]);
    vendor = result.rows[0] ?? null;
  } catch {
    vendor = null;
  }

  return <PageClient vendor={vendor} />;
}
