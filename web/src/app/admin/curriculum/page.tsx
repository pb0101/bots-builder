"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AdminShell } from "@/components/AdminShell";
import { useSafeAuth } from "@/lib/useSafeAuth";
import {
  adminFetchCurricula,
  adminFetchCurriculum,
  type CurriculumDoc,
  type CurriculumMeta,
} from "@/lib/api";

export default function AdminCurriculumPage() {
  const auth = useSafeAuth();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  const [curricula, setCurricula] = useState<CurriculumMeta[] | null>(null);
  const [doc, setDoc] = useState<CurriculumDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin || !auth.user?.id_token) return;
    adminFetchCurricula(auth.user.id_token)
      .then(setCurricula)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load curricula."));
  }, [isAdmin, auth.user]);

  // Auto-open when there's exactly one document
  useEffect(() => {
    if (curricula?.length === 1 && !doc && !loadingDoc) open(curricula[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curricula]);

  const open = async (id: string) => {
    if (!auth.user?.id_token) return;
    setError("");
    setLoadingDoc(true);
    try {
      setDoc(await adminFetchCurriculum(auth.user.id_token, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load that document.");
    } finally {
      setLoadingDoc(false);
    }
  };

  return (
    <AdminShell title="Curriculum">
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-panel">
        <h2>Instructor materials</h2>
        <p className="mono enroll-meta">Visible to admin accounts only.</p>
        {curricula === null && !error && <p>Loading…</p>}
        {curricula && curricula.length === 0 && <p>No curriculum documents yet.</p>}
        {curricula && curricula.length > 0 && (
          <ul className="admin-cohort-list" style={{ marginTop: "0.75rem" }}>
            {curricula.map((c) => (
              <li key={c.id}>
                <div>
                  <p className="enroll-name">{c.title}</p>
                  <p className="mono enroll-meta">
                    {c.updatedAt ? `Updated ${new Date(c.updatedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="admin-row-actions">
                  <button className="btn btn-ghost" onClick={() => open(c.id)}>
                    {doc?.id === c.id ? "Reload" : "Open"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loadingDoc && <div className="admin-panel"><p>Loading document…</p></div>}

      {doc && !loadingDoc && (
        <div className="admin-panel curriculum-doc">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
        </div>
      )}
    </AdminShell>
  );
}
