/**
 * LandingPage – Setu development foundation page.
 *
 * This is the minimal starting point for the Setu platform.
 * No authentication, merchant features or dashboard have been built yet.
 * Those are separate tasks.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-setu-bg flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-setu-border bg-setu-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-setu-primary text-white font-bold text-lg select-none">
            S
          </span>
          <span className="text-xl font-semibold text-setu-text tracking-tight">
            Setu
          </span>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full text-center space-y-6">
          {/* Badge */}
          <span className="inline-block px-3 py-1 rounded-full bg-setu-primary-lt text-setu-primary text-sm font-medium">
            Foundation · Task 1
          </span>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-bold text-setu-text leading-tight">
            Multi-Merchant{" "}
            <span className="text-setu-primary">Shop Management</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-setu-muted leading-relaxed">
            Setu is a production-minded platform that helps merchants manage
            their shops, inventory, sales and reports — all in one place. This
            page confirms the project foundation is set up correctly.
          </p>

          {/* Stack pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["React 18", "Vite", "TypeScript", "Tailwind CSS", "Express", "Node.js", "Supabase (coming soon)"].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 rounded-md bg-setu-card border border-setu-border text-setu-muted text-sm"
                >
                  {tech}
                </span>
              )
            )}
          </div>

          {/* API status indicator */}
          <ApiStatusBadge />
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-setu-border py-5">
        <p className="text-center text-setu-muted text-sm">
          © {new Date().getFullYear()} Setu — development build
        </p>
      </footer>
    </div>
  );
}

/** Fetches the API health endpoint and displays current status. */
function ApiStatusBadge() {
  return (
    <div className="mt-4 flex justify-center">
      <a
        href="/api/v1/health"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-setu-border bg-setu-card text-setu-muted text-sm hover:border-setu-primary hover:text-setu-primary transition-colors duration-150"
      >
        <span className="w-2 h-2 rounded-full bg-setu-primary animate-pulse" />
        Check API health →
      </a>
    </div>
  );
}
