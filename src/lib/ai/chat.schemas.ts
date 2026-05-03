import { z } from "zod";

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 8_000;

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
});

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
    clause_id: z.string().uuid().optional(),
  })
  .refine((v) => v.messages[v.messages.length - 1].role === "user", {
    message: "the last message must be from the user",
    path: ["messages"],
  });

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
