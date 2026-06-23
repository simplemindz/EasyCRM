"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Check,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type UpdateStatus =
  | "w oczekiwaniu na odpowiedź"
  | "czeka na odpowiedź"
  | "nieznany";

type Partner = {
  id: string;
  company_name: string;
  contact_person: string;
  address: string;
  email: string;
  cooperation_start_date: string;
  last_update_date: string;
  update_status: UpdateStatus;
  comment: string;
  created_at?: string;
};

type PartnerDraft = Omit<
  Partner,
  "id" | "update_status" | "comment" | "created_at"
>;

const statusOptions: UpdateStatus[] = [
  "w oczekiwaniu na odpowiedź",
  "czeka na odpowiedź",
  "nieznany"
];

const emptyDraft: PartnerDraft = {
  company_name: "",
  contact_person: "",
  address: "",
  email: "",
  cooperation_start_date: "",
  last_update_date: ""
};

const demoPartners: Partner[] = [
  {
    id: "demo-1",
    company_name: "Nordline Sp. z o.o.",
    contact_person: "Marta Zielińska",
    address: "ul. Polna 12, 00-635 Warszawa",
    email: "marta.zielinska@nordline.example",
    cooperation_start_date: "2025-09-02",
    last_update_date: "2026-06-18",
    update_status: "czeka na odpowiedź",
    comment: "Oferta wysłana po spotkaniu kwartalnym."
  },
  {
    id: "demo-2",
    company_name: "Vertex Labs",
    contact_person: "Tomasz Nowak",
    address: "ul. Długosza 7, 30-512 Kraków",
    email: "t.nowak@vertex.example",
    cooperation_start_date: "2026-01-15",
    last_update_date: "2026-06-09",
    update_status: "nieznany",
    comment: ""
  }
];

const storageKey = "easycrm_partners";

type SupabaseConnection = {
  client: SupabaseClient | null;
  error: string;
};

function parseHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function getSupabaseConnection(): SupabaseConnection {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { client: null, error: "" };
  }

  const parsedUrl = parseHttpUrl(url.trim());

  if (!parsedUrl) {
    return {
      client: null,
      error:
        "NEXT_PUBLIC_SUPABASE_URL musi być pełnym adresem zaczynającym się od https://"
    };
  }

  if (!parsedUrl.hostname.endsWith(".supabase.co")) {
    return {
      client: null,
      error:
        "NEXT_PUBLIC_SUPABASE_URL musi wskazywać na projekt Supabase, np. https://xxxxxxxxxxxx.supabase.co"
    };
  }

  return {
    client: createClient(parsedUrl.origin, anonKey.trim()),
    error: ""
  };
}

function createPartner(draft: PartnerDraft): Partner {
  return {
    ...draft,
    id: crypto.randomUUID(),
    update_status: "nieznany",
    comment: ""
  };
}

export default function Home() {
  const supabaseConnection = useMemo(() => getSupabaseConnection(), []);
  const supabase = supabaseConnection.client;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<PartnerDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<PartnerDraft>(emptyDraft);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [query, setQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPartners() {
      if (supabaseConnection.error) {
        setErrorMessage(supabaseConnection.error);
      }

      if (supabase) {
        const { data, error } = await supabase
          .from("partners")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          setErrorMessage(error.message);
          setPartners([]);
        } else {
          setPartners(data ?? []);
        }

        setIsLoading(false);
        return;
      }

      const saved = window.localStorage.getItem(storageKey);
      setPartners(saved ? JSON.parse(saved) : demoPartners);
      setIsLoading(false);
    }

    loadPartners();
  }, [supabase, supabaseConnection.error]);

  useEffect(() => {
    if (!supabase && !isLoading) {
      window.localStorage.setItem(storageKey, JSON.stringify(partners));
    }
  }, [isLoading, partners, supabase]);

  const visiblePartners = partners.filter((partner) => {
    const phrase = query.trim().toLowerCase();

    if (!phrase) {
      return true;
    }

    return [
      partner.company_name,
      partner.contact_person,
      partner.address,
      partner.email,
      partner.update_status,
      partner.comment
    ]
      .join(" ")
      .toLowerCase()
      .includes(phrase);
  });

  async function persistPartner(nextPartner: Partner) {
    if (supabase) {
      const { error } = await supabase
        .from("partners")
        .upsert(nextPartner)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
      }
    }

    setPartners((current) =>
      current.map((partner) =>
        partner.id === nextPartner.id ? nextPartner : partner
      )
    );
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const partner = createPartner(draft);

    if (supabase) {
      const { data, error } = await supabase
        .from("partners")
        .insert(partner)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setPartners((current) => [data, ...current]);
    } else {
      setPartners((current) => [partner, ...current]);
    }

    setDraft(emptyDraft);
    setIsAdding(false);
  }

  function startEditing(partner: Partner) {
    setEditingId(partner.id);
    setEditingDraft({
      company_name: partner.company_name,
      contact_person: partner.contact_person,
      address: partner.address,
      email: partner.email,
      cooperation_start_date: partner.cooperation_start_date,
      last_update_date: partner.last_update_date
    });
  }

  async function saveEditing(partner: Partner) {
    await persistPartner({ ...partner, ...editingDraft });
    setEditingId(null);
  }

  async function updateInline(
    partner: Partner,
    changes: Pick<Partner, "update_status"> | Pick<Partner, "comment">
  ) {
    await persistPartner({ ...partner, ...changes });
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (supabase) {
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }

    setPartners((current) =>
      current.filter((partner) => partner.id !== deleteTarget.id)
    );
    setDeleteTarget(null);
  }

  return (
    <main className="shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">EasyCRM</p>
            <h1>Partnerzy</h1>
          </div>

          <button className="primaryButton" onClick={() => setIsAdding(true)}>
            <Plus size={18} aria-hidden="true" />
            Dodaj partnera
          </button>
        </header>

        <div className="toolbar">
          <label className="searchBox">
            <Search size={18} aria-hidden="true" />
            <input
              placeholder="Szukaj firmy, osoby, statusu lub komentarza"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span className="counter">{visiblePartners.length} rekordy</span>
        </div>

        {errorMessage ? (
          <div className="notice">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage("")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {isAdding ? (
          <form className="addPanel" onSubmit={handleAdd}>
            <PartnerFields draft={draft} setDraft={setDraft} />
            <div className="formActions">
              <button
                className="secondaryButton"
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setDraft(emptyDraft);
                }}
              >
                <X size={17} aria-hidden="true" />
                Anuluj
              </button>
              <button className="primaryButton" type="submit">
                <Check size={17} aria-hidden="true" />
                Zapisz
              </button>
            </div>
          </form>
        ) : null}

        <div className="tableFrame">
          <table>
            <thead>
              <tr>
                <th>Firma</th>
                <th>Osoba kontaktowa</th>
                <th>Adres</th>
                <th>E-mail</th>
                <th>Start współpracy</th>
                <th>Ostatni update</th>
                <th>Status update'u</th>
                <th>Komentarz</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="emptyState">
                    Ładowanie danych...
                  </td>
                </tr>
              ) : null}

              {!isLoading && visiblePartners.length === 0 ? (
                <tr>
                  <td colSpan={9} className="emptyState">
                    Brak partnerów do wyświetlenia.
                  </td>
                </tr>
              ) : null}

              {visiblePartners.map((partner) => {
                const isEditing = editingId === partner.id;

                return (
                  <tr key={partner.id}>
                    <EditableCell
                      value={partner.company_name}
                      isEditing={isEditing}
                      onChange={(value) =>
                        setEditingDraft((current) => ({
                          ...current,
                          company_name: value
                        }))
                      }
                      editValue={editingDraft.company_name}
                    />
                    <EditableCell
                      value={partner.contact_person}
                      isEditing={isEditing}
                      onChange={(value) =>
                        setEditingDraft((current) => ({
                          ...current,
                          contact_person: value
                        }))
                      }
                      editValue={editingDraft.contact_person}
                    />
                    <EditableCell
                      value={partner.address}
                      isEditing={isEditing}
                      onChange={(value) =>
                        setEditingDraft((current) => ({
                          ...current,
                          address: value
                        }))
                      }
                      editValue={editingDraft.address}
                    />
                    <EditableCell
                      value={partner.email}
                      isEditing={isEditing}
                      type="email"
                      onChange={(value) =>
                        setEditingDraft((current) => ({
                          ...current,
                          email: value
                        }))
                      }
                      editValue={editingDraft.email}
                    />
                    <EditableCell
                      value={partner.cooperation_start_date}
                      isEditing={isEditing}
                      type="date"
                      onChange={(value) =>
                        setEditingDraft((current) => ({
                          ...current,
                          cooperation_start_date: value
                        }))
                      }
                      editValue={editingDraft.cooperation_start_date}
                    />
                    <EditableCell
                      value={partner.last_update_date}
                      isEditing={isEditing}
                      type="date"
                      onChange={(value) =>
                        setEditingDraft((current) => ({
                          ...current,
                          last_update_date: value
                        }))
                      }
                      editValue={editingDraft.last_update_date}
                    />
                    <td>
                      <select
                        value={partner.update_status}
                        onChange={(event) =>
                          updateInline(partner, {
                            update_status: event.target.value as UpdateStatus
                          })
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        value={partner.comment}
                        onChange={(event) =>
                          updateInline(partner, { comment: event.target.value })
                        }
                        placeholder="Dodaj komentarz"
                      />
                    </td>
                    <td>
                      <div className="rowActions">
                        {isEditing ? (
                          <>
                            <button
                              className="iconButton"
                              title="Zapisz"
                              onClick={() => saveEditing(partner)}
                            >
                              <Save size={17} aria-hidden="true" />
                            </button>
                            <button
                              className="iconButton"
                              title="Anuluj"
                              onClick={() => setEditingId(null)}
                            >
                              <X size={17} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <button
                            className="textButton"
                            onClick={() => startEditing(partner)}
                          >
                            <Pencil size={16} aria-hidden="true" />
                            Edytuj
                          </button>
                        )}

                        <button
                          className="dangerButton"
                          onClick={() => setDeleteTarget(partner)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {deleteTarget ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Usunąć partnera?</h2>
            <p>
              Ta operacja usunie rekord firmy {deleteTarget.company_name} z
              listy partnerów.
            </p>
            <div className="modalActions">
              <button
                className="secondaryButton"
                onClick={() => setDeleteTarget(null)}
              >
                Anuluj
              </button>
              <button className="dangerButton solid" onClick={confirmDelete}>
                <Trash2 size={16} aria-hidden="true" />
                Usuń
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function PartnerFields({
  draft,
  setDraft
}: {
  draft: PartnerDraft;
  setDraft: React.Dispatch<React.SetStateAction<PartnerDraft>>;
}) {
  return (
    <div className="formGrid">
      <Field
        label="Nazwa firmy"
        value={draft.company_name}
        required
        onChange={(company_name) =>
          setDraft((current) => ({ ...current, company_name }))
        }
      />
      <Field
        label="Osoba kontaktowa"
        value={draft.contact_person}
        required
        onChange={(contact_person) =>
          setDraft((current) => ({ ...current, contact_person }))
        }
      />
      <Field
        label="Adres"
        value={draft.address}
        required
        onChange={(address) => setDraft((current) => ({ ...current, address }))}
      />
      <Field
        label="Adres e-mail"
        value={draft.email}
        type="email"
        required
        onChange={(email) => setDraft((current) => ({ ...current, email }))}
      />
      <Field
        label="Data rozpoczęcia współpracy"
        value={draft.cooperation_start_date}
        type="date"
        required
        onChange={(cooperation_start_date) =>
          setDraft((current) => ({ ...current, cooperation_start_date }))
        }
      />
      <Field
        label="Data ostatniego update'u"
        value={draft.last_update_date}
        type="date"
        required
        onChange={(last_update_date) =>
          setDraft((current) => ({ ...current, last_update_date }))
        }
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function EditableCell({
  value,
  editValue,
  isEditing,
  onChange,
  type = "text"
}: {
  value: string;
  editValue: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <td>
      {isEditing ? (
        <input
          className="tableInput"
          type={type}
          value={editValue}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <span className="cellText">{type === "date" ? formatDate(value) : value}</span>
      )}
    </td>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pl-PL").format(new Date(value));
}
