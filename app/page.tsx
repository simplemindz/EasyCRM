"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
type PanelLayout = "top-collapsed" | "balanced" | "bottom-collapsed";
type PartnerTab = "general" | "equipment" | "accounts" | "history";
type PartnerEditorMode = "create" | "edit";
type PartnerType = "pilotaż" | "tester" | "dystrybutor" | "inny";
type AgreementStatus = "tak" | "nie" | "w trakcie";
type CommunicationGroup = "whatsapp" | "signal" | "telegram" | "messenger" | "inna";

type Partner = {
  id: string;
  name: string;
  legal_name: string;
  partner_type: PartnerType;
  contact_person: string;
  address: string;
  email: string;
  phone: string;
  agreement_status: AgreementStatus;
  communication_group: CommunicationGroup;
  group_name: string;
  application: string;
  note: string;
  relation_start_date: string;
  last_contact_date: string;
  relation_status: RelationStatus;
  contacts: PartnerContact[];
  accountLists: PartnerAccountList[];
  accountFields: PartnerAccountField[];
  created_at?: string;
};

type PartnerContact = {
  id: string;
  partner_id?: string;
  name: string;
  email: string;
  phone: string;
};

type PartnerAccountList = {
  id: string;
  partner_id?: string;
  name: string;
  items: PartnerAccountItem[];
};

type PartnerAccountItem = {
  id: string;
  list_id?: string;
  account_number: string;
  login: string;
  password: string;
};

type PartnerAccountField = {
  id: string;
  partner_id?: string;
  name: string;
  value: string;
};

type PartnerDraft = Pick<
  Partner,
  | "name"
  | "legal_name"
  | "partner_type"
  | "address"
  | "relation_start_date"
  | "contact_person"
  | "email"
  | "phone"
  | "agreement_status"
  | "communication_group"
  | "group_name"
  | "application"
  | "note"
> & {
  contacts: PartnerContact[];
  accountLists: PartnerAccountList[];
  accountFields: PartnerAccountField[];
};

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
const contactStorageKey = "easycrm_relations_contacts";
const accountListStorageKey = "easycrm_relations_account_lists";
const accountFieldStorageKey = "easycrm_relations_account_fields";

const relationStatuses: RelationStatus[] = [
  "w oczekiwaniu na odpowiedź",
  "w trakcie testowania",
  "czeka na odpowiedź",
  "nieznany"
];

const partnerTabs: { id: PartnerTab; label: string }[] = [
  { id: "general", label: "Informacje ogólne" },
  { id: "equipment", label: "Sprzęt" },
  { id: "accounts", label: "Konta" },
  { id: "history", label: "Historia relacji" }
];

const editablePartnerTabs: { id: Exclude<PartnerTab, "history">; label: string }[] = [
  { id: "general", label: "Informacje ogólne" },
  { id: "equipment", label: "Sprzęt" },
  { id: "accounts", label: "Konta" }
];

const partnerTypes: PartnerType[] = ["pilotaż", "tester", "dystrybutor", "inny"];
const agreementStatuses: AgreementStatus[] = ["tak", "nie", "w trakcie"];
const communicationGroups: CommunicationGroup[] = [
  "whatsapp",
  "signal",
  "telegram",
  "messenger",
  "inna"
];

const emptyPartnerDraft: PartnerDraft = {
  name: "",
  legal_name: "",
  partner_type: "pilotaż",
  address: "",
  relation_start_date: "",
  contact_person: "",
  email: "",
  phone: "",
  agreement_status: "nie",
  communication_group: "whatsapp",
  group_name: "",
  application: "",
  note: "",
  contacts: [],
  accountLists: [],
  accountFields: []
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
    legal_name: "Trefl Gdańsk S.A.",
    partner_type: "tester",
    contact_person: "Anna Krawiec",
    address: "Gdańsk",
    email: "partnerzy@trefl.example",
    phone: "+48 234 234 234",
    agreement_status: "w trakcie",
    communication_group: "whatsapp",
    group_name: "Trefl testy",
    application: "RevoCure VR",
    note: "",
    relation_start_date: "2026-02-14",
    last_contact_date: "2026-04-25",
    relation_status: "w oczekiwaniu na odpowiedź",
    contacts: [
      {
        id: "demo-contact-1",
        name: "Anna Krawiec",
        email: "partnerzy@trefl.example",
        phone: "+48 234 234 234"
      }
    ],
    accountLists: [],
    accountFields: []
  },
  {
    id: "demo-partner-2",
    name: "Wisła Kraków",
    legal_name: "Wisła Kraków S.A.",
    partner_type: "pilotaż",
    contact_person: "Michał Lis",
    address: "Kraków",
    email: "kontakt@wisla.example",
    phone: "+48 234 234 234",
    agreement_status: "tak",
    communication_group: "whatsapp",
    group_name: "Wisła pilotaż",
    application: "RevoCure VR",
    note: "",
    relation_start_date: "2026-03-08",
    last_contact_date: "2026-04-25",
    relation_status: "w trakcie testowania",
    contacts: [
      {
        id: "demo-contact-2",
        name: "Michał Lis",
        email: "kontakt@wisla.example",
        phone: "+48 234 234 234"
      }
    ],
    accountLists: [
      {
        id: "demo-account-list-1",
        name: "Konta RevoCure VR",
        items: [
          {
            id: "demo-account-item-1",
            account_number: "2342342344",
            login: "MarWłaz",
            password: "************"
          }
        ]
      }
    ],
    accountFields: [
      {
        id: "demo-account-field-1",
        name: "Konto Google organizacji",
        value: "Wisla@gmail.com"
      }
    ]
  },
  {
    id: "demo-partner-3",
    name: "Marcin Szewczyk",
    legal_name: "Marcin Szewczyk",
    partner_type: "inny",
    contact_person: "Marcin Szewczyk",
    address: "Warszawa",
    email: "marcin@example.com",
    phone: "+48 234 234 234",
    agreement_status: "nie",
    communication_group: "signal",
    group_name: "",
    application: "",
    note: "",
    relation_start_date: "2026-01-20",
    last_contact_date: "2026-04-25",
    relation_status: "czeka na odpowiedź",
    contacts: [
      {
        id: "demo-contact-3",
        name: "Marcin Szewczyk",
        email: "marcin@example.com",
        phone: "+48 234 234 234"
      }
    ],
    accountLists: [],
    accountFields: []
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
    name: draft.name,
    legal_name: draft.legal_name,
    partner_type: draft.partner_type,
    contact_person: draft.contact_person,
    address: draft.address,
    email: draft.email,
    phone: draft.phone,
    agreement_status: draft.agreement_status,
    communication_group: draft.communication_group,
    group_name: draft.group_name,
    application: draft.application,
    note: draft.note,
    relation_start_date: draft.relation_start_date,
    id: crypto.randomUUID(),
    last_contact_date: draft.relation_start_date,
    relation_status: "nieznany",
    contacts: draft.contacts,
    accountLists: draft.accountLists,
    accountFields: draft.accountFields
  };
}

function normalizePartner(partner: Partner): Partner {
  const contacts = partner.contacts?.length
    ? partner.contacts
    : [
        {
          id: crypto.randomUUID(),
          name: partner.contact_person ?? "",
          email: partner.email ?? "",
          phone: partner.phone ?? ""
        }
      ];

  return {
    ...partner,
    legal_name: partner.legal_name ?? partner.name,
    partner_type: partner.partner_type ?? "inny",
    phone: partner.phone ?? "",
    agreement_status: partner.agreement_status ?? "nie",
    communication_group: partner.communication_group ?? "inna",
    group_name: partner.group_name ?? "",
    application: partner.application ?? "",
    note: partner.note ?? "",
    contacts,
    accountLists: partner.accountLists ?? [],
    accountFields: partner.accountFields ?? []
  };
}

function createDraftFromPartner(partner: Partner): PartnerDraft {
  const normalized = normalizePartner(partner);

  return {
    name: normalized.name,
    legal_name: normalized.legal_name,
    partner_type: normalized.partner_type,
    address: normalized.address,
    relation_start_date: normalized.relation_start_date,
    contact_person: normalized.contact_person,
    email: normalized.email,
    phone: normalized.phone,
    agreement_status: normalized.agreement_status,
    communication_group: normalized.communication_group,
    group_name: normalized.group_name,
    application: normalized.application,
    note: normalized.note,
    contacts: normalized.contacts,
    accountLists: normalized.accountLists,
    accountFields: normalized.accountFields
  };
}

function createEmptyAccountList(): PartnerAccountList {
  return {
    id: crypto.randomUUID(),
    name: "Nazwa listy",
    items: []
  };
}

function createEmptyAccountField(): PartnerAccountField {
  return {
    id: crypto.randomUUID(),
    name: "Nazwa typu konta",
    value: ""
  };
}

function mergePartnerDetails(
  partners: Partner[],
  contacts: PartnerContact[],
  accountLists: PartnerAccountList[],
  accountFields: PartnerAccountField[]
) {
  return partners.map((partner) =>
    normalizePartner({
      ...partner,
      contacts: contacts.filter((contact) => contact.partner_id === partner.id),
      accountLists: accountLists.filter((list) => list.partner_id === partner.id),
      accountFields: accountFields.filter((field) => field.partner_id === partner.id)
    })
  );
}

function mapAccountListsWithItems(
  lists: Array<PartnerAccountList & { sort_order?: number }>,
  items: Array<PartnerAccountItem & { sort_order?: number }>
) {
  return lists
    .map((list) => ({
      ...list,
      items: items
        .filter((item) => item.list_id === list.id)
        .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
    }))
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0));
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
  const [partnerEditorMode, setPartnerEditorMode] =
    useState<PartnerEditorMode>("create");
  const [editingPartnerId, setEditingPartnerId] = useState("");
  const [partnerDraft, setPartnerDraft] =
    useState<PartnerDraft>(emptyPartnerDraft);
  const [partnerEditorTab, setPartnerEditorTab] =
    useState<Exclude<PartnerTab, "history">>("general");
  const [actionDraft, setActionDraft] = useState<ActionDraft>(emptyActionDraft);
  const [actionRelationStatus, setActionRelationStatus] =
    useState<RelationStatus>("nieznany");
  const [partnerSort, setPartnerSort] = useState<PartnerSort>("next");
  const [panelLayout, setPanelLayout] = useState<PanelLayout>("balanced");
  const [openPartnerId, setOpenPartnerId] = useState("");
  const [partnerTab, setPartnerTab] = useState<PartnerTab>("general");
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (supabaseConnection.error) {
        setErrorMessage(supabaseConnection.error);
      }

      if (supabase) {
        const [
          partnersResult,
          actionsResult,
          contactsResult,
          accountListsResult,
          accountItemsResult,
          accountFieldsResult
        ] = await Promise.all([
          supabase.from("partners").select("*").order("created_at"),
          supabase.from("actions").select("*").order("action_date"),
          supabase.from("partner_contacts").select("*").order("created_at"),
          supabase.from("partner_account_lists").select("*").order("sort_order"),
          supabase.from("partner_account_items").select("*").order("sort_order"),
          supabase.from("partner_account_fields").select("*").order("sort_order")
        ]);

        if (partnersResult.error) {
          setErrorMessage(partnersResult.error.message);
          setPartners([]);
          setActions([]);
        } else {
          const contacts = contactsResult.error ? [] : (contactsResult.data ?? []);
          const accountItems = accountItemsResult.error
            ? []
            : (accountItemsResult.data ?? []);
          const accountLists = accountListsResult.error
            ? []
            : mapAccountListsWithItems(accountListsResult.data ?? [], accountItems);
          const accountFields = accountFieldsResult.error
            ? []
            : (accountFieldsResult.data ?? []);

          setPartners(
            mergePartnerDetails(
              partnersResult.data ?? [],
              contacts,
              accountLists,
              accountFields
            )
          );
          setActions(actionsResult.error ? [] : (actionsResult.data ?? []));

          if (actionsResult.error) {
            setErrorMessage(
              `${actionsResult.error.message}. Uruchom migrację supabase/migration_v02_relations.sql w Supabase SQL Editor.`
            );
          }

          if (contactsResult.error || accountListsResult.error || accountFieldsResult.error) {
            setErrorMessage(
              "Uruchom migrację supabase/migration_v03_partner_details.sql w Supabase SQL Editor, żeby zapisywać kontakty i konta."
            );
          }
        }

        setIsLoading(false);
        return;
      }

      const savedPartners = window.localStorage.getItem(partnerStorageKey);
      const savedActions = window.localStorage.getItem(actionStorageKey);

      setPartners(
        savedPartners
          ? JSON.parse(savedPartners).map(normalizePartner)
          : demoPartners
      );
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

  const isActionsCollapsed = panelLayout === "top-collapsed";
  const isPartnersCollapsed = panelLayout === "bottom-collapsed";
  const openPartner = openPartnerId ? partnerLookup.get(openPartnerId) : null;
  const openPartnerActions = openPartner
    ? sortedActions.filter((action) => action.partner_id === openPartner.id)
    : [];

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

  function openPartnerEditor(mode: PartnerEditorMode, partner?: Partner) {
    setPartnerEditorMode(mode);
    setEditingPartnerId(partner?.id ?? "");
    setPartnerDraft(partner ? createDraftFromPartner(partner) : emptyPartnerDraft);
    setPartnerEditorTab("general");
    setModal("partner");
  }

  function expandActionsPanel() {
    if (openPartner) {
      return;
    }

    setPanelLayout((current) => {
      if (current === "top-collapsed") {
        return "balanced";
      }

      return "bottom-collapsed";
    });
  }

  function expandPartnersPanel() {
    setPanelLayout((current) => {
      if (current === "bottom-collapsed") {
        return "balanced";
      }

      return "top-collapsed";
    });
  }

  function openPartnerDetails(partnerId: string) {
    setOpenPartnerId(partnerId);
    setPartnerTab("general");
    setPanelLayout("top-collapsed");
  }

  function closePartnerDetails() {
    setOpenPartnerId("");
    setPartnerTab("general");
  }

  async function handleAddPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPartner = createPartner(partnerDraft);
    const partnerPayload = {
      name: nextPartner.name,
      legal_name: nextPartner.legal_name,
      partner_type: nextPartner.partner_type,
      contact_person: nextPartner.contact_person,
      address: nextPartner.address,
      email: nextPartner.email,
      phone: nextPartner.phone,
      agreement_status: nextPartner.agreement_status,
      communication_group: nextPartner.communication_group,
      group_name: nextPartner.group_name,
      application: nextPartner.application,
      note: nextPartner.note,
      relation_start_date: nextPartner.relation_start_date,
      last_contact_date: nextPartner.last_contact_date,
      relation_status: nextPartner.relation_status
    };

    if (supabase) {
      const request =
        partnerEditorMode === "edit" && editingPartnerId
          ? supabase
              .from("partners")
              .update({
                ...partnerPayload,
                last_contact_date:
                  partnerLookup.get(editingPartnerId)?.last_contact_date ??
                  partnerPayload.last_contact_date,
                relation_status:
                  partnerLookup.get(editingPartnerId)?.relation_status ??
                  partnerPayload.relation_status
              })
              .eq("id", editingPartnerId)
              .select()
              .single()
          : supabase.from("partners").insert(partnerPayload).select().single();

      const { data, error } = await request;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await replacePartnerDetails(data.id, partnerDraft);
      const partnerWithDetails = normalizePartner({
        ...data,
        contacts: partnerDraft.contacts,
        accountLists: partnerDraft.accountLists,
        accountFields: partnerDraft.accountFields
      });

      setPartners((current) =>
        partnerEditorMode === "edit" && editingPartnerId
          ? current.map((partner) =>
              partner.id === editingPartnerId ? partnerWithDetails : partner
            )
          : [...current, partnerWithDetails]
      );
    } else {
      setPartners((current) =>
        partnerEditorMode === "edit" && editingPartnerId
          ? current.map((partner) =>
              partner.id === editingPartnerId
                ? {
                    ...nextPartner,
                    id: partner.id,
                    last_contact_date: partner.last_contact_date,
                    relation_status: partner.relation_status
                  }
                : partner
            )
          : [...current, nextPartner]
      );
    }

    setPartnerDraft(emptyPartnerDraft);
    setEditingPartnerId("");
    setPartnerEditorMode("create");
    if (editingPartnerId) {
      setOpenPartnerId(editingPartnerId);
    }
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

  async function replacePartnerDetails(partnerId: string, draft: PartnerDraft) {
    if (!supabase) {
      return;
    }

    const contacts = draft.contacts
      .filter((contact) => contact.name || contact.email || contact.phone)
      .map((contact) => ({
        id: contact.id,
        partner_id: partnerId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone
      }));
    const accountLists = draft.accountLists.map((list, index) => ({
      id: list.id,
      partner_id: partnerId,
      name: list.name,
      sort_order: index
    }));
    const accountItems = draft.accountLists.flatMap((list) =>
      list.items.map((item, index) => ({
        id: item.id,
        list_id: list.id,
        account_number: item.account_number,
        login: item.login,
        password: item.password,
        sort_order: index
      }))
    );
    const accountFields = draft.accountFields.map((field, index) => ({
      id: field.id,
      partner_id: partnerId,
      name: field.name,
      value: field.value,
      sort_order: index
    }));

    await supabase.from("partner_contacts").delete().eq("partner_id", partnerId);
    await supabase.from("partner_account_fields").delete().eq("partner_id", partnerId);
    await supabase.from("partner_account_lists").delete().eq("partner_id", partnerId);

    if (contacts.length) {
      await supabase.from("partner_contacts").insert(contacts);
    }

    if (accountLists.length) {
      await supabase.from("partner_account_lists").insert(accountLists);
    }

    if (accountItems.length) {
      await supabase.from("partner_account_items").insert(accountItems);
    }

    if (accountFields.length) {
      await supabase.from("partner_account_fields").insert(accountFields);
    }
  }

  function updatePartnerAccountLists(
    partnerId: string,
    updater: (lists: PartnerAccountList[]) => PartnerAccountList[]
  ) {
    setPartners((current) =>
      current.map((partner) =>
        partner.id === partnerId
          ? { ...partner, accountLists: updater(partner.accountLists) }
          : partner
      )
    );
  }

  function addPartnerAccountItem(partnerId: string, listId: string) {
    const item: PartnerAccountItem = {
      id: crypto.randomUUID(),
      account_number: "",
      login: "",
      password: ""
    };

    if (supabase) {
      void supabase.from("partner_account_items").insert({
        id: item.id,
        list_id: listId,
        account_number: item.account_number,
        login: item.login,
        password: item.password,
        sort_order:
          partnerLookup
            .get(partnerId)
            ?.accountLists.find((list) => list.id === listId)?.items.length ?? 0
      });
    }

    updatePartnerAccountLists(partnerId, (lists) =>
      lists.map((list) =>
        list.id === listId ? { ...list, items: [...list.items, item] } : list
      )
    );
  }

  function removePartnerAccountItem(
    partnerId: string,
    listId: string,
    itemId: string
  ) {
    if (supabase) {
      void supabase.from("partner_account_items").delete().eq("id", itemId);
    }

    updatePartnerAccountLists(partnerId, (lists) =>
      lists.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((item) => item.id !== itemId) }
          : list
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
    if (deleteTarget.id === openPartnerId) {
      closePartnerDetails();
    }
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

      <section className={`relationsView layout-${panelLayout}`}>
        {errorMessage ? (
          <div className="notice">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage("")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <section className="glassPanel actionsPanel">
          <PanelControls
            title="Najbliższe działania"
            upDisabled={Boolean(openPartner) || panelLayout === "top-collapsed"}
            downDisabled={Boolean(openPartner) || panelLayout === "bottom-collapsed"}
            onUp={expandPartnersPanel}
            onDown={expandActionsPanel}
          />

          {!isActionsCollapsed ? (
            <div className="actionsContent">
              <div className="actionsList">
              {isLoading ? (
                <p className="emptyState">Ładowanie danych...</p>
              ) : null}

              {!isLoading && upcomingActions.length === 0 ? (
                <p className="emptyState">Brak zaplanowanych działań.</p>
              ) : null}

                {upcomingActions.map((action) => {
                const partner = partnerLookup.get(action.partner_id);

                return (
                  <article className="actionRow" key={action.id}>
                    <time>{formatDate(action.action_date)}</time>
                    <div className="actionBody">
                      <strong>{partner?.name ?? "Nieznany partner"}</strong>
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

              <button className="quickButton" onClick={() => openActionModal()}>
                <Plus size={22} aria-hidden="true" />
                Dodaj działanie
              </button>
            </div>
          ) : null}
        </section>

        <section className="glassPanel partnersPanel">
          <PanelControls
            title="Partnerzy"
            upDisabled={panelLayout === "top-collapsed"}
            downDisabled={panelLayout === "bottom-collapsed"}
            onUp={expandPartnersPanel}
            onDown={expandActionsPanel}
          />

          {!isPartnersCollapsed ? (
            <div className="partnersContent">
              {openPartner ? (
                <PartnerDetails
                  actions={openPartnerActions}
                  activeTab={partnerTab}
                  onCancel={closePartnerDetails}
                  onDelete={() => setDeleteTarget(openPartner)}
                  onEdit={() => openPartnerEditor("edit", openPartner)}
                  onSave={closePartnerDetails}
                  onTabChange={setPartnerTab}
                  onAddAccountItem={addPartnerAccountItem}
                  onRemoveAccountItem={removePartnerAccountItem}
                  partner={openPartner}
                  updateActionStatus={updateActionStatus}
                />
              ) : (
                <>
                  <div className="panelToolbar">
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
                    <span>Obecny status</span>
                    <span>Następne działanie</span>
                  </div>

                  <div className="partnerRows">
                    {partnersWithNextActions.map(({ partner, nextAction }) => (
                      <article className="partnerRow" key={partner.id}>
                        <strong>{partner.name}</strong>
                        <time>{formatDate(partner.last_contact_date)}</time>
                        <RelationStatusSelect
                          value={partner.relation_status}
                          onChange={(status) =>
                            updatePartnerStatus(partner, status)
                          }
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
                          className="openPartnerButton"
                          type="button"
                          title="Otwórz partnera"
                          aria-label={`Otwórz partnera ${partner.name}`}
                          onClick={() => openPartnerDetails(partner.id)}
                        >
                          <ChevronRight size={22} aria-hidden="true" />
                        </button>
                      </article>
                    ))}
                  </div>
                  <button
                    className="addPartnerButton"
                    type="button"
                    onClick={() => openPartnerEditor("create")}
                  >
                    <Plus size={18} aria-hidden="true" />
                    Dodaj partnera
                  </button>
                </>
              )}
            </div>
          ) : null}
        </section>
      </section>

      {modal === "partner" ? (
        <PartnerEditorModal
          draft={partnerDraft}
          mode={partnerEditorMode}
          onCancel={() => {
            setPartnerDraft(emptyPartnerDraft);
            setEditingPartnerId("");
            setPartnerEditorMode("create");
            setModal(null);
          }}
          onChange={setPartnerDraft}
          onSubmit={handleAddPartner}
          onTabChange={setPartnerEditorTab}
          tab={partnerEditorTab}
        />
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

function PartnerEditorModal({
  draft,
  mode,
  tab,
  onTabChange,
  onChange,
  onCancel,
  onSubmit
}: {
  draft: PartnerDraft;
  mode: PartnerEditorMode;
  tab: Exclude<PartnerTab, "history">;
  onTabChange: (tab: Exclude<PartnerTab, "history">) => void;
  onChange: (draft: PartnerDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function update<K extends keyof PartnerDraft>(key: K, value: PartnerDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  function addContact() {
    onChange({
      ...draft,
      contacts: [
        ...draft.contacts,
        { id: crypto.randomUUID(), name: "", email: "", phone: "" }
      ]
    });
  }

  function addAccountList() {
    if (draft.accountLists.length >= 3) {
      return;
    }

    onChange({ ...draft, accountLists: [...draft.accountLists, createEmptyAccountList()] });
  }

  function addAccountField() {
    if (draft.accountFields.length >= 5) {
      return;
    }

    onChange({ ...draft, accountFields: [...draft.accountFields, createEmptyAccountField()] });
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalPanel partnerEditorPanel">
        <form className="partnerEditorForm" onSubmit={onSubmit}>
          <header className="partnerEditorHeader">
            <h2>{mode === "edit" ? "Edytuj partnera" : "Dodaj nowego partnera"}</h2>
            <div className="partnerTabs editorTabs" role="tablist" aria-label="Sekcje formularza partnera">
              {editablePartnerTabs.map((item) => (
                <button
                  className={tab === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          <div className="partnerEditorBody">
            {tab === "general" ? (
              <div className="editorGeneralGrid">
                <EditorField label="Nazwa partnera" required value={draft.name} onChange={(value) => update("name", value)} />
                <EditorField label="Nazwa partnera" value={draft.legal_name} onChange={(value) => update("legal_name", value)} />
                <EditorField label="E-mail" type="email" value={draft.email} onChange={(value) => update("email", value)} />
                <EditorField label="Telefon" value={draft.phone} onChange={(value) => update("phone", value)} />
                <EditorSelect label="Typ" value={draft.partner_type} options={partnerTypes} onChange={(value) => update("partner_type", value as PartnerType)} />
                <EditorField label="Data rozpoczęcia współpracy" type="date" required value={draft.relation_start_date} onChange={(value) => update("relation_start_date", value)} />
                <EditorSelect label="Podpisana umowa współpracy" value={draft.agreement_status} options={agreementStatuses} onChange={(value) => update("agreement_status", value as AgreementStatus)} />
                <EditorSelect label="Grupa komunikacyjna" value={draft.communication_group} options={communicationGroups} onChange={(value) => update("communication_group", value as CommunicationGroup)} />
                <EditorField className="groupNameField" label="Nazwa grupy" value={draft.group_name} onChange={(value) => update("group_name", value)} />
                <label className="editorArea">
                  <span>Notatka</span>
                  <textarea value={draft.note} onChange={(event) => update("note", event.target.value)} />
                </label>
                <section className="editorContacts">
                  <span>Osoby kontaktowe</span>
                  {draft.contacts.map((contact, index) => (
                    <div className="editorContactRow" key={contact.id}>
                      <input
                        placeholder="Imię i nazwisko"
                        value={contact.name}
                        onChange={(event) => {
                          const contacts = [...draft.contacts];
                          contacts[index] = { ...contact, name: event.target.value };
                          onChange({
                            ...draft,
                            contacts,
                            contact_person:
                              index === 0 ? event.target.value : draft.contact_person
                          });
                        }}
                      />
                      <input
                        placeholder="E-mail"
                        value={contact.email}
                        onChange={(event) => {
                          const contacts = [...draft.contacts];
                          contacts[index] = { ...contact, email: event.target.value };
                          onChange({ ...draft, contacts });
                        }}
                      />
                      <input
                        placeholder="Telefon"
                        value={contact.phone}
                        onChange={(event) => {
                          const contacts = [...draft.contacts];
                          contacts[index] = { ...contact, phone: event.target.value };
                          onChange({ ...draft, contacts });
                        }}
                      />
                    </div>
                  ))}
                  <button className="addInlineButton" type="button" onClick={addContact}>
                    + Dodaj osobę kontaktową
                  </button>
                </section>
              </div>
            ) : null}

            {tab === "equipment" ? (
              <section className="editorEmptyList">
                <span>Ewidencja sprzętu</span>
                <button className="addInlineButton" type="button">+ Dodaj urządzenie</button>
              </section>
            ) : null}

            {tab === "accounts" ? (
              <div className="editorAccountsGrid">
                {draft.accountLists.map((list, listIndex) => (
                  <section className="editorAccountPanel" key={list.id}>
                    <div className="editorAccountPanelHeader">
                      <label>
                        <span>Nazwa listy</span>
                        <input
                          value={list.name}
                          onChange={(event) => {
                            const accountLists = [...draft.accountLists];
                            accountLists[listIndex] = { ...list, name: event.target.value };
                            onChange({ ...draft, accountLists });
                          }}
                        />
                      </label>
                      <button
                        className="dangerPill"
                        type="button"
                        onClick={() =>
                          onChange({
                            ...draft,
                            accountLists: draft.accountLists.filter(
                              (item) => item.id !== list.id
                            )
                          })
                        }
                      >
                        Usuń
                      </button>
                    </div>
                    <p className="emptyState">
                      Elementy tej listy dodasz w ustawieniach partnera po zapisaniu.
                    </p>
                  </section>
                ))}
                {draft.accountLists.length < 3 ? (
                  <button className="editorAddPanel" type="button" onClick={addAccountList}>
                    Dodaj nową listę
                  </button>
                ) : null}
                <section className="editorAccountPanel">
                  {draft.accountFields.map((field, index) => (
                    <label key={field.id}>
                      <span>Nazwa typu konta</span>
                      <input
                        value={field.name}
                        onChange={(event) => {
                          const accountFields = [...draft.accountFields];
                          accountFields[index] = { ...field, name: event.target.value };
                          onChange({ ...draft, accountFields });
                        }}
                      />
                      <span>Wartość</span>
                      <input
                        value={field.value}
                        onChange={(event) => {
                          const accountFields = [...draft.accountFields];
                          accountFields[index] = { ...field, value: event.target.value };
                          onChange({ ...draft, accountFields });
                        }}
                      />
                      <button
                        className="dangerPill"
                        type="button"
                        onClick={() =>
                          onChange({
                            ...draft,
                            accountFields: draft.accountFields.filter(
                              (item) => item.id !== field.id
                            )
                          })
                        }
                      >
                        Usuń
                      </button>
                    </label>
                  ))}
                  {draft.accountFields.length < 5 ? (
                    <button className="addInlineButton" type="button" onClick={addAccountField}>
                      + Dodaj nowe konto
                    </button>
                  ) : null}
                </section>
              </div>
            ) : null}
          </div>

          <footer className="partnerEditorActions">
            <button type="button" disabled={tab === "general"} onClick={() => onTabChange(tab === "accounts" ? "equipment" : "general")}>
              Wstecz
            </button>
            <button type="button" onClick={onCancel}>
              Anuluj i wyjdź
            </button>
            <button type="submit">
              Zapisz i wyjdź
            </button>
            <button type="button" disabled={tab === "accounts"} onClick={() => onTabChange(tab === "general" ? "equipment" : "accounts")}>
              Dalej
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function EditorField({
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
    <label className={`editorField ${className}`}>
      <span>{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EditorSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="editorField editorSelect">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {capitalize(option)}
          </option>
        ))}
      </select>
      <ChevronDown size={18} aria-hidden="true" />
    </label>
  );
}

function PartnerDetails({
  partner,
  actions,
  activeTab,
  onTabChange,
  onCancel,
  onDelete,
  onEdit,
  onSave,
  onAddAccountItem,
  onRemoveAccountItem,
  updateActionStatus
}: {
  partner: Partner;
  actions: PartnerAction[];
  activeTab: PartnerTab;
  onTabChange: (tab: PartnerTab) => void;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: () => void;
  onAddAccountItem: (partnerId: string, listId: string) => void;
  onRemoveAccountItem: (partnerId: string, listId: string, itemId: string) => void;
  updateActionStatus: (action: PartnerAction, status: ActionStatus) => void;
}) {
  return (
    <div className="partnerDetails">
      <div className="partnerDetailsTop">
        <h2>{partner.name}</h2>
        <div className="partnerTabs" role="tablist" aria-label="Sekcje partnera">
          {partnerTabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="partnerDetailsBody">
        {activeTab === "general" ? <PartnerGeneralTab partner={partner} /> : null}
        {activeTab === "equipment" ? <PartnerEquipmentTab /> : null}
        {activeTab === "accounts" ? (
          <PartnerAccountsTab
            onAddAccountItem={onAddAccountItem}
            onRemoveAccountItem={onRemoveAccountItem}
            partner={partner}
          />
        ) : null}
        {activeTab === "history" ? (
          <PartnerHistoryTab
            actions={actions}
            partner={partner}
            updateActionStatus={updateActionStatus}
          />
        ) : null}
      </div>

      <div className="partnerDetailsActions">
        <button className="dangerAction" type="button" onClick={onDelete}>
          Usuń
        </button>
        <button type="button" onClick={onEdit}>Edytuj</button>
        <button type="button" onClick={onCancel}>
          Anuluj i wyjdź
        </button>
        <button className="primaryAction" type="button" onClick={onSave}>
          Zapisz i wyjdź
        </button>
      </div>
    </div>
  );
}

function PartnerGeneralTab({ partner }: { partner: Partner }) {
  return (
    <div className="detailsGrid generalGrid">
      <DetailField label="Typ partnera" value={capitalize(partner.partner_type)} />
      <DetailField label="Data rozpoczęcia współpracy" value={formatDate(partner.relation_start_date)} />
      <DetailField label="Podpisana umowa współpracy" value={capitalize(partner.agreement_status)} />
      <DetailField className="wide" label="E-mail" value={partner.email} />
      <DetailField label="Telefon" value={partner.phone} />
      <DetailField label="Grupa komunikacyjna" value={capitalize(partner.communication_group)} />
      <DetailField className="wide" label="Nazwa grupy" value={partner.group_name} />
      <DetailField label="Aplikacja" value={partner.application} />
      <DetailArea label="Notatka" value={partner.note} />
      <section className="detailCard contactsCard">
        <span>Osoby kontaktowe</span>
        {partner.contacts.map((contact) => (
          <div className="contactRow" key={contact.id}>
            <strong>{contact.name}</strong>
            <small>{contact.email}</small>
            <small>{contact.phone}</small>
            <button type="button">Edytuj</button>
            <button className="dangerPill" type="button">Usuń</button>
          </div>
        ))}
        <button className="addInlineButton" type="button">
          + Dodaj osobę kontaktową
        </button>
      </section>
    </div>
  );
}

function PartnerEquipmentTab() {
  const rows = Array.from({ length: 3 });

  return (
    <section className="detailsTableCard">
      <span>Ewidencja sprzętu</span>
      <div className="equipmentTable">
        <div className="detailsTableHeader">
          <span>Nr wewnętrzny</span>
          <span>Typ</span>
          <span>Model</span>
          <span>Nr seryjny</span>
          <span>Wypożyczenie</span>
          <span>Data użyczenia</span>
          <span>Data zwrotu</span>
          <span>Opiekun</span>
          <span />
        </div>
        {rows.map((_, index) => (
          <div className="detailsTableRow" key={index}>
            <span>334</span>
            <span>Tablet</span>
            <span>RedmiPad 2</span>
            <span>234234234234</span>
            <span>Tak</span>
            <span>31.07.2026</span>
            <span>31.07.2026</span>
            <span>Mariusz Włazły</span>
            <span className="rowActions">
              <button type="button">Edytuj</button>
              <button className="dangerPill" type="button">Usuń</button>
            </span>
          </div>
        ))}
      </div>
      <button className="addInlineButton" type="button">
        + Dodaj urządzenie
      </button>
    </section>
  );
}

function PartnerAccountsTab({
  partner,
  onAddAccountItem,
  onRemoveAccountItem
}: {
  partner: Partner;
  onAddAccountItem: (partnerId: string, listId: string) => void;
  onRemoveAccountItem: (partnerId: string, listId: string, itemId: string) => void;
}) {
  return (
    <div className="accountsGrid">
      {partner.accountLists.length === 0 ? (
        <section className="accountPanel">
          <span>Listy kont</span>
          <p className="emptyState">Dodaj listę kont w edycji partnera.</p>
        </section>
      ) : null}
      {partner.accountLists.map((list) => (
        <AccountPanel
          key={list.id}
          list={list}
          onAdd={() => onAddAccountItem(partner.id, list.id)}
          onRemove={(itemId) => onRemoveAccountItem(partner.id, list.id, itemId)}
        />
      ))}
      <section className="accountSettings">
        {partner.accountFields.length === 0 ? (
          <p className="emptyState">Brak pojedynczych kont.</p>
        ) : null}
        {partner.accountFields.map((field) => (
          <DetailField key={field.id} label={field.name} value={field.value} />
        ))}
      </section>
    </div>
  );
}

function AccountPanel({
  list,
  onAdd,
  onRemove
}: {
  list: PartnerAccountList;
  onAdd: () => void;
  onRemove: (itemId: string) => void;
}) {
  return (
    <section className="accountPanel">
      <span>{list.name}</span>
      <div className="accountHeader">
        <span>Numer</span>
        <span>Login</span>
        <span>Hasło</span>
        <span />
      </div>
      {list.items.map((item) => (
        <div className="accountRow" key={item.id}>
          <span>{item.account_number || "Numer"}</span>
          <span>{item.login || "Login"}</span>
          <span>{item.password || "Hasło"}</span>
          <button className="dangerPill" type="button" onClick={() => onRemove(item.id)}>
            Usuń
          </button>
        </div>
      ))}
      <button className="addInlineButton" type="button" onClick={onAdd}>
        + Dodaj konto
      </button>
    </section>
  );
}

function PartnerHistoryTab({
  partner,
  actions,
  updateActionStatus
}: {
  partner: Partner;
  actions: PartnerAction[];
  updateActionStatus: (action: PartnerAction, status: ActionStatus) => void;
}) {
  return (
    <section className="historyPanel">
      <span>Historia relacji</span>
      <div className="historyRows">
        {actions.length === 0 ? (
          <p className="emptyState">Brak historii relacji dla tego partnera.</p>
        ) : null}
        {actions.map((action) => (
          <article className="historyRow" key={action.id}>
            <time>{formatDate(partner.last_contact_date)}</time>
            <span
              className={`statusDot ${getStatusTone(partner.relation_status)}`}
              aria-hidden="true"
            />
            <span>{partner.relation_status}</span>
            <time>{formatDate(action.action_date)}</time>
            <p>{action.description}</p>
            <StatusButton
              value={action.status}
              onChange={(status) => updateActionStatus(action, status)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function DetailField({
  label,
  value = "",
  className = ""
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <label className={`detailField ${className}`}>
      <span>{label}</span>
      <input readOnly value={value} />
    </label>
  );
}

function DetailArea({ label, value = "" }: { label: string; value?: string }) {
  return (
    <label className="detailArea">
      <span>{label}</span>
      <textarea readOnly value={value} />
    </label>
  );
}

function PanelControls({
  title,
  upDisabled,
  downDisabled,
  onUp,
  onDown
}: {
  title: string;
  upDisabled: boolean;
  downDisabled: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="panelHeader">
      <h1>{title}</h1>
      <div className="panelArrows">
        <button
          type="button"
          aria-label={`Powiększ panel ${title}`}
          disabled={upDisabled}
          onClick={onUp}
        >
          <ChevronUp size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Zmniejsz panel ${title}`}
          disabled={downDisabled}
          onClick={onDown}
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
