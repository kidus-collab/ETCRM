export function StatCard({ label, value, tone = "default" }) {
  const tones = {
    default: "border-line bg-white",
    forest: "border-forest/20 bg-forest text-white",
    coral: "border-coral/20 bg-coral text-white",
    gold: "border-gold/20 bg-gold text-white"
  };

  return (
    <div className={`rounded-lg border p-4 shadow-soft ${tones[tone]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
