import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-page">
      <div className="app-section">
        <h1 className="app-title">Page not found</h1>
        <p className="app-subtitle" style={{ opacity: 0.8 }}>
          That route doesn’t exist.
        </p>

        <div style={{ marginTop: 16 }}>
          <Link className="app-link" href="/">
            Go home →
          </Link>
        </div>
      </div>
    </div>
  );
}
