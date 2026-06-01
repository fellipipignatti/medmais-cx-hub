import { supabase } from "@/integrations/supabase/client";

export type Client = {
  id: string;
  name: string;
  segment: string | null;
  birthday_date: string | null;
  status: string;
  created_at: string;
};
export type Manager = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
};
export type ActionType = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  recurrence: string;
};
export type Action = {
  id: string;
  client_id: string;
  action_type_id: string;
  responsible_manager_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};
export type Evidence = {
  id: string;
  action_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  description: string | null;
};
export type ClientManager = {
  id: string;
  client_id: string;
  manager_id: string;
  relationship_type: string;
};

export const qk = {
  clients: ["clients"] as const,
  client: (id: string) => ["clients", id] as const,
  managers: ["managers"] as const,
  actionTypes: ["actionTypes"] as const,
  actions: ["actions"] as const,
  clientManagers: ["clientManagers"] as const,
  evidences: (actionId: string) => ["evidences", actionId] as const,
};

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

export const api = {
  listClients: () =>
    unwrap<Client[]>(supabase.from("clients").select("*").order("name")),
  getClient: (id: string) =>
    unwrap<Client>(supabase.from("clients").select("*").eq("id", id).single()),
  listManagers: () =>
    unwrap<Manager[]>(supabase.from("managers").select("*").order("name")),
  listActionTypes: () =>
    unwrap<ActionType[]>(supabase.from("action_types").select("*").order("name")),
  listActions: () =>
    unwrap<Action[]>(supabase.from("actions").select("*").order("due_date", { ascending: true })),
  listClientManagers: () =>
    unwrap<ClientManager[]>(supabase.from("client_managers").select("*")),
  listEvidences: (actionId: string) =>
    unwrap<Evidence[]>(
      supabase.from("evidences").select("*").eq("action_id", actionId).order("uploaded_at", { ascending: false }),
    ),
};

export function statusOf(a: Action): "pendente" | "concluida" | "atrasada" {
  if (a.completed_at) return "concluida";
  if (a.due_date && a.due_date < new Date().toISOString().slice(0, 10)) return "atrasada";
  return "pendente";
}

export type ClientStatus = "sem_acoes" | "em_dia" | "pendente" | "atrasada";

export function clientStatusOf(actions: Action[]): ClientStatus {
  if (actions.length === 0) return "sem_acoes";
  const statuses = actions.map(statusOf);
  if (statuses.includes("atrasada")) return "atrasada";
  if (statuses.includes("pendente")) return "pendente";
  return "em_dia";
}

/** Dias até o próximo aniversário (MM-DD) considerando hoje. Retorna null se sem data. */
export function daysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [, mm, dd] = birthday.split("-").map(Number);
  let next = new Date(today.getFullYear(), mm - 1, dd);
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

export function fileKind(name: string): Evidence["file_type"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  return "other";
}
