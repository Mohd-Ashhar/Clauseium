import type { Metadata } from "next";
import {
  buildPillarMetadata,
  renderPillarPage,
} from "@/components/resources/pillar-page";

const SLUG = "ai-contract-review-india";

export const dynamic = "force-static";

export function generateMetadata(): Promise<Metadata> {
  return buildPillarMetadata(SLUG);
}

export default function Page() {
  return renderPillarPage(SLUG);
}
