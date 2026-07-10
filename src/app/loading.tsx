export default function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-6"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  );
}
