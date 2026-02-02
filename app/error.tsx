"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-page">
      <div className="app-section">
        <h1 className="app-title">Something went wrong</h1>
        <p className="app-subtitle" style={{ opacity: 0.8 }}>
          {error?.message ?? "An unexpected error occurred."}
        </p>

        <button
          onClick={() => reset()}
          className="app-tile"
          style={{ marginTop: 16, maxWidth: 240, textAlign: "center" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
