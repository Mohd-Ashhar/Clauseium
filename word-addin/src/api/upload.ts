import { apiFetch } from "./client";

// POST /api/contracts/upload — multipart form with the .docx blob.
// The backend returns 202 with { contractId, status: "queued" } and kicks
// the processing pipeline via after(). Client then polls /status.

export interface UploadInput {
  blob: Blob;
  filename: string;
  accessToken: string;
}

export interface UploadResponse {
  contractId: string;
  status: "queued";
}

export async function uploadContract({
  blob,
  filename,
  accessToken,
}: UploadInput): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", blob, filename);
  // The backend defaults to the filename if title is missing, but we send
  // it explicitly so the dashboard shows a stable, human-readable title.
  form.append("title", filename.replace(/\.docx$/i, ""));

  const response = await apiFetch(
    "/api/contracts/upload",
    {
      method: "POST",
      body: form,
      // Don't set Content-Type — the browser must set it to
      // "multipart/form-data; boundary=…" with the right boundary token.
    },
    accessToken,
  );

  return (await response.json()) as UploadResponse;
}
