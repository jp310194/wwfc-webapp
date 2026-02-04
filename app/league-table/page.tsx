"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main style={{ padding: 20 }}>
      <h1>Wiseman West FC</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 20, maxWidth: 420 }}>
        <button
          onClick={() => router.push("/fixtures")}
          style={tileStyle}
        >
          Fixtures
        </button>

        <button
          onClick={() => router.push("/players")}
          style={tileStyle}
        >
          Players
        </button>

        <button
          onClick={() => router.push("/performance")}
          style={tileStyle}
        >
          Performance
        </button>

        <button
          onClick={() => router.push("/league-table")}
          style={tileStyle}
        >
          League Table
        </button>
      </div>
    </main>
  );
}

const tileStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid #111",
  background: "#111",
  color: "white",
  fontSize: 16,
  cursor: "pointer",
};
