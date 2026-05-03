import { z } from "zod";
import { MAX_FILE_BYTES, SUPPORTED_MIME_TYPES } from "@/types/ingestion";

export const uploadFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(240),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(SUPPORTED_MIME_TYPES, {
    message: "Only PDF and DOCX are supported.",
  }),
  size: z
    .number()
    .int()
    .positive("File is empty.")
    .max(MAX_FILE_BYTES, "File exceeds 25 MB limit."),
});

export type UploadFormInput = z.infer<typeof uploadFormSchema>;

const clauseSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  position: z.number().int().nonnegative(),
});

const sectionSchema = z.object({
  title: z.string().min(1),
  clauses: z.array(clauseSchema),
});

export const structuredDocumentSchema = z.object({
  sections: z.array(sectionSchema),
});
