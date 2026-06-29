import { phaseLabels } from "../utils/format";

const styles = {
  NEW: "bg-sky-100 text-sky-800",
  CONTACTED: "bg-amber-100 text-amber-800",
  FOLLOW_UP: "bg-violet-100 text-violet-800",
  CLOSED_WON: "bg-emerald-100 text-emerald-800",
  CLOSED_LOST: "bg-rose-100 text-rose-800"
};

export function Badge({ phase }) {
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${styles[phase] || styles.NEW}`}>{phaseLabels[phase] || phase}</span>;
}
