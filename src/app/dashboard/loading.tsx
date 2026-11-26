export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-24 rounded-3xl bg-white/[0.03] border border-white/10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/10" />
        <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/10" />
        <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/10" />
        <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/10" />
      </div>
      <div className="h-64 rounded-3xl bg-white/[0.02] border border-white/10" />
    </div>
  );
}
