import { Check, Minus } from "lucide-react";

export interface ComparisonRow {
  feature: string;
  clauseium: string | boolean;
  competitor: string | boolean;
}

export function ComparisonTable({
  rows,
  competitorName,
}: {
  rows: ComparisonRow[];
  competitorName: string;
}) {
  return (
    <div className="not-prose my-10 overflow-x-auto rounded-2xl border border-paper-200 bg-white">
      <table className="w-full text-left text-[14px]">
        <thead>
          <tr className="border-b border-paper-200 bg-paper-100">
            <th className="px-6 py-4 text-[11px] uppercase tracking-[0.14em] text-paper-600">
              Feature
            </th>
            <th className="border-x border-counsel-200 bg-counsel-50/40 px-6 py-4 text-center font-display text-[15px] font-semibold text-counsel-600">
              Clauseium
            </th>
            <th className="px-6 py-4 text-center font-display text-[15px] font-semibold text-paper-900">
              {competitorName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.feature}
              className="border-b border-paper-200 last:border-b-0"
            >
              <td className="px-6 py-3.5 font-medium text-paper-900">
                {row.feature}
              </td>
              <Cell value={row.clauseium} highlighted />
              <Cell value={row.competitor} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  value,
  highlighted = false,
}: {
  value: string | boolean;
  highlighted?: boolean;
}) {
  const cellClass = highlighted
    ? "border-x border-counsel-200 bg-counsel-50/40"
    : "";

  if (typeof value === "boolean") {
    return (
      <td className={`px-6 py-3.5 text-center ${cellClass}`}>
        {value ? (
          <Check
            className="mx-auto h-4 w-4 text-counsel-600"
            aria-label="Yes"
          />
        ) : (
          <Minus
            className="mx-auto h-4 w-4 text-paper-400"
            aria-label="No"
          />
        )}
      </td>
    );
  }
  return (
    <td className={`px-6 py-3.5 text-center text-paper-900/80 ${cellClass}`}>
      {value}
    </td>
  );
}
