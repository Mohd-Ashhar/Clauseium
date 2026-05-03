"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadDialog } from "./upload-dialog";

interface UploadButtonProps {
  variant?: "primary" | "ghost";
  label?: string;
  className?: string;
}

export function UploadButton({
  variant = "primary",
  label = "Upload a contract",
  className,
}: UploadButtonProps) {
  const { open } = useUploadDialog();

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors",
        variant === "primary"
          ? "bg-brand-500 hover:bg-brand-600 text-white"
          : "text-ink-300 hover:text-ink-100 hover:bg-ink-800",
        className,
      )}
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
