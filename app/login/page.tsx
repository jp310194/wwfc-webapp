"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit() {
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return alert(error.message);
      alert("Signed up. If email confirmation is on, check your inbox.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    router.push("/");
  }

  return (
    <main style={{ padding: 20, maxWidth: 420, margin: "0 auto" }}>
      <h1>Wiseman West Football Club</h1>
      <h2>{mode === "login" ? "Log in" : "Sign up"}</h2>

      {mode === "signup" && (
        <input
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}

      <input
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button style={{ width: "100%", padding: 10 }} onClick={onSubmit}>
        {mode === "login" ? "Log in" : "Create account"}
      </button>

      <button
        style={{ marginTop: 12, width: "100%", padding: 10 }}
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        Switch to {mode === "login" ? "Sign up" : "Log in"}
      </button>
    </main>
  );
}
