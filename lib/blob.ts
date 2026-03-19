import { put } from "@vercel/blob";

export async function uploadCredentialFile(
  file: File | Blob,
  filename: string,
  options?: {
    access?: "public" | "private";
    contentType?: string;
  },
): Promise<string> {
  const { access = "public", contentType } = options ?? {};

  const blob = await put(filename, file, {
    access,
    contentType: contentType ?? (file instanceof File ? file.type : undefined),
  });

  return blob.url;
}
