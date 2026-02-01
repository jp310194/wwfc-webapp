"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return router.push("/login");
      const uid = sess.session.user.id;
      setUserId(uid);

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", uid)
        .single();

      if (error) return alert(error.message);
      setName(prof?.name ?? "");
      setAvatarUrl(prof?.avatar_url ?? "");
    })();
  }, [router]);

  async function saveName() {
    const { error } = await supabase.from("profiles").update({ name }).eq("id", userId);
    if (error) alert(error.message);
    else alert("Name saved");
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return alert("Please upload an image file.");
    if (file.size > 3 * 1024 * 1024) return alert("Max size is 3MB.");

    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (dbErr) throw dbErr;

      setAvatarUrl(publicUrl);
      alert("Profile photo updated!");
    } catch (err: any) {
      alert(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>My Profile</h1>

      <section style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Profile Photo</h2>

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            style={{ width: 120, height: 120, borderRadius: 999, objectFit: "cover", border: "1px solid #ddd" }}
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              border: "1px dashed #bbb",
              display: "grid",
              placeItems: "center",
            }}
          >
            No photo
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <input type="file" accept="image/*" onChange={onFileChange} disabled={uploading} />
        </div>
        <div style={{ opacity: 0.7, marginTop: 6 }}>JPG/PNG/WebP up to 3MB.</div>
      </section>

      <section style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Name</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 10, width: "100%" }} />
        <button onClick={saveName} style={{ marginTop: 10, padding: 10 }}>
          Save name
        </button>
      </section>
    </main>
  );
}
