"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Handshake,
  Home as HomeIcon,
  Plus,
  Settings,
  Trash2,
  X
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

type RelationStatus =
  | "w oczekiwaniu na odpowiedź"
  | "w trakcie testowania"
  | "czeka na odpowiedź"
  | "nieznany";

type ActionStatus = "nadchodzące" | "wykonane";
type PartnerSort = "next" | "name";

type Partner = {
  id: string;
  name: string;
  contact_person: string;
  address: string;
  email: string;
  relation_start_date: string;
  last_contact_date: string;
  relation_status: RelationStatus;
  created_at?: string;
};

type PartnerDraft = Pick<
  Partner,
  "name" | "address" | "relation_start_date" | "contact_person" | "email"
>;

type PartnerAction = {
  id: string;
  partner_id: string;
  action_date: string;
  description: string;
  status: ActionStatus;
  created_at?: string;
};

type ActionDraft = Pick<
  PartnerAction,
  "partner_id" | "action_date" | "description" | "status"
>;

type SupabaseConnection = {
  client: SupabaseClient | null;
  error: string;
};

const partnerStorageKey = "easycrm_relations_partners";
const actionStorageKey = "easycrm_relations_actions";

const relationStatuses: RelationStatus[] = [
  "w oczekiwaniu na odpowiedź",
  "w trakcie testowania",
  "czeka na odpowiedź",
  "nieznany"
];

const emptyPartnerDraft: PartnerDraft = {
  name: "",
  address: "",
  relation_start_date: "",
  contact_person: "",
  email: ""
};

const emptyActionDraft: ActionDraft = {
  partner_id: "",
  action_date: "",
  description: "",
  status: "nadchodzące"
};

const demoPartners: Partner[] = [
  {
    id: "demo-partner-1",
    name: "Trefl Gdańsk",
    contact_person: "Anna Krawiec",
    address: "Gdańsk",
    email: "partnerzy@trefl.example",
    relation_start_date: "2026-02-14",
    last_contact_date: "2026-04-25",
    relation_status: "w oczekiwaniu na odpowiedź"
  },
  {
    id: "demo-partner-2",
    name: "Wisła Kraków",
    contact_person: "Michał Lis",
    address: "Kraków",
    email: "kontakt@wisla.example",
    relation_start_date: "2026-03-08",
    last_contact_date: "2026-04-25",
    relation_status: "w trakcie testowania"
  },
  {
    id: "demo-partner-3",
    name: "Marcin Szewczyk",
    contact_person: "Marcin Szewczyk",
    address: "Warszawa",
    email: "marcin@example.com",
    relation_start_date: "2026-01-20",
    last_contact_date: "2026-04-25",
    relation_status: "czeka na odpowiedź"
  }
];

const demoActions: PartnerAction[] = [
  {
    id: "demo-action-1",
    partner_id: "demo-partner-1",
    action_date: "2026-04-25",
    description: "Zapytać o przebieg prac",
    status: "wykonane"
  },
  {
    id: "demo-action-2",
    partner_id: "demo-partner-2",
    action_date: "2026-04-28",
    description: "Ustalić termin kolejnego testu",
    status: "nadchodzące"
  }
];

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
    last_contact_date: draft.relation_start_date,
    relation_status: "nieznany"
  };
}

function createAction(draft: ActionDraft): PartnerAction {
  return {
    ...draft,
    id: crypto.randomUUID()
  };
}

export default function Home() {
  const supabaseConnection = useMemo(() => getSupabaseConnection(), []);
  const supabase = supabaseConnection.client;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [actions, setActions] = useState<PartnerAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<"partner" | "action" | null>(null);
  const [partnerDraft, setPartnerDraft] =
    useState<PartnerDraft>(emptyPartnerDraft);
  const [actionDraft, setActionDraft] = useState<ActionDraft>(emptyActionDraft);
  const [actionRelationStatus, setActionRelationStatus] =
    useState<RelationStatus>("nieznany");
  const [partnerSort, setPartnerSort] = useState<PartnerSort>("next");
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (supabaseConnection.error) {
        setErrorMessage(supabaseConnection.error);
      }

      if (supabase) {
        const [partnersResult, actionsResult] = await Promise.all([
          supabase.from("partners").select("*").order("created_at"),
          supabase.from("actions").select("*").order("action_date")
        ]);

        if (partnersResult.error) {
          setErrorMessage(partnersResult.error.message);
          setPartners([]);
          setActions([]);
        } else {
          setPartners(partnersResult.data ?? []);
          setActions(actionsResult.error ? [] : (actionsResult.data ?? []));

          if (actionsResult.error) {
            setErrorMessage(
              `${actionsResult.error.message}. Uruchom migrację supabase/migration_v02_relations.sql w Supabase SQL Editor.`
            );
          }
        }

        setIsLoading(false);
        return;
      }

      const savedPartners = window.localStorage.getItem(partnerStorageKey);
      const savedActions = window.localStorage.getItem(actionStorageKey);

      setPartners(savedPartners ? JSON.parse(savedPartners) : demoPartners);
      setActions(savedActions ? JSON.parse(savedActions) : demoActions);
      setIsLoading(false);
    }

    loadData();
  }, [supabase, supabaseConnection.error]);

  useEffect(() => {
    if (!supabase && !isLoading) {
      window.localStorage.setItem(partnerStorageKey, JSON.stringify(partners));
      window.localStorage.setItem(actionStorageKey, JSON.stringify(actions));
    }
  }, [actions, isLoading, partners, supabase]);

  const sortedActions = [...actions].sort(
    (first, second) =>
      new Date(first.action_date).getTime() -
      new Date(second.action_date).getTime()
  );
  const upcomingActions = sortedActions.filter(
    (action) => action.status === "nadchodzące"
  );

  const partnerLookup = useMemo(
    () => new Map(partners.map((partner) => [partner.id, partner])),
    [partners]
  );

  const partnersWithNextActions = partners
    .map((partner) => ({
      partner,
      nextAction: upcomingActions.find(
        (action) => action.partner_id === partner.id
      )
    }))
    .sort((first, second) => {
      if (partnerSort === "name") {
        return first.partner.name.localeCompare(second.partner.name, "pl");
      }

      return (
        getDateTimestamp(first.nextAction?.action_date) -
        getDateTimestamp(second.nextAction?.action_date)
      );
    });

  function openActionModal(partnerId = "") {
    const selectedPartnerId = partnerId || partners[0]?.id || "";

    setActionDraft({
      ...emptyActionDraft,
      partner_id: selectedPartnerId
    });
    setActionRelationStatus(
      partnerLookup.get(selectedPartnerId)?.relation_status ?? "nieznany"
    );
    setModal("action");
  }

  async function handleAddPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPartner = createPartner(partnerDraft);

    if (supabase) {
      const { data, error } = await supabase
        .from("partners")
        .insert(nextPartner)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setPartners((current) => [...current, data]);
    } else {
      setPartners((current) => [...current, nextPartner]);
    }

    setPartnerDraft(emptyPartnerDraft);
    setModal(null);
  }

  async function handleAddAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!actionDraft.partner_id) {
      setErrorMessage("Najpierw dodaj lub wybierz partnera.");
      return;
    }

    const nextAction = createAction(actionDraft);

    if (supabase) {
      const { data, error } = await supabase
        .from("actions")
        .insert(nextAction)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setActions((current) => [...current, data]);

      const { error: partnerError } = await supabase
        .from("partners")
        .update({ relation_status: actionRelationStatus })
        .eq("id", actionDraft.partner_id);

      if (partnerError) {
        setErrorMessage(partnerError.message);
        return;
      }
    } else {
      setActions((current) => [...current, nextAction]);
    }

    setPartners((current) =>
      current.map((partner) =>
        partner.id === actionDraft.partner_id
          ? { ...partner, relation_status: actionRelationStatus }
          : partner
      )
    );
    setActionDraft(emptyActionDraft);
    setActionRelationStatus("nieznany");
    setModal(null);
  }

  async function updateActionStatus(action: PartnerAction, status: ActionStatus) {
    const nextAction = { ...action, status };

    if (supabase) {
      const { error } = await supabase
        .from("actions")
        .update({ status })
        .eq("id", action.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }

    setActions((current) =>
      current.map((item) => (item.id === action.id ? nextAction : item))
    );
  }

  async function updatePartnerStatus(
    partner: Partner,
    relation_status: RelationStatus
  ) {
    if (supabase) {
      const { error } = await supabase
        .from("partners")
        .update({ relation_status })
        .eq("id", partner.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }

    setPartners((current) =>
      current.map((item) =>
        item.id === partner.id ? { ...item, relation_status } : item
      )
    );
  }

  async function confirmDeletePartner() {
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
    setActions((current) =>
      current.filter((action) => action.partner_id !== deleteTarget.id)
    );
    setDeleteTarget(null);
  }

  return (
    <main className="appShell">
      <aside className="sidebar" aria-label="Menu boczne">
        <img className="brandLogo" src="/logo.svg?v=20260624" alt="EasyCRM" />
        <nav className="navList">
          <span className="navItem muted">
            <HomeIcon size={24} aria-hidden="true" />
            Home
          </span>
          <span className="navItem active">
            <Handshake size={24} aria-hidden="true" />
            Relacje
          </span>
          <span className="navItem muted">
            <Settings size={24} aria-hidden="true" />
            Ustawienia
          </span>
        </nav>
        <div className="userBlock">
          <span>Zalogowano jako</span>
          <strong>Roman Kadler</strong>
          <small>Admin</small>
          <button type="button">Wyloguj</button>
        </div>
      </aside>

      <section className="relationsView">
        {errorMessage ? (
          <div className="notice">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage("")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="topGrid">
          <section className="glassPanel actionsPanel">
            <h1>Działania</h1>
            <div className="actionsList">
              {isLoading ? (
                <p className="emptyState">Ładowanie danych...</p>
              ) : null}

              {!isLoading && upcomingActions.length === 0 ? (
                <p className="emptyState">Brak zaplanowanych działań.</p>
              ) : null}

              {upcomingActions.slice(0, 4).map((action) => {
                const partner = partnerLookup.get(action.partner_id);

                return (
                  <article className="actionRow" key={action.id}>
                    <time>{formatDate(action.action_date)}</time>
                    <div className="actionBody">
                      <strong>{partner?.name ?? "Nieznany partner"}</strong>
                      <span>Partner</span>
                      <p>{action.description}</p>
                      <StatusButton
                        value={action.status}
                        onChange={(status) => updateActionStatus(action, status)}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="quickActions">
            <button className="quickButton" onClick={() => openActionModal()}>
              <Plus size={22} aria-hidden="true" />
              Dodaj działanie
            </button>
            <button className="quickButton" onClick={() => setModal("partner")}>
              <Plus size={22} aria-hidden="true" />
              Dodaj partnera
            </button>
          </div>
        </div>

        <section className="glassPanel partnersPanel">
          <div className="panelHeader">
            <h2>Partnerzy</h2>
            <label className="sortControl">
              <span>Sortuj po:</span>
              <select
                value={partnerSort}
                onChange={(event) =>
                  setPartnerSort(event.target.value as PartnerSort)
                }
              >
                <option value="next">Data następnego kontaktu</option>
                <option value="name">Nazwa partnera</option>
              </select>
              <ChevronDown size={20} aria-hidden="true" />
            </label>
          </div>

          <div className="partnersHeader" aria-hidden="true">
            <span />
            <span>Data ostatniego kontaktu</span>
            <span>Status kontaktu</span>
            <span>Następne działanie</span>
          </div>

          <div className="partnerRows">
            {partnersWithNextActions.map(({ partner, nextAction }) => (
              <article className="partnerRow" key={partner.id}>
                <strong>{partner.name}</strong>
                <time>{formatDate(partner.last_contact_date)}</time>
                <RelationStatusSelect
                  value={partner.relation_status}
                  onChange={(status) => updatePartnerStatus(partner, status)}
                />
                <div className="nextAction">
                  {nextAction ? (
                    <>
                      <time>{formatDate(nextAction.action_date)}</time>
                      <span>{nextAction.description}</span>
                      <StatusButton
                        value={nextAction.status}
                        onChange={(status) =>
                          updateActionStatus(nextAction, status)
                        }
                      />
                    </>
                  ) : (
                    <button
                      className="ghostAction"
                      onClick={() => openActionModal(partner.id)}
                    >
                      Dodaj działanie
                    </button>
                  )}
                </div>
                <button
                  className="deleteButton"
                  type="button"
                  title="Usuń partnera"
                  aria-label={`Usuń partnera ${partner.name}`}
                  onClick={() => setDeleteTarget(partner)}
                >
                  <Trash2 size={22} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>

      {modal === "partner" ? (
        <Modal title="Dodaj nowego partnera">
          <form className="modalForm partnerForm" onSubmit={handleAddPartner}>
            <Field
              label="Nazwa"
              value={partnerDraft.name}
              required
              onChange={(name) =>
                setPartnerDraft((current) => ({ ...current, name }))
              }
            />
            <Field
              label="Adres"
              value={partnerDraft.address}
              required
              onChange={(address) =>
                setPartnerDraft((current) => ({ ...current, address }))
              }
            />
            <Field
              label="Data nawiązania relacji"
              type="date"
              value={partnerDraft.relation_start_date}
              required
              onChange={(relation_start_date) =>
                setPartnerDraft((current) => ({
                  ...current,
                  relation_start_date
                }))
              }
            />
            <Field
              label="Osoba kontaktowa"
              value={partnerDraft.contact_person}
              required
              onChange={(contact_person) =>
                setPartnerDraft((current) => ({ ...current, contact_person }))
              }
            />
            <Field
              label="E-mail"
              type="email"
              value={partnerDraft.email}
              required
              onChange={(email) =>
                setPartnerDraft((current) => ({ ...current, email }))
              }
            />
            <ModalActions
              onCancel={() => {
                setPartnerDraft(emptyPartnerDraft);
                setModal(null);
              }}
            />
          </form>
        </Modal>
      ) : null}

      {modal === "action" ? (
        <Modal title="Dodaj nowe działanie">
          <form className="modalForm actionForm" onSubmit={handleAddAction}>
            <label className="field wide">
              <span>Partner</span>
              <select
                required
                value={actionDraft.partner_id}
                onChange={(event) => {
                  const partnerId = event.target.value;

                  setActionDraft((current) => ({
                    ...current,
                    partner_id: partnerId
                  }));
                  setActionRelationStatus(
                    partnerLookup.get(partnerId)?.relation_status ?? "nieznany"
                  );
                }}
              >
                <option value="" disabled>
                  Wybierz partnera
                </option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field relationStatusField">
              <span>Aktualizuj status relacji</span>
              <div className="modalStatusSelect">
                <span
                  className={`statusDot ${getStatusTone(actionRelationStatus)}`}
                  aria-hidden="true"
                />
                <select
                  value={actionRelationStatus}
                  onChange={(event) =>
                    setActionRelationStatus(event.target.value as RelationStatus)
                  }
                >
                  {relationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown size={22} aria-hidden="true" />
              </div>
            </label>
            <Field
              label="Data"
              type="date"
              value={actionDraft.action_date}
              required
              onChange={(action_date) =>
                setActionDraft((current) => ({ ...current, action_date }))
              }
            />
            <Field
              label="Opis"
              value={actionDraft.description}
              required
              onChange={(description) =>
                setActionDraft((current) => ({ ...current, description }))
              }
              className="wide"
            />
            <ModalActions
              onCancel={() => {
                setActionDraft(emptyActionDraft);
                setModal(null);
              }}
            />
          </form>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <ConfirmModal
          title="Usunąć partnera?"
          message={`Czy na pewno chcesz usunąć partnera ${deleteTarget.name}? Powiązane działania też znikną z listy.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeletePartner}
        />
      ) : null}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
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

function Modal({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalPanel">
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}

function ModalActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="modalActions">
      <button type="button" onClick={onCancel}>
        Anuluj
      </button>
      <button type="submit">
        <Check size={20} aria-hidden="true" />
        Zapisz
      </button>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalPanel confirmPanel">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modalActions">
          <button type="button" onClick={onCancel}>
            Anuluj
          </button>
          <button type="button" className="dangerAction" onClick={onConfirm}>
            <Trash2 size={20} aria-hidden="true" />
            Usuń
          </button>
        </div>
      </section>
    </div>
  );
}

function StatusButton({
  value,
  onChange
}: {
  value: ActionStatus;
  onChange: (status: ActionStatus) => void;
}) {
  return (
    <label className="statusSelect">
      <CalendarDays size={16} aria-hidden="true" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ActionStatus)}
      >
        <option value="nadchodzące">Nadchodzące</option>
        <option value="wykonane">Wykonane</option>
      </select>
      <ChevronDown size={18} aria-hidden="true" />
    </label>
  );
}

function RelationStatusSelect({
  value,
  onChange
}: {
  value: RelationStatus;
  onChange: (status: RelationStatus) => void;
}) {
  return (
    <label className="relationStatus">
      <span
        className={`statusDot ${getStatusTone(value)}`}
        aria-hidden="true"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RelationStatus)}
      >
        {relationStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <ChevronDown size={18} aria-hidden="true" />
    </label>
  );
}

function getStatusTone(status: RelationStatus) {
  if (status === "w trakcie testowania") {
    return "green";
  }

  if (status === "czeka na odpowiedź") {
    return "red";
  }

  if (status === "w oczekiwaniu na odpowiedź") {
    return "yellow";
  }

  return "gray";
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pl-PL").format(new Date(value));
}

function getDateTimestamp(value?: string) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  return new Date(value).getTime();
}
