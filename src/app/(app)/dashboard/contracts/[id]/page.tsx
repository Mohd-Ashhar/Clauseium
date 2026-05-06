// TODO: deprecate. This route renders the legacy 3-pane workspace which
// still reads from `@/lib/mock-data` and uses the mock chat panel. The
// canonical, live-data review surface is `/dashboard/uploads/[id]`. Do
// not extend this route — wire any new affordances onto the uploads page.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewWorkspace } from "@/components/review/review-workspace";
import { contracts } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Contract review",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractReviewPage({ params }: PageProps) {
  const { id } = await params;
  const contract = contracts.find((c) => c.id === id);
  if (!contract) notFound();
  return <ReviewWorkspace contract={contract} />;
}
