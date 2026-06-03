import { Check, Minus } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

type Cell = boolean | "partial" | string;

const columns = ["Clauseium", "Generic AI tools", "Manual review"] as const;

const rows: { feature: string; values: [Cell, Cell, Cell] }[] = [
  {
    feature: "Native Indian-statute corpus (Contract Act, IT Act, DPDP, FEMA…)",
    values: [true, false, "Counsel's own research"],
  },
  {
    feature: "Citations verified against the corpus",
    values: [true, "partial", true],
  },
  {
    feature: "DPDP-compliant retention + separable consent",
    values: [true, false, "N/A"],
  },
  {
    feature: "Zero data retention with LLM providers",
    values: [true, "partial", "N/A"],
  },
  {
    feature: "Tracked-changes Word export into the original .docx",
    values: [true, false, true],
  },
  {
    feature: "Turnaround on a 40-page MSA",
    values: ["~6 min", "Varies", "4+ hours"],
  },
];

function CellView({ value }: { value: Cell }) {
  if (value === true)
    return <Check className="mx-auto h-4 w-4 text-risk-low" aria-label="Yes" />;
  if (value === false)
    return (
      <Minus className="mx-auto h-4 w-4 text-paper-400" aria-label="No" />
    );
  if (value === "partial")
    return (
      <span className="text-[12px] font-medium text-risk-med">Partial</span>
    );
  return <span className="text-[12.5px] text-paper-900/70">{value}</span>;
}

export function MoatsComparison() {
  return (
    <section className="bg-paper-100 py-16 md:py-24">
      <div className="mx-auto max-w-[1240px] px-6">
        <SectionHeading
          eyebrow="Why Clauseium"
          title="Built for Indian law — not adapted to it"
          description="The moats that matter when you're reviewing Indian commercial contracts."
        />
        <div className="mt-10 overflow-hidden rounded-2xl border border-paper-200 bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-paper-200">
                <th className="px-5 py-4 text-[12px] font-medium uppercase tracking-[0.12em] text-paper-600">
                  Capability
                </th>
                {columns.map((c, i) => (
                  <th
                    key={c}
                    className={
                      "px-5 py-4 text-center text-[13px] font-semibold " +
                      (i === 0
                        ? "bg-counsel-50 text-counsel-600"
                        : "text-paper-900/70")
                    }
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-paper-200 last:border-0"
                >
                  <td className="px-5 py-4 text-[13.5px] text-paper-900">
                    {row.feature}
                  </td>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={
                        "px-5 py-4 text-center " +
                        (i === 0 ? "bg-counsel-50/40" : "")
                      }
                    >
                      <CellView value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-[12px] text-paper-900/45">
          Comparison reflects Clauseium&apos;s India-specific capabilities; generic
          tool behavior varies by vendor.
        </p>
      </div>
    </section>
  );
}
