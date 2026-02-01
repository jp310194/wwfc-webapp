"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Post = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  profiles?: { name: string } | null;
};

function renderMentions(text: string) {
  // Highlights @mentions (simple: any @word)
  const parts = text.split(/(\@[A-Za-z0-9_]+)/g);
  return parts.map((p, i) => {
    if (/^\@[A-Za-z0-9_]+$/.test(p)) {
      return (
        <span key={i} style={{ fontWeight: 800, color: "#0a66c2" }}>
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export default function ForumPage() {
  const router = useRouter();
  const [role, setRole] = useState<"player" | "admin">("player");
  const isAdmin = role === "admin";

  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [imageUploading, setImageUploading] = useState(false);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string>("");

  async function loadRoleAndPosts() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.push("/login");
    const uid = sess.session.user.id;

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();

    if (profErr) alert(profErr.message);
    setRole((prof?.role ?? "player") as any);

    const { data, error } = await supabase
      .from("forum_posts")
      .select("id,title,body,pinned,created_at, profiles(name)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return alert(error.message);
    setPosts((data ?? []) as any);
  }

  useEffect(() => {
    loadRoleAndPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return alert("Please upload an image file.");
    if (file.size > 4 * 1024 * 1024) return alert("Max size is 4MB.");

    setImageUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return router.push("/login");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("forum-images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("forum-images").getPublicUrl(path);
      setAttachedImageUrl(data.publicUrl);
    } catch (e: any) {
      alert(e.message ?? "Upload failed");
    } finally {
      setImageUploading(false);
    }
  }

  async function createPost() {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return router.push("/login");

    if (!title.trim() || !body.trim()) return alert("Please add a title and message.");

    const finalBody =
      attachedImageUrl
        ? `${body.trim()}\n\n[image]${attachedImageUrl}[/image]`
        : body.trim();

    const { error } = await supabase.from("forum_posts").insert({
      author_id: uid,
      title: title.trim(),
      body: finalBody,
    });

    if (error) return alert(error.message);

    setTitle("");
    setBody("");
    setAttachedImageUrl("");
    await loadRoleAndPosts();
  }

  async function togglePin(postId: string, current: boolean) {
    const { error } = await supabase.from("forum_posts").update({ pinned: !current }).eq("id", postId);
    if (error) return alert(error.message);
    await loadRoleAndPosts();
  }

  async function deletePost(postId: string) {
    if (!confirm("Delete this post (and its comments)?")) return;
    const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
    if (error) return alert(error.message);
    await loadRoleAndPosts();
  }

  const parsedPosts = useMemo(() => {
    return posts.map((p) => {
      const imgMatch = p.body.match(/\[image\](.*?)\[\/image\]/);
      const imgUrl = imgMatch?.[1] ?? "";
      const cleanBody = p.body.replace(/\[image\].*?\[\/image\]/g, "").trim();
      return { ...p, imgUrl, cleanBody };
    });
  }, [posts]);

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.push("/")}>← Home</button>
      <h1>WWFC Forum</h1>
      <p style={{ opacity: 0.75 }}>Posts + comments for the squad.</p>

      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Create a post</h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='Write your message… (use @Name to mention)'
          style={{ width: "100%", padding: 10, minHeight: 110 }}
        />

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="file"
            accept="image/*"
            disabled={imageUploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImage(f);
              e.currentTarget.value = "";
            }}
          />
          {attachedImageUrl && (
            <span style={{ opacity: 0.8 }}>Image attached ✅</span>
          )}
        </div>

        <button onClick={createPost} style={{ marginTop: 10, padding: 12 }}>
          Post
        </button>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Latest posts</h2>

        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
          {parsedPosts.map((p) => (
            <li key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {p.pinned ? "📌 " : ""}{p.title}
                  </div>
                  <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
                    {p.profiles?.name ?? "Unknown"} · {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                    <button onClick={() => togglePin(p.id, p.pinned)}>
                      {p.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button onClick={() => deletePost(p.id)}>Delete</button>
                  </div>
                )}
              </div>

              {p.imgUrl && (
                <img
                  src={p.imgUrl}
                  alt="Post image"
                  style={{ marginTop: 10, maxWidth: "100%", borderRadius: 12, border: "1px solid #eee" }}
                />
              )}

              <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                {renderMentions(p.cleanBody)}
              </div>

              <button style={{ marginTop: 12 }} onClick={() => router.push(`/forum/${p.id}`)}>
                Open comments
              </button>
            </li>
          ))}
          {posts.length === 0 && <li style={{ opacity: 0.7 }}>No posts yet.</li>}
        </ul>
      </section>
    </main>
  );
}
