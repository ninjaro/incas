import { useEffect, useState } from "react";

import { ApiError } from "../../api/client";
import type { AdminPost, PostInput, PostStatus, PostTemplateInfo } from "../../api/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";

const STATUS_FILTERS: (PostStatus | "all")[] = ["all", "draft", "scheduled", "published", "archived"];

type EditorState = {
  title: string;
  summary: string;
  body: string;
  eventKind: string;
  startsAt: string;
  publishAt: string;
  status: PostStatus;
  imageUrl: string;
  registrationLimitEnabled: boolean;
  registrationLimit: string;
  registrationPriceCents: string;
  registrationIsDeposit: boolean;
  socialFacebook: boolean;
  socialInstagram: boolean;
};

const EMPTY_EDITOR: EditorState = {
  title: "",
  summary: "",
  body: "",
  eventKind: "",
  startsAt: "",
  publishAt: "",
  status: "draft",
  imageUrl: "",
  registrationLimitEnabled: false,
  registrationLimit: "",
  registrationPriceCents: "",
  registrationIsDeposit: false,
  socialFacebook: false,
  socialInstagram: false,
};

function editorFromPost(post: AdminPost): EditorState {
  return {
    title: post.title,
    summary: post.summary,
    body: post.body,
    eventKind: post.eventKind ?? "",
    startsAt: post.startsAt?.slice(0, 16) ?? "",
    publishAt: post.publishAt?.slice(0, 16) ?? "",
    status: post.storedStatus,
    imageUrl: post.imageUrl,
    registrationLimitEnabled: post.registrationLimitEnabled,
    registrationLimit: post.registrationLimit?.toString() ?? "",
    registrationPriceCents: post.registrationPriceCents?.toString() ?? "",
    registrationIsDeposit: post.registrationIsDeposit,
    socialFacebook: false,
    socialInstagram: false,
  };
}

function editorToInput(editor: EditorState): PostInput {
  return {
    title: editor.title,
    summary: editor.summary,
    body: editor.body,
    eventKind: editor.eventKind || undefined,
    startsAt: editor.startsAt || undefined,
    publishAt: editor.publishAt || undefined,
    status: editor.status,
    imageUrl: editor.imageUrl,
    registrationLimitEnabled: editor.registrationLimitEnabled,
    registrationLimit: editor.registrationLimit ? Number(editor.registrationLimit) : null,
    registrationPriceCents: editor.registrationPriceCents
      ? Number(editor.registrationPriceCents)
      : null,
    registrationIsDeposit: editor.registrationIsDeposit,
  };
}

function PostEditor({
  post,
  onSaved,
  onClose,
}: {
  post: AdminPost | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const data = useData();
  const [editor, setEditor] = useState<EditorState>(post ? editorFromPost(post) : EMPTY_EDITOR);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Unsaved-change protection when leaving the browser tab.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setEditor((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    setFieldErrors({});
    setNotice(null);
    try {
      const input = editorToInput(editor);
      const saved = post
        ? await data.updatePost(post.id, input)
        : await data.createPost(input);

      const channels = [
        ...(editor.socialFacebook ? ["facebook"] : []),
        ...(editor.socialInstagram ? ["instagram"] : []),
      ];
      if (channels.length > 0 && saved.status !== "draft") {
        await data.publishSocial(saved.id, channels);
      }

      setDirty(false);
      setNotice({ tone: "ok", text: post ? "Post updated." : "Post created." });
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields);
      } else {
        setNotice({
          tone: "bad",
          text: error instanceof Error ? error.message : "Saving failed.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveAsTemplate = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await data.createTemplate({
        name: editor.title || "Untitled template",
        titlePattern: editor.title,
        summary: editor.summary,
        body: editor.body,
        eventKind: editor.eventKind || null,
        socialSettings: {
          facebook: editor.socialFacebook,
          instagram: editor.socialInstagram,
        },
      });
      setNotice({ tone: "ok", text: "Saved as a reusable template." });
    } catch (error) {
      setNotice({ tone: "bad", text: error instanceof Error ? error.message : "Template save failed." });
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  return (
    <div className="card">
      <div className="page-header-row">
        <h3 style={{ margin: 0 }}>{post ? `Edit: ${post.title}` : "New post"}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(!preview)}>
            {preview ? "Back to editing" : "Preview"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
            Close
          </button>
        </div>
      </div>
      {notice ? <p className={`notice notice-${notice.tone}`}>{notice.text}</p> : null}

      {preview ? (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)" }}>{editor.title || "Untitled"}</h2>
          <p style={{ color: "var(--ink-soft)" }}>{editor.summary}</p>
          <div style={{ whiteSpace: "pre-wrap" }}>{editor.body}</div>
        </div>
      ) : (
        <>
          <h4>Content</h4>
          <Field label="Title" error={fieldErrors.title}>
            <input value={editor.title} onChange={(event) => set("title", event.target.value)} />
          </Field>
          <Field label="Summary">
            <input value={editor.summary} onChange={(event) => set("summary", event.target.value)} maxLength={256} />
          </Field>
          <Field label="Body">
            <textarea value={editor.body} onChange={(event) => set("body", event.target.value)} rows={6} />
          </Field>

          <h4>Event details</h4>
          <div className="form-grid">
            <Field label="Event type">
              <select value={editor.eventKind} onChange={(event) => set("eventKind", event.target.value)}>
                <option value="">Not an event / other</option>
                <option value="country_evening">Country Evening</option>
                <option value="cafe_lingua">Café Lingua</option>
                <option value="breakfast">International Breakfast</option>
                <option value="board_games">Board Games</option>
                <option value="dance">Dance Workshops</option>
                <option value="trip">International Weekend</option>
                <option value="karaoke">Karaoke</option>
                <option value="housing">Housing</option>
              </select>
            </Field>
            <Field label="Starts at" error={fieldErrors.startsAt}>
              <input
                type="datetime-local"
                value={editor.startsAt}
                onChange={(event) => set("startsAt", event.target.value)}
              />
            </Field>
          </div>

          <h4>Registration</h4>
          <div className="form-grid">
            <div className="field field-check">
              <input
                id="reg-enabled"
                type="checkbox"
                checked={editor.registrationLimitEnabled}
                onChange={(event) => set("registrationLimitEnabled", event.target.checked)}
              />
              <label htmlFor="reg-enabled">Limited places</label>
            </div>
            <Field label="Limit" error={fieldErrors.registrationLimit}>
              <input
                type="number"
                min={0}
                value={editor.registrationLimit}
                onChange={(event) => set("registrationLimit", event.target.value)}
              />
            </Field>
            <Field label="Price (cents)" error={fieldErrors.registrationPriceCents}>
              <input
                type="number"
                min={0}
                value={editor.registrationPriceCents}
                onChange={(event) => set("registrationPriceCents", event.target.value)}
              />
            </Field>
            <div className="field field-check">
              <input
                id="reg-deposit"
                type="checkbox"
                checked={editor.registrationIsDeposit}
                onChange={(event) => set("registrationIsDeposit", event.target.checked)}
              />
              <label htmlFor="reg-deposit">Price is a deposit</label>
            </div>
          </div>

          <h4>Media</h4>
          <Field label="Image URL (external images preferred)">
            <input value={editor.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} />
          </Field>

          <h4>Publication</h4>
          <div className="form-grid">
            <Field label="Status" error={fieldErrors.status}>
              <select
                value={editor.status}
                onChange={(event) => set("status", event.target.value as PostStatus)}
              >
                <option value="draft">Draft (not public)</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            {editor.status === "scheduled" ? (
              <Field label="Publish at (Europe/Berlin)" error={fieldErrors.publishAt}>
                <input
                  type="datetime-local"
                  value={editor.publishAt}
                  onChange={(event) => set("publishAt", event.target.value)}
                />
              </Field>
            ) : null}
          </div>

          <h4>Social channels</h4>
          <div className="form-grid">
            <div className="field field-check">
              <input
                id="social-fb"
                type="checkbox"
                checked={editor.socialFacebook}
                onChange={(event) => set("socialFacebook", event.target.checked)}
              />
              <label htmlFor="social-fb">Publish to Facebook</label>
            </div>
            <div className="field field-check">
              <input
                id="social-ig"
                type="checkbox"
                checked={editor.socialInstagram}
                onChange={(event) => set("socialInstagram", event.target.checked)}
              />
              <label htmlFor="social-ig">Publish to Instagram</label>
            </div>
          </div>
          {post?.social?.length ? (
            <div>
              {post.social.map((publication) => (
                <p key={publication.id} style={{ margin: "4px 0", fontSize: "0.88rem" }}>
                  {publication.provider}: <StatusBadge status={publication.status} />{" "}
                  {publication.isSimulated ? <span className="badge badge-warn">simulated</span> : null}{" "}
                  {publication.permalink ? (
                    <a href={publication.permalink} target="_blank" rel="noreferrer">
                      permalink
                    </a>
                  ) : null}
                  {publication.status === "failed" ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => data.retrySocial(publication.id).then(onSaved)}
                    >
                      Retry
                    </button>
                  ) : null}
                </p>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
              {busy ? "Saving…" : editor.status === "draft" ? "Save draft" : "Save"}
            </button>
            <button type="button" className="btn btn-outline" onClick={saveAsTemplate} disabled={busy}>
              Save as template
            </button>
            {dirty ? <span className="badge badge-warn">Unsaved changes</span> : null}
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmDiscard}
        title="Discard unsaved changes?"
        body="Your edits have not been saved."
        confirmLabel="Discard"
        danger
        onConfirm={onClose}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}

function TemplatesTab({ onUse }: { onUse: (post: AdminPost) => void }) {
  const data = useData();
  const templates = useAsync(() => data.getTemplates(), []);
  const [confirmDelete, setConfirmDelete] = useState<PostTemplateInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (task: () => Promise<unknown>) => {
    setNotice(null);
    try {
      await task();
      templates.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Action failed.");
    }
  };

  if (templates.loading) return <Loading />;
  if (templates.error) return <ErrorState error={templates.error} onRetry={templates.reload} />;

  const items = templates.data?.items ?? [];

  return (
    <>
      {notice ? <p className="notice notice-bad">{notice}</p> : null}
      {items.length === 0 ? (
        <EmptyState>
          No templates yet. Open a post in the editor and use “Save as template”.
        </EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Template</th>
              <th>Event type</th>
              <th>Updated</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((template) => (
              <tr key={template.id}>
                <td>
                  <strong>{template.name}</strong>
                  <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                    {template.summary}
                  </div>
                </td>
                <td>{template.eventKind ?? "—"}</td>
                <td>{template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : "—"}</td>
                <td>
                  <div className="queue-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        run(async () => onUse(await data.createPostFromTemplate(template.id)))
                      }
                    >
                      New post
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => run(() => data.duplicateTemplate(template.id))}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmDelete(template)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete template?"
        body={confirmDelete ? `"${confirmDelete.name}" will be removed permanently.` : undefined}
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDelete) void run(() => data.deleteTemplate(confirmDelete.id));
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}

export function PostsPanel() {
  const data = useData();
  const [filter, setFilter] = useState<PostStatus | "all">("all");
  const [tab, setTab] = useState<"posts" | "templates">("posts");
  const [editing, setEditing] = useState<AdminPost | null | "new">(null);

  const posts = useAsync(
    () => data.getAdminPosts(filter === "all" ? undefined : { status: filter }),
    [filter],
  );

  const openPost = async (post: AdminPost) => {
    setEditing(await data.getAdminPost(post.id));
  };

  return (
    <>
      <PageHeader
        kicker="Publishing"
        title="Posts & Events"
        sub="Drafts stay private, scheduled posts go public automatically at their publication time (Europe/Berlin)."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
            New post
          </button>
        }
      />
      {editing !== null ? (
        <PostEditor
          post={editing === "new" ? null : editing}
          onSaved={() => posts.reload()}
          onClose={() => setEditing(null)}
        />
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "posts"} onClick={() => setTab("posts")}>
              Posts
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "templates"}
              onClick={() => setTab("templates")}
            >
              Templates
            </button>
          </div>
          {tab === "templates" ? (
            <TemplatesTab onUse={(post) => setEditing(post)} />
          ) : (
            <>
              <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`btn btn-sm ${filter === status ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              {posts.loading ? (
                <Loading />
              ) : posts.error ? (
                <ErrorState error={posts.error} onRetry={posts.reload} />
              ) : (posts.data?.items.length ?? 0) === 0 ? (
                <EmptyState>No posts with this status.</EmptyState>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Status</th>
                      <th>Event date</th>
                      <th>Publish at</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(posts.data?.items ?? []).map((post) => (
                      <tr key={post.id}>
                        <td>
                          <strong>{post.title}</strong>
                          <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                            {post.summary}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={post.status} />
                        </td>
                        <td>{post.startsAt ? new Date(post.startsAt).toLocaleString() : "—"}</td>
                        <td>{post.publishAt ? new Date(post.publishAt).toLocaleString() : "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => void openPost(post)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
