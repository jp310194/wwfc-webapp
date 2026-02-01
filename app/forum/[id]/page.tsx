"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type Post = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  profiles?: { name: string } | null;
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  profiles?: { name: string } | null;
};

function renderMentions(text: string) {
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

function extractImage(text: string) {
  const imgMatch = text.match(/\[image\](.*?)\[\/image\]/);
  return {
    imgUrl: imgMatch?.[1] ?? "",
    clean: text.replace(/\[image\].*?\[\/image\]/g, "").trim(),
  };
}

export default function ForumPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [role, setRole] = useState<"player" | "admin">("player");
  const isAdmin = role === "admin";

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");

  const [imageUploading, setImageUploading] = useState(false);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string>("");

  async function loadAll() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return router.push("/login");
    const uid = sess.session.user.id;

    const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).single();
    setRole((prof?.role ?? "player") as any);

    const { data: p, error: pErr } = await supabase
      .from("forum_posts")
      .select("id,title,body,pinned,created_at, profiles(name)")
      .eq("id", id)
      .single();

    if (pErr) return alert(pErr.message);
    setPost(p as any);

    const { data: c, error: cErr } = await supabase
      .from("forum_comments")
      .select("id,body,created_at, profiles(name)")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (cErr) return alert(cErr.message);
    setComments((c ?? []) as any);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  async function addComment() {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return router.push("/login");

    if (!commentBody.trim()) return alert("Write a comment first.");

    const finalBody =
      attachedImageUrl
        ? `${commentBody.trim()}\n\n[image]${attachedImageUrl}[/image]`
        : commentBody.trim();

    const { error } = await supabase.from("forum_comments").insert({
      post_id: id,
      author_id: uid,
      body: finalBody,
    });

    if (error) return alert(error.message);

    setCommentBody("");
    setAttachedImageUrl("");
    await loadAll();
  }

  async function deleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("forum_comments").delete().eq("id", commentId);
    if (error) return alert(error.message);
    await loadAll();
  }

  async function togglePin() {
    if (!post) return;
    const { error } = await supabase.from("forum_posts").update({ pinned: !post.pinned }).eq("id", post.id);
    if (error) return alert(error.message);
    await loadAll();
  }

  const parsedPost = useMemo(() => (post ? extractImage(post.body) : { imgUrl: "", clean: "" }), [post]);
  const parsedComments = useMemo(() => comments.map(c => ({ ...c, ...extractImage(c.body) })), [comments]);

  if (!post) return <main style={{ padding: 20 }}>Loading…</main>;

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => router.push("/forum")}>← Back to Forum</button>

      <section style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>
              {post.pinned ? "📌 " : ""}{post.title}
            </div>
            <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
              {post.profiles?.name ?? "Unknown"} · {new Date(post.created_at).toLocaleString()}
            </div>
          </div>

          {isAdmin && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={togglePin}>{post.pinned ? "Unpin" : "Pin"}</button>
            </div>
          )}
        </div>

        {parsedPost.imgUrl && (
          <img
            src={parsedPost.imgUrl}
            alt="Post image"
            style={{ marginTop: 10, maxWidth: "100%", borderRadius: 12, border: "1px solid #eee" }}
          />
        )}

        <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
          {renderMentions(parsedPost.clean)}
        </div>
      </section>

      <section style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Comments</h2>

        <div style={{ display: "grid", gap: 10 }}>
          {parsedComments.map((c: any) => (
            <div key={c.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {c.profiles?.name ?? "Unknown"} · {new Date(c.created_at).toLocaleString()}
                </div>
                {isAdmin && <button onClick={() => deleteComment(c.id)}>Delete</button>}
              </div>

              {c.imgUrl && (
                <img
                  src={c.imgUrl}
                  alt="Comment image"
                  style={{ marginTop: 8, maxWidth: "100%", borderRadius: 12, border: "1px solid #eee" }}
                />
              )}

              <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                {renderMentions(c.clean)}
              </div>
            </div>
          ))}
          {comments.length === 0 && <div style={{ opacity: 0.7 }}>No comments yet.</div>}
        </div>

        <div style={{ marginTop: 14 }}>
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Write a comment… (use @Name)"
            style={{ width: "100%", padding: 10, minHeight: 90 }}
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
            {attachedImageUrl && <span style={{ opacity: 0.8 }}>Image attached ✅</span>}
          </div>

          <button onClick={addComment} style={{ marginTop: 10, padding: 12 }}>
            Add comment
          </button>
        </div>
      </section>
    </main>
  );
}
