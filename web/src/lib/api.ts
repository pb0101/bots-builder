import { config } from "./config";

export interface Cohort {
  cohortId: string;
  programId: string;
  startDate: string;
  endDate: string;
  dayOfWeek: string;
  time: string;
  location: string;
  capacity: number;
  seatsLeft: number;
  status: "open" | "full" | "closed";
}

export interface Enrollment {
  programId: string;
  cohortId?: string;
  studentName?: string;
  studentAge?: string;
  createdAt: string;
  paymentStatus: string;
  amountTotal: number;
  currency: string;
}

export interface CheckoutRequest {
  cohortId: string;
  studentName: string;
  studentAge: string;
  waiverAccepted: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch { /* keep default */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

const authHeaders = (idToken: string) => ({
  authorization: `Bearer ${idToken}`,
  "content-type": "application/json",
});

// fresh=true bypasses the browser's 60s cache (admin needs to see saves immediately)
export const fetchCohorts = (fresh = false) =>
  request<{ cohorts: Cohort[] }>("/cohorts", fresh ? { cache: "no-store" } : undefined).then(
    (d) => d.cohorts
  );

export const createCheckout = (idToken: string, body: CheckoutRequest) =>
  request<{ url: string }>("/checkout", {
    method: "POST",
    headers: authHeaders(idToken),
    body: JSON.stringify(body),
  }).then((d) => d.url);

export const fetchEnrollments = (idToken: string) =>
  request<{ enrollments: Enrollment[] }>("/enrollments", {
    headers: { authorization: `Bearer ${idToken}` },
  }).then((d) => d.enrollments);

export const joinWaitlist = (idToken: string, cohortId: string, studentName: string) =>
  request<{ message: string }>("/waitlist", {
    method: "POST",
    headers: authHeaders(idToken),
    body: JSON.stringify({ cohortId, studentName }),
  }).then((d) => d.message);

// ----- admin -----
export interface RosterEntry {
  studentName: string;
  studentAge: string;
  parentEmail: string;
  paymentStatus: string;
  createdAt: string;
}
export interface WaitlistEntry {
  studentName: string;
  parentEmail: string;
  createdAt: string;
}
export interface NewCohort {
  cohortId?: string;
  programId: string;
  startDate: string;
  endDate: string;
  dayOfWeek: string;
  time: string;
  location: string;
  capacity: number;
  status?: string;
}

export const adminSaveCohort = (idToken: string, cohort: NewCohort) =>
  request<{ cohortId: string }>("/admin/cohorts", {
    method: "POST",
    headers: authHeaders(idToken),
    body: JSON.stringify(cohort),
  });

export const adminDeleteCohort = (idToken: string, cohortId: string) =>
  request<{ deleted: string }>("/admin/cohorts/delete", {
    method: "POST",
    headers: authHeaders(idToken),
    body: JSON.stringify({ cohortId }),
  });

export const adminNotifyWaitlist = (idToken: string, cohortId: string) =>
  request<{ notified: number }>("/admin/notify-waitlist", {
    method: "POST",
    headers: authHeaders(idToken),
    body: JSON.stringify({ cohortId }),
  });

export const sendContact = (name: string, email: string, message: string, website = "") =>
  request<{ message: string }>("/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, email, message, website }),
  }).then((d) => d.message);

export interface AdminEnrollment {
  cohortId: string;
  programId: string;
  studentName: string;
  studentAge: string;
  parentEmail: string;
  paymentStatus: string;
  amountTotal: number;
  createdAt: string;
}

export interface AdminUser {
  email: string;
  name: string;
  status: string;
  createdAt: string;
}

export const adminFetchAllEnrollments = (idToken: string) =>
  request<{ enrollments: AdminEnrollment[] }>("/admin/enrollments", {
    headers: { authorization: `Bearer ${idToken}` },
    cache: "no-store",
  }).then((d) => d.enrollments);

export const adminFetchUsers = (idToken: string) =>
  request<{ users: AdminUser[] }>("/admin/users", {
    headers: { authorization: `Bearer ${idToken}` },
    cache: "no-store",
  }).then((d) => d.users);

export interface CurriculumMeta {
  id: string;
  title: string;
  updatedAt: string;
}

export interface CurriculumDoc extends CurriculumMeta {
  content: string;
}

export const adminFetchCurricula = (idToken: string) =>
  request<{ curricula: CurriculumMeta[] }>("/admin/curriculum", {
    headers: { authorization: `Bearer ${idToken}` },
    cache: "no-store",
  }).then((d) => d.curricula);

export const adminFetchCurriculum = (idToken: string, id: string) =>
  request<CurriculumDoc>(`/admin/curriculum/item?id=${encodeURIComponent(id)}`, {
    headers: { authorization: `Bearer ${idToken}` },
  });

export const adminFetchRoster = (idToken: string, cohortId: string) =>
  request<{ roster: RosterEntry[]; waitlist: WaitlistEntry[] }>(
    `/admin/roster?cohortId=${encodeURIComponent(cohortId)}`,
    { headers: { authorization: `Bearer ${idToken}` } }
  );
