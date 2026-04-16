function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`} />;
}

export default function DashboardSkeleton() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex h-full w-full max-w-[1800px] flex-col gap-4 p-3 sm:gap-5 sm:p-4 lg:p-5">
        <Pulse className="h-40" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Pulse className="h-28" />
          <Pulse className="h-28" />
          <Pulse className="h-28" />
          <Pulse className="h-28" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr] 2xl:grid-cols-[1.45fr_1fr_1fr]">
          <Pulse className="h-[26rem]" />
          <div className="grid gap-4">
            <Pulse className="h-52" />
            <Pulse className="h-44" />
            <Pulse className="h-28" />
          </div>
          <Pulse className="hidden 2xl:block h-[26rem]" />
        </div>
      </div>
    </div>
  );
}
