"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) router.push("/");
    else alert(error.message);
  }

  async function signup() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (!error) alert("Check your email to confirm signup");
    else alert(error.message);
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>WWFC Login</h1>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button onClick={login}>Log In</button>
      <button onClick={signup}>Sign Up</button>
    </main>
  );
}
