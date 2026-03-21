export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          {/* Aquí irá tu logo Orion */}
          <h1 className="text-4xl font-bold tracking-tighter text-blue-600 dark:text-blue-400">
            ORION
          </h1>
        </div>
        <div className="surface-panel shadow-xl rounded-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
