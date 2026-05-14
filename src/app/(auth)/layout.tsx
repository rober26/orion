export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-3xl border border-orion-border bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 p-8 shadow-sm lg:block dark:border-orion-dark-border dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">Orion Workspace</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white">Organiza proyectos, notas y calendario en un solo lugar.</h1>
            <p className="mt-4 max-w-xl text-sm text-slate-600 dark:text-slate-300">Disena tu dia de trabajo con paneles claros, navegacion rapida y una estructura consistente para todo el equipo.</p>
          </section>

          <div className="w-full max-w-md justify-self-center">
            <div className="mb-6 text-center">
              <h1 className="text-4xl font-black tracking-tighter text-blue-600 dark:text-blue-400">ORION</h1>
            </div>
            <div className="surface-panel rounded-3xl p-8 shadow-xl">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
