"use client";

export interface PageClientProps {
  vendor: {
    id: string | number;
    name?: string;
    [key: string]: unknown;
  } | null;
}

export default function PageClient({ vendor }: PageClientProps) {
  if (!vendor) {
    return (
      <div>
        <h1>Vendor not found</h1>
      </div>
    );
  }

  return (
    <div>
      <h1>Vendor Detail</h1>
      <p>ID: {String(vendor.id)}</p>
      {vendor.name && <p>Name: {vendor.name}</p>}
    </div>
  );
}
