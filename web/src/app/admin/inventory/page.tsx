"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useSafeAuth } from "@/lib/useSafeAuth";
import {
  adminFetchInventory,
  adminSaveInventoryItem,
  adminDeleteInventoryItem,
  type InventoryItem,
  type InventoryPhase,
  type InventoryStatus,
  type NewInventoryItem,
} from "@/lib/api";

const PHASES: { id: InventoryPhase; label: string }[] = [
  { id: "A", label: "Phase A · Trial + first cohorts" },
  { id: "B", label: "Phase B · Junior track" },
  { id: "C", label: "Phase C · Level 2 depth" },
  { id: "D", label: "Phase D · Competition team" },
];

const STATUSES: InventoryStatus[] = ["needed", "ordered", "received"];

const emptyForm: Partial<NewInventoryItem> = {
  name: "",
  phase: "A",
  category: "",
  vendor: "",
  sku: "",
  quantity: 1,
  estCost: 0,
  actualCost: null,
  status: "needed",
  notes: "",
};

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function AdminInventoryPage() {
  const auth = useSafeAuth();
  const groups = String((auth.user?.profile as any)?.["cognito:groups"] ?? "");
  const isAdmin = groups.includes("admin");

  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [form, setForm] = useState<Partial<NewInventoryItem>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const reload = () => {
    if (!auth.user?.id_token) return;
    adminFetchInventory(auth.user.id_token)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load inventory."));
  };
  useEffect(() => { if (isAdmin) reload(); }, [isAdmin, auth.user]);

  const totals = useMemo(() => {
    const list = items ?? [];
    const estimated = list.reduce((s, i) => s + (i.estCost || 0), 0);
    // Money committed = actual where known, else estimate, for ordered/received items
    const committed = list
      .filter((i) => i.status !== "needed")
      .reduce((s, i) => s + (i.actualCost ?? i.estCost ?? 0), 0);
    const received = list.filter((i) => i.status === "received").length;
    const outstanding = list.filter((i) => i.status === "needed").length;
    return { estimated, committed, received, outstanding, count: list.length };
  }, [items]);

  const save = async () => {
    setError(""); setStatus("");
    if (!auth.user?.id_token) return;
    if (!form.name?.trim()) { setError("Item name is required."); return; }
    try {
      await adminSaveInventoryItem(auth.user.id_token, { ...form, id: editingId ?? undefined });
      setStatus(`${editingId ? "Updated" : "Added"} ${form.name}.`);
      setForm(emptyForm);
      setEditingId(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const startEdit = (it: InventoryItem) => {
    setStatus(""); setError("");
    setEditingId(it.id);
    setForm({
      name: it.name, phase: it.phase, category: it.category, vendor: it.vendor,
      sku: it.sku, quantity: it.quantity, estCost: it.estCost,
      actualCost: it.actualCost, status: it.status, notes: it.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setStatus(""); setError(""); };

  const quickStatus = async (it: InventoryItem, next: InventoryStatus) => {
    if (!auth.user?.id_token) return;
    try {
      await adminSaveInventoryItem(auth.user.id_token, { ...it, status: next });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const remove = async (it: InventoryItem) => {
    if (!auth.user?.id_token) return;
    if (!window.confirm(`Delete "${it.name}"?`)) return;
    try {
      await adminDeleteInventoryItem(auth.user.id_token, it.id);
      if (editingId === it.id) cancelEdit();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const set = (k: keyof NewInventoryItem) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setForm((f) => ({
        ...f,
        [k]: k === "quantity" || k === "estCost" ? Number(v)
          : k === "actualCost" ? (v === "" ? null : Number(v))
          : v,
      }));
    };

  return (
    <AdminShell title="Hardware inventory">
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{money(totals.estimated)}</div>
          <div className="stat-label">Estimated total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{money(totals.committed)}</div>
          <div className="stat-label">Ordered + received</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.received}/{totals.count}</div>
          <div className="stat-label">Items received</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totals.outstanding}</div>
          <div className="stat-label">Still to order</div>
        </div>
      </div>

      <div className="admin-panel">
        <h2>{editingId ? "Edit item" : "Add an item"}</h2>
        <div className="admin-form inv-form">
          <label>Item name<input value={form.name ?? ""} onChange={set("name")} placeholder="VEX IQ Classroom Bundle" /></label>
          <label>Phase
            <select value={form.phase} onChange={set("phase")}>
              {PHASES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label>Category<input value={form.category ?? ""} onChange={set("category")} placeholder="Robotics / Computing / Arena…" /></label>
          <label>Vendor<input value={form.vendor ?? ""} onChange={set("vendor")} placeholder="VEX / Amazon…" /></label>
          <label>SKU<input value={form.sku ?? ""} onChange={set("sku")} placeholder="228-8899" /></label>
          <label>Quantity<input type="number" min={1} value={form.quantity ?? 1} onChange={set("quantity")} /></label>
          <label>Est. cost ($)<input type="number" min={0} step="1" value={form.estCost ?? 0} onChange={set("estCost")} /></label>
          <label>Actual cost ($)<input type="number" min={0} step="1" value={form.actualCost ?? ""} onChange={set("actualCost")} placeholder="once ordered" /></label>
          <label>Status
            <select value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="inv-notes">Notes<input value={form.notes ?? ""} onChange={set("notes")} placeholder="optional" /></label>
          <div className="inv-form-actions">
            <button className="btn btn-primary" onClick={save}>{editingId ? "Update item" : "Add item"}</button>
            {editingId && <button className="nav-link-btn" onClick={cancelEdit}>Cancel</button>}
            {status && <span className="cohort-msg" role="status">{status}</span>}
          </div>
        </div>
      </div>

      {items === null && !error && <p>Loading inventory…</p>}

      {items && PHASES.map((phase) => {
        const rows = items.filter((i) => i.phase === phase.id);
        if (rows.length === 0) return null;
        const est = rows.reduce((s, i) => s + (i.estCost || 0), 0);
        const gotAll = rows.every((i) => i.status === "received");
        return (
          <div className="admin-panel" key={phase.id}>
            <h2>
              {phase.label} <span className="mono enroll-meta">· {rows.length} items · {money(est)}{gotAll ? " · ✓ all received" : ""}</span>
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table className="roster-table inv-table">
                <thead>
                  <tr>
                    <th>Item</th><th>Qty</th><th>Vendor / SKU</th><th>Est.</th><th>Actual</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((it) => (
                    <tr key={it.id} className={`inv-row inv-${it.status}`}>
                      <td>
                        <span className="enroll-name">{it.name}</span>
                        {it.category && <span className="mono enroll-meta"> · {it.category}</span>}
                        {it.notes && <div className="mono enroll-meta">{it.notes}</div>}
                      </td>
                      <td>{it.quantity}</td>
                      <td className="mono enroll-meta">{it.vendor}{it.sku ? ` · ${it.sku}` : ""}</td>
                      <td>{money(it.estCost)}</td>
                      <td>{it.actualCost != null ? money(it.actualCost) : "—"}</td>
                      <td>
                        <div className="inv-status-group">
                          {STATUSES.map((s) => (
                            <button
                              key={s}
                              className={`inv-status-btn ${it.status === s ? "inv-status-on" : ""}`}
                              onClick={() => quickStatus(it, s)}
                              title={`Mark ${s}`}
                            >
                              {s === "needed" ? "Need" : s === "ordered" ? "Ordered" : "Got it"}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button className="nav-link-btn" onClick={() => startEdit(it)}>Edit</button>
                          <button className="nav-link-btn" style={{ color: "#b42334" }} onClick={() => remove(it)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {items && items.length === 0 && (
        <div className="admin-panel"><p>No inventory items yet — add your first above.</p></div>
      )}
    </AdminShell>
  );
}
