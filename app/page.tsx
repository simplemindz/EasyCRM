"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Monitor,
  Handshake,
  Home as HomeIcon,
  Minus,
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
type AppView = "relations" | "equipment";
type PanelLayout = "top-collapsed" | "balanced" | "bottom-collapsed";
type PartnerTab = "general" | "equipment" | "accounts" | "history";
type PartnerEditorMode = "create" | "edit";
type PartnerType = "pilotaż" | "tester" | "dystrybutor" | "inny";
type AgreementStatus = "tak" | "nie" | "w trakcie";
type CommunicationGroup = "whatsapp" | "signal" | "telegram" | "messenger" | "inna";
type EquipmentType =
  | "komputer"
  | "laptop"
  | "tablet"
  | "VR"
  | "telefon"
  | "modem"
  | "akcesorium VR"
  | "akcesorium komputerowe"
  | "inne";
type EquipmentRelation = "wypożyczenie" | "wydanie";
type EquipmentStatus = "własny" | "wypożyczony" | "wydany" | "nieoznaczony";
type EquipmentStatusTab = EquipmentStatus;
type EquipmentSort = "alphabetical" | "internal_id";
type Currency = "PLN" | "EUR" | "USD";

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

type Equipment = {
  id: string;
  internal_id: string;
  equipment_type: EquipmentType;
  name: string;
  serial_number: string;
  purchase_date: string;
  purchase_amount: string;
  purchase_currency: Currency;
  status: EquipmentStatus;
  created_at?: string;
};

type PartnerEquipmentAssignment = {
  id: string;
  partner_id: string;
  equipment_id: string;
  guardian_name: string;
  relation: EquipmentRelation;
  boundary_date: string;
  assigned_at: string;
  returned_at: string;
  created_at?: string;
};

type EquipmentDraft = Pick<
  Equipment,
  "equipment_type" | "name" | "serial_number" | "purchase_date" | "purchase_amount" | "purchase_currency"
>;

type EquipmentAssignmentDraft = Pick<
  PartnerEquipmentAssignment,
  "equipment_id" | "guardian_name" | "relation" | "boundary_date"
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
const equipmentStorageKey = "easycrm_relations_equipment";
const equipmentAssignmentStorageKey = "easycrm_relations_equipment_assignments";

const relationStatuses: RelationStatus[] = [
  "w oczekiwaniu na odpowiedź",
  "w trakcie testowania",
  "czeka na odpowiedź",
  "nieznany"
];

const actionStatuses: ActionStatus[] = ["nadchodzące", "wykonane"];
const equipmentTypes: EquipmentType[] = [
  "komputer",
  "laptop",
  "tablet",
  "VR",
  "telefon",
  "modem",
  "akcesorium VR",
  "akcesorium komputerowe",
  "inne"
];
const equipmentRelations: EquipmentRelation[] = ["wypożyczenie", "wydanie"];
const equipmentStatusTabs: { id: EquipmentStatusTab; label: string }[] = [
  { id: "własny", label: "Własny" },
  { id: "wypożyczony", label: "Wypożyczony" },
  { id: "wydany", label: "Wydany" },
  { id: "nieoznaczony", label: "Nieoznaczony" }
];
const currencies: Currency[] = ["PLN", "EUR", "USD"];

const partnerTabs: { id: PartnerTab; label: string }[] = [
  { id: "general", label: "Informacje ogólne" },
  { id: "equipment", label: "Sprzęt" },
  { id: "accounts", label: "Konta" },
  { id: "history", label: "Historia relacji" }
];

const partnerSegmentTabs = ["Rozwojowi", "Klienci", "Dystrybutorzy"];

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

const emptyEquipmentDraft: EquipmentDraft = {
  equipment_type: "komputer",
  name: "",
  serial_number: "",
  purchase_date: "",
  purchase_amount: "",
  purchase_currency: "PLN"
};

const emptyEquipmentAssignmentDraft: EquipmentAssignmentDraft = {
  equipment_id: "",
  guardian_name: "",
  relation: "wypożyczenie",
  boundary_date: ""
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

const demoEquipment: Equipment[] = [
  {
    id: "demo-equipment-1",
    internal_id: "TA001",
    equipment_type: "tablet",
    name: "RedmiPad 2",
    serial_number: "234234234234",
    purchase_date: "2026-01-12",
    purchase_amount: "1200",
    purchase_currency: "PLN",
    status: "nieoznaczony"
  },
  {
    id: "demo-equipment-2",
    internal_id: "TA002",
    equipment_type: "tablet",
    name: "RedmiPad 2",
    serial_number: "dsfsdfsdfdsfsdf",
    purchase_date: "2026-01-12",
    purchase_amount: "1200",
    purchase_currency: "PLN",
    status: "nieoznaczony"
  },
  {
    id: "demo-equipment-3",
    internal_id: "KO001",
    equipment_type: "komputer",
    name: "Dell OptiPlex",
    serial_number: "KOM-234",
    purchase_date: "2026-02-02",
    purchase_amount: "3400",
    purchase_currency: "PLN",
    status: "własny"
  }
];

const demoEquipmentAssignments: PartnerEquipmentAssignment[] = [
  {
    id: "demo-equipment-assignment-1",
    partner_id: "demo-partner-2",
    equipment_id: "demo-equipment-1",
    guardian_name: "Michał Lis",
    relation: "wypożyczenie",
    boundary_date: "2026-07-31",
    assigned_at: "2026-04-25",
    returned_at: ""
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

function normalizeEquipment(equipment: Equipment): Equipment {
  return {
    ...equipment,
    equipment_type: equipment.equipment_type ?? "inne",
    name: equipment.name ?? "",
    serial_number: equipment.serial_number ?? "",
    purchase_date: equipment.purchase_date ?? "",
    purchase_amount:
      equipment.purchase_amount == null ? "" : String(equipment.purchase_amount),
    purchase_currency: equipment.purchase_currency ?? "PLN",
    status: equipment.status ?? "nieoznaczony"
  };
}

function normalizeEquipmentAssignment(
  assignment: PartnerEquipmentAssignment
): PartnerEquipmentAssignment {
  return {
    ...assignment,
    guardian_name: assignment.guardian_name ?? "",
    relation: assignment.relation ?? "wypożyczenie",
    boundary_date: assignment.boundary_date ?? "",
    assigned_at: assignment.assigned_at ?? new Date().toISOString().slice(0, 10),
    returned_at: assignment.returned_at ?? ""
  };
}

function normalizeForId(value: string) {
  return (value || "inne")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toUpperCase();
}

function getEquipmentPrefix(type: EquipmentType) {
  const parts = normalizeForId(type).split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 2)}`;
  }

  return parts[0].slice(0, Math.min(2, parts[0].length));
}

function generateEquipmentInternalId(type: EquipmentType, equipment: Equipment[]) {
  const prefix = getEquipmentPrefix(type);
  const nextNumber =
    equipment.reduce((highest, item) => {
      if (!item.internal_id.startsWith(prefix)) {
        return highest;
      }

      const value = Number(item.internal_id.slice(prefix.length));
      return Number.isFinite(value) ? Math.max(highest, value) : highest;
    }, 0) + 1;

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

function createEquipment(draft: EquipmentDraft, equipment: Equipment[]): Equipment {
  return {
    ...draft,
    id: crypto.randomUUID(),
    internal_id: generateEquipmentInternalId(draft.equipment_type, equipment),
    status: "nieoznaczony"
  };
}

function getEquipmentStatusForAssignment(relation: EquipmentRelation): EquipmentStatus {
  return relation === "wydanie" ? "wydany" : "wypożyczony";
}

function getPartnerGuardians(partner: Partner) {
  const contactNames = partner.contacts
    .map((contact) => contact.name.trim())
    .filter(Boolean);
  const names = contactNames.length ? contactNames : [partner.contact_person].filter(Boolean);

  return Array.from(new Set(names));
}

export default function Home() {
  const supabaseConnection = useMemo(() => getSupabaseConnection(), []);
  const supabase = supabaseConnection.client;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [actions, setActions] = useState<PartnerAction[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentAssignments, setEquipmentAssignments] = useState<PartnerEquipmentAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<"partner" | "action" | "equipment" | "assignEquipment" | null>(null);
  const [partnerEditorMode, setPartnerEditorMode] =
    useState<PartnerEditorMode>("create");
  const [editingPartnerId, setEditingPartnerId] = useState("");
  const [partnerDraft, setPartnerDraft] =
    useState<PartnerDraft>(emptyPartnerDraft);
  const [partnerEditorTab, setPartnerEditorTab] =
    useState<Exclude<PartnerTab, "history">>("general");
  const [actionDraft, setActionDraft] = useState<ActionDraft>(emptyActionDraft);
  const [equipmentDraft, setEquipmentDraft] = useState<EquipmentDraft>(emptyEquipmentDraft);
  const [editingEquipmentId, setEditingEquipmentId] = useState("");
  const [equipmentAssignmentDraft, setEquipmentAssignmentDraft] =
    useState<EquipmentAssignmentDraft>(emptyEquipmentAssignmentDraft);
  const [equipmentAssignmentPartnerId, setEquipmentAssignmentPartnerId] = useState("");
  const [actionRelationStatus, setActionRelationStatus] =
    useState<RelationStatus>("nieznany");
  const [activeView, setActiveView] = useState<AppView>("relations");
  const [equipmentStatusTab, setEquipmentStatusTab] =
    useState<EquipmentStatusTab>("wypożyczony");
  const [equipmentSort, setEquipmentSort] = useState<EquipmentSort>("alphabetical");
  const [equipmentCategory, setEquipmentCategory] = useState<EquipmentType | "wszystkie">(
    "wszystkie"
  );
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
          accountFieldsResult,
          equipmentResult,
          equipmentAssignmentsResult
        ] = await Promise.all([
          supabase.from("partners").select("*").order("created_at"),
          supabase.from("actions").select("*").order("action_date"),
          supabase.from("partner_contacts").select("*").order("created_at"),
          supabase.from("partner_account_lists").select("*").order("sort_order"),
          supabase.from("partner_account_items").select("*").order("sort_order"),
          supabase.from("partner_account_fields").select("*").order("sort_order"),
          supabase.from("equipment").select("*").order("internal_id"),
          supabase.from("partner_equipment_assignments").select("*").order("created_at")
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
          setEquipment(
            equipmentResult.error
              ? []
              : (equipmentResult.data ?? []).map(normalizeEquipment)
          );
          setEquipmentAssignments(
            equipmentAssignmentsResult.error
              ? []
              : (equipmentAssignmentsResult.data ?? []).map(normalizeEquipmentAssignment)
          );

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

          if (equipmentResult.error || equipmentAssignmentsResult.error) {
            setErrorMessage(
              "Uruchom migrację supabase/migration_v04_equipment.sql w Supabase SQL Editor, żeby zapisywać sprzęt i przypisania."
            );
          }
        }

        setIsLoading(false);
        return;
      }

      const savedPartners = window.localStorage.getItem(partnerStorageKey);
      const savedActions = window.localStorage.getItem(actionStorageKey);
      const savedEquipment = window.localStorage.getItem(equipmentStorageKey);
      const savedEquipmentAssignments = window.localStorage.getItem(
        equipmentAssignmentStorageKey
      );

      setPartners(
        savedPartners
          ? JSON.parse(savedPartners).map(normalizePartner)
          : demoPartners
      );
      setActions(savedActions ? JSON.parse(savedActions) : demoActions);
      setEquipment(
        savedEquipment
          ? JSON.parse(savedEquipment).map(normalizeEquipment)
          : demoEquipment
      );
      setEquipmentAssignments(
        savedEquipmentAssignments
          ? JSON.parse(savedEquipmentAssignments).map(normalizeEquipmentAssignment)
          : demoEquipmentAssignments
      );
      setIsLoading(false);
    }

    loadData();
  }, [supabase, supabaseConnection.error]);

  useEffect(() => {
    if (!supabase && !isLoading) {
      window.localStorage.setItem(partnerStorageKey, JSON.stringify(partners));
      window.localStorage.setItem(actionStorageKey, JSON.stringify(actions));
      window.localStorage.setItem(equipmentStorageKey, JSON.stringify(equipment));
      window.localStorage.setItem(
        equipmentAssignmentStorageKey,
        JSON.stringify(equipmentAssignments)
      );
    }
  }, [actions, equipment, equipmentAssignments, isLoading, partners, supabase]);

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
  const activeAssignments = equipmentAssignments.filter(
    (assignment) => !assignment.returned_at
  );
  const assignmentLookup = useMemo(() => {
    const lookup = new Map<string, PartnerEquipmentAssignment>();

    activeAssignments.forEach((assignment) => {
      lookup.set(assignment.equipment_id, assignment);
    });

    return lookup;
  }, [activeAssignments]);
  const filteredEquipment = equipment
    .filter((item) => item.status === equipmentStatusTab)
    .filter((item) =>
      equipmentCategory === "wszystkie" ? true : item.equipment_type === equipmentCategory
    )
    .sort((first, second) => {
      if (equipmentSort === "internal_id") {
        return first.internal_id.localeCompare(second.internal_id, "pl");
      }

      return first.name.localeCompare(second.name, "pl");
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

  function openPartnerEditor(mode: PartnerEditorMode, partner?: Partner) {
    setPartnerEditorMode(mode);
    setEditingPartnerId(partner?.id ?? "");
    setPartnerDraft(partner ? createDraftFromPartner(partner) : emptyPartnerDraft);
    setPartnerEditorTab("general");
    setModal("partner");
  }

  function growActionsPanel() {
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

  function shrinkActionsPanel() {
    if (openPartner) {
      return;
    }

    setPanelLayout((current) => {
      if (current === "bottom-collapsed") {
        return "balanced";
      }

      return "top-collapsed";
    });
  }

  function growPartnersPanel() {
    setPanelLayout((current) => {
      if (current === "bottom-collapsed") {
        return "balanced";
      }

      return "top-collapsed";
    });
  }

  function shrinkPartnersPanel() {
    setPanelLayout((current) => {
      if (current === "top-collapsed") {
        return "balanced";
      }

      return "bottom-collapsed";
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

  function openPartnerAccountsEditor(partner: Partner) {
    openPartnerEditor("edit", partner);
    setPartnerEditorTab("accounts");
  }

  function openEquipmentModal(item?: Equipment) {
    const editedItem = item && "internal_id" in item ? item : null;

    setEditingEquipmentId(editedItem?.id ?? "");
    setEquipmentDraft(
      editedItem
        ? {
            equipment_type: editedItem.equipment_type,
            name: editedItem.name,
            serial_number: editedItem.serial_number,
            purchase_date: editedItem.purchase_date,
            purchase_amount: editedItem.purchase_amount,
            purchase_currency: editedItem.purchase_currency
          }
        : emptyEquipmentDraft
    );
    setModal("equipment");
  }

  function openAssignEquipmentModal(partner: Partner) {
    const guardians = getPartnerGuardians(partner);
    setEquipmentAssignmentPartnerId(partner.id);
    setEquipmentAssignmentDraft({
      ...emptyEquipmentAssignmentDraft,
      guardian_name: guardians[0] ?? ""
    });
    setModal("assignEquipment");
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

  async function handleAddEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEquipment = createEquipment(equipmentDraft, equipment);

    if (supabase) {
      const payload = {
        equipment_type: equipmentDraft.equipment_type,
        name: equipmentDraft.name,
        serial_number: equipmentDraft.serial_number,
        purchase_date: equipmentDraft.purchase_date || null,
        purchase_amount: equipmentDraft.purchase_amount || null,
        purchase_currency: equipmentDraft.purchase_currency
      };
      const request = editingEquipmentId
        ? supabase
            .from("equipment")
            .update(payload)
            .eq("id", editingEquipmentId)
            .select()
            .single()
        : supabase
            .from("equipment")
            .insert({
              ...nextEquipment,
              purchase_date: nextEquipment.purchase_date || null,
              purchase_amount: nextEquipment.purchase_amount || null,
              status: nextEquipment.status
            })
            .select()
            .single();
      const { data, error } = await request;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setEquipment((current) =>
        editingEquipmentId
          ? current.map((item) =>
              item.id === editingEquipmentId ? normalizeEquipment(data) : item
            )
          : [...current, normalizeEquipment(data)]
      );
    } else {
      setEquipment((current) =>
        editingEquipmentId
          ? current.map((item) =>
              item.id === editingEquipmentId
                ? { ...item, ...equipmentDraft }
                : item
            )
          : [...current, nextEquipment]
      );
    }

    setEquipmentDraft(emptyEquipmentDraft);
    setEditingEquipmentId("");
    setModal(null);
  }

  async function handleAssignEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!equipmentAssignmentPartnerId || !equipmentAssignmentDraft.equipment_id) {
      setErrorMessage("Wybierz urządzenie do przypisania.");
      return;
    }

    const assignment: PartnerEquipmentAssignment = {
      id: crypto.randomUUID(),
      partner_id: equipmentAssignmentPartnerId,
      equipment_id: equipmentAssignmentDraft.equipment_id,
      guardian_name: equipmentAssignmentDraft.guardian_name,
      relation: equipmentAssignmentDraft.relation,
      boundary_date:
        equipmentAssignmentDraft.relation === "wypożyczenie"
          ? equipmentAssignmentDraft.boundary_date
          : "",
      assigned_at: new Date().toISOString().slice(0, 10),
      returned_at: ""
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("partner_equipment_assignments")
        .insert({
          ...assignment,
          boundary_date: assignment.boundary_date || null,
          returned_at: assignment.returned_at || null
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setEquipmentAssignments((current) => [
        ...current,
        normalizeEquipmentAssignment(data)
      ]);
    } else {
      setEquipmentAssignments((current) => [...current, assignment]);
    }

    await updateEquipmentStatus(
      assignment.equipment_id,
      getEquipmentStatusForAssignment(assignment.relation)
    );

    setEquipmentAssignmentDraft(emptyEquipmentAssignmentDraft);
    setEquipmentAssignmentPartnerId("");
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

  function updatePartnerAccountItem(
    partnerId: string,
    listId: string,
    itemId: string,
    field: keyof Pick<PartnerAccountItem, "account_number" | "login" | "password">,
    value: string
  ) {
    if (supabase) {
      void supabase
        .from("partner_account_items")
        .update({ [field]: value })
        .eq("id", itemId);
    }

    updatePartnerAccountLists(partnerId, (lists) =>
      lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === itemId ? { ...item, [field]: value } : item
              )
            }
          : list
      )
    );
  }

  async function updateEquipmentAssignment(
    assignment: PartnerEquipmentAssignment,
    field: keyof Pick<
      PartnerEquipmentAssignment,
      "guardian_name" | "relation" | "boundary_date"
    >,
    value: string
  ) {
    const nextAssignment = {
      ...assignment,
      [field]: value,
      boundary_date:
        field === "relation" && value === "wydanie"
          ? ""
          : field === "boundary_date"
            ? value
            : assignment.boundary_date
    };
    const nextStatus = getEquipmentStatusForAssignment(nextAssignment.relation);

    if (supabase) {
      const { error } = await supabase
        .from("partner_equipment_assignments")
        .update({
          [field]: value,
          boundary_date:
            field === "relation" && value === "wydanie"
              ? null
              : nextAssignment.boundary_date
                ? nextAssignment.boundary_date
                : null
        })
        .eq("id", assignment.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }

    setEquipmentAssignments((current) =>
      current.map((item) =>
        item.id === assignment.id
          ? normalizeEquipmentAssignment(nextAssignment)
          : item
      )
    );

    if (field === "relation") {
      await updateEquipmentStatus(assignment.equipment_id, nextStatus);
    }
  }

  async function returnEquipmentAssignment(assignment: PartnerEquipmentAssignment) {
    const returned_at = new Date().toISOString().slice(0, 10);

    if (supabase) {
      const { error } = await supabase
        .from("partner_equipment_assignments")
        .update({ returned_at })
        .eq("id", assignment.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }

    setEquipmentAssignments((current) =>
      current.map((item) =>
        item.id === assignment.id ? { ...item, returned_at } : item
      )
    );
    await updateEquipmentStatus(assignment.equipment_id, "nieoznaczony");
  }

  async function updateEquipmentStatus(
    equipmentId: string,
    status: EquipmentStatus
  ) {
    if (supabase) {
      const { error } = await supabase
        .from("equipment")
        .update({ status })
        .eq("id", equipmentId);

      if (error) {
        setErrorMessage(error.message);
        return;
      }
    }

    setEquipment((current) =>
      current.map((item) => (item.id === equipmentId ? { ...item, status } : item))
    );
  }

  async function assignEquipmentToPartner(
    partner: Partner,
    item: Equipment,
    relation: EquipmentRelation = "wypożyczenie"
  ) {
    const assignment: PartnerEquipmentAssignment = {
      id: crypto.randomUUID(),
      partner_id: partner.id,
      equipment_id: item.id,
      guardian_name: getPartnerGuardians(partner)[0] ?? "",
      relation,
      boundary_date: "",
      assigned_at: new Date().toISOString().slice(0, 10),
      returned_at: ""
    };

    if (supabase) {
      const { data, error } = await supabase
        .from("partner_equipment_assignments")
        .insert({
          ...assignment,
          boundary_date: null,
          returned_at: null
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setEquipmentAssignments((current) => [
        ...current,
        normalizeEquipmentAssignment(data)
      ]);
    } else {
      setEquipmentAssignments((current) => [...current, assignment]);
    }

    await updateEquipmentStatus(item.id, getEquipmentStatusForAssignment(relation));
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
    setEquipmentAssignments((current) =>
      current.map((assignment) =>
        assignment.partner_id === deleteTarget.id && !assignment.returned_at
          ? { ...assignment, returned_at: new Date().toISOString().slice(0, 10) }
          : assignment
      )
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
          <button
            className={`navItem navButton ${activeView === "relations" ? "active" : "muted"}`}
            type="button"
            onClick={() => setActiveView("relations")}
          >
            <Handshake size={24} aria-hidden="true" />
            Relacje
          </button>
          <button
            className={`navItem navButton ${activeView === "equipment" ? "active" : "muted"}`}
            type="button"
            onClick={() => setActiveView("equipment")}
          >
            <Monitor size={24} aria-hidden="true" />
            Sprzęt
          </button>
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

      {activeView === "relations" ? (
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
            upDisabled={Boolean(openPartner) || panelLayout === "bottom-collapsed"}
            downDisabled={Boolean(openPartner) || panelLayout === "top-collapsed"}
            onGrow={growActionsPanel}
            onShrink={shrinkActionsPanel}
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
            onGrow={growPartnersPanel}
            onShrink={shrinkPartnersPanel}
          >
            <div className={`partnerSegmentTabs ${openPartner ? "inactive" : ""} ${isPartnersCollapsed ? "hidden" : ""}`} role="tablist" aria-label="Typy partnerów">
              {partnerSegmentTabs.map((tab, index) => (
                <button
                  aria-selected={index === 0}
                  className={index === 0 ? "active" : ""}
                  disabled={Boolean(openPartner)}
                  key={tab}
                  role="tab"
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
          </PanelControls>

          {!isPartnersCollapsed ? (
            <div className={`partnersContent ${openPartner ? "isDetailsOpen" : ""}`}>
              {openPartner ? (
                <PartnerDetails
                  actions={openPartnerActions}
                  activeTab={partnerTab}
                  onCancel={closePartnerDetails}
                  onDelete={() => setDeleteTarget(openPartner)}
                  onEdit={() => openPartnerEditor("edit", openPartner)}
                  onTabChange={setPartnerTab}
                  onEditAccounts={() => openPartnerAccountsEditor(openPartner)}
                  onOpenEquipmentModal={openEquipmentModal}
                  onOpenAssignEquipment={() => openAssignEquipmentModal(openPartner)}
                  onAssignEquipment={assignEquipmentToPartner}
                  onReturnEquipmentAssignment={returnEquipmentAssignment}
                  onRemoveAccountItem={removePartnerAccountItem}
                  onUpdateEquipmentAssignment={updateEquipmentAssignment}
                  onUpdateAccountItem={updatePartnerAccountItem}
                  equipment={equipment}
                  equipmentAssignments={equipmentAssignments}
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
                          <Plus size={22} aria-hidden="true" />
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
      ) : (
        <EquipmentView
          activeTab={equipmentStatusTab}
          assignmentLookup={assignmentLookup}
          category={equipmentCategory}
          equipment={filteredEquipment}
          onCategoryChange={setEquipmentCategory}
          onCreateEquipment={openEquipmentModal}
          onEditEquipment={openEquipmentModal}
          onDeleteEquipment={async (item) => {
            if (supabase) {
              const { error } = await supabase.from("equipment").delete().eq("id", item.id);

              if (error) {
                setErrorMessage(error.message);
                return;
              }
            }

            setEquipment((current) => current.filter((entry) => entry.id !== item.id));
            setEquipmentAssignments((current) =>
              current.filter((assignment) => assignment.equipment_id !== item.id)
            );
          }}
          onReturnEquipment={returnEquipmentAssignment}
          onStatusTabChange={setEquipmentStatusTab}
          onUpdateStatus={updateEquipmentStatus}
          partners={partners}
          sort={equipmentSort}
          onSortChange={setEquipmentSort}
        />
      )}

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
          onOpenEquipmentModal={openEquipmentModal}
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

      {modal === "equipment" ? (
        <EquipmentModal
          draft={equipmentDraft}
          equipment={equipment}
          onCancel={() => {
            setEquipmentDraft(emptyEquipmentDraft);
            setEditingEquipmentId("");
            setModal(null);
          }}
          onChange={setEquipmentDraft}
          internalId={equipment.find((item) => item.id === editingEquipmentId)?.internal_id}
          isEditing={Boolean(editingEquipmentId)}
          onSubmit={handleAddEquipment}
        />
      ) : null}

      {modal === "assignEquipment" ? (
        <EquipmentAssignmentModal
          assignments={equipmentAssignments}
          draft={equipmentAssignmentDraft}
          equipment={equipment}
          onCancel={() => {
            setEquipmentAssignmentDraft(emptyEquipmentAssignmentDraft);
            setEquipmentAssignmentPartnerId("");
            setModal(null);
          }}
          onChange={setEquipmentAssignmentDraft}
          onSubmit={handleAssignEquipment}
          partner={partnerLookup.get(equipmentAssignmentPartnerId) ?? null}
          partners={partners}
        />
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

function EquipmentView({
  activeTab,
  assignmentLookup,
  category,
  equipment,
  partners,
  sort,
  onCategoryChange,
  onCreateEquipment,
  onEditEquipment,
  onDeleteEquipment,
  onReturnEquipment,
  onSortChange,
  onStatusTabChange,
  onUpdateStatus
}: {
  activeTab: EquipmentStatusTab;
  assignmentLookup: Map<string, PartnerEquipmentAssignment>;
  category: EquipmentType | "wszystkie";
  equipment: Equipment[];
  partners: Partner[];
  sort: EquipmentSort;
  onCategoryChange: (category: EquipmentType | "wszystkie") => void;
  onCreateEquipment: () => void;
  onEditEquipment: (item: Equipment) => void;
  onDeleteEquipment: (item: Equipment) => void;
  onReturnEquipment: (assignment: PartnerEquipmentAssignment) => void;
  onSortChange: (sort: EquipmentSort) => void;
  onStatusTabChange: (status: EquipmentStatusTab) => void;
  onUpdateStatus: (equipmentId: string, status: EquipmentStatus) => void;
}) {
  const partnerLookup = new Map(partners.map((partner) => [partner.id, partner]));

  return (
    <section className="equipmentView">
      <button className="equipmentHero" type="button" onClick={() => onCreateEquipment()}>
        Dodaj nowy sprzęt
      </button>

      <section className="glassPanel equipmentPanel">
        <div className="equipmentPanelTop">
          <h1>Sprzęt</h1>
          <div className="equipmentStatusTabs" role="tablist" aria-label="Status sprzętu">
            {equipmentStatusTabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "active" : ""}
                key={tab.id}
                onClick={() => onStatusTabChange(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="equipmentFilters">
          <label className="sortControl">
            <span>Kategoria</span>
            <select
              value={category}
              onChange={(event) =>
                onCategoryChange(event.target.value as EquipmentType | "wszystkie")
              }
            >
              <option value="wszystkie">Wszystkie</option>
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {capitalize(type)}
                </option>
              ))}
            </select>
            <ChevronDown size={20} aria-hidden="true" />
          </label>
          <label className="sortControl">
            <span>Sortuj po:</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as EquipmentSort)}
            >
              <option value="alphabetical">Alfabetycznie</option>
              <option value="internal_id">Nr wewnętrzny</option>
            </select>
            <ChevronDown size={20} aria-hidden="true" />
          </label>
        </div>

        <div className={`equipmentRegistry equipmentRegistry-${activeTab}`}>
          <div className="equipmentRegistryHeader">
            <span>Nr wewnętrzny</span>
            <span>Typ</span>
            <span>Model</span>
            <span>Nr seryjny</span>
            {activeTab === "wypożyczony" ? (
              <>
                <span>Data wypożyczenia</span>
                <span>Użytkujący</span>
                <span>Opiekun</span>
                <span>Data graniczna</span>
              </>
            ) : null}
            {activeTab === "wydany" ? (
              <>
                <span>Data wydania</span>
                <span>Klient</span>
                <span>Opiekun</span>
              </>
            ) : null}
            <span />
          </div>

          <div className="equipmentRegistryRows">
            {equipment.length === 0 ? (
              <p className="emptyState">Brak urządzeń w tej zakładce.</p>
            ) : null}
            {equipment.map((item) => {
              const assignment = assignmentLookup.get(item.id);
              const partner = assignment ? partnerLookup.get(assignment.partner_id) : null;

              return (
                <div className="equipmentRegistryRow" key={item.id}>
                  <strong>{item.internal_id}</strong>
                  <span>{capitalize(item.equipment_type)}</span>
                  <span>{item.name}</span>
                  <span>{item.serial_number}</span>
                  {activeTab === "wypożyczony" ? (
                    <>
                      <span>{formatDate(assignment?.assigned_at ?? "")}</span>
                      <span>{partner?.name ?? ""}</span>
                      <span>{assignment?.guardian_name ?? ""}</span>
                      <span>{formatDate(assignment?.boundary_date ?? "")}</span>
                    </>
                  ) : null}
                  {activeTab === "wydany" ? (
                    <>
                      <span>{formatDate(assignment?.assigned_at ?? "")}</span>
                      <span>{partner?.name ?? ""}</span>
                      <span>{assignment?.guardian_name ?? ""}</span>
                    </>
                  ) : null}
                  <div className="equipmentRegistryActions">
                    {activeTab === "wypożyczony" && assignment ? (
                      <button type="button" onClick={() => onReturnEquipment(assignment)}>
                        Zwróć
                      </button>
                    ) : null}
                    {activeTab === "nieoznaczony" ? (
                      <button type="button" onClick={() => onUpdateStatus(item.id, "własny")}>
                        Oznacz jako własny
                      </button>
                    ) : null}
                    <button type="button" onClick={() => onEditEquipment(item)}>
                      Edytuj
                    </button>
                    <button className="dangerPill" type="button" onClick={() => onDeleteEquipment(item)}>
                      Usuń
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}

function PartnerEditorModal({
  draft,
  mode,
  tab,
  onTabChange,
  onChange,
  onCancel,
  onOpenEquipmentModal,
  onSubmit
}: {
  draft: PartnerDraft;
  mode: PartnerEditorMode;
  tab: Exclude<PartnerTab, "history">;
  onTabChange: (tab: Exclude<PartnerTab, "history">) => void;
  onChange: (draft: PartnerDraft) => void;
  onCancel: () => void;
  onOpenEquipmentModal: () => void;
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
                <EditorSelect label="Aplikacja komunikacyjna" value={draft.communication_group} options={communicationGroups} onChange={(value) => update("communication_group", value as CommunicationGroup)} />
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
                <button className="addInlineButton" type="button" onClick={() => onOpenEquipmentModal()}>
                  + Dodaj nowe urządzenie do bazy
                </button>
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

function EquipmentModal({
  draft,
  equipment,
  internalId,
  isEditing,
  onChange,
  onCancel,
  onSubmit
}: {
  draft: EquipmentDraft;
  equipment: Equipment[];
  internalId?: string;
  isEditing: boolean;
  onChange: (draft: EquipmentDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function update<K extends keyof EquipmentDraft>(key: K, value: EquipmentDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalPanel equipmentCreatePanel">
        <form className="equipmentCreateForm" onSubmit={onSubmit}>
          <h2>{isEditing ? "Edytuj urządzenie" : "Dodaj nowe urządzenie"}</h2>
          <div className="equipmentCreateGrid">
            <label className="equipmentGeneratedId">
              <span>Nr wewnętrzny:</span>
              <strong>
                {isEditing ? internalId : generateEquipmentInternalId(draft.equipment_type, equipment)}
              </strong>
            </label>
            <label className="field">
              <span>Typ</span>
              <select
                value={draft.equipment_type}
                onChange={(event) => update("equipment_type", event.target.value as EquipmentType)}
              >
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {capitalize(type)}
                  </option>
                ))}
              </select>
            </label>
            <EditorField
              label="Nazwa sprzętu"
              required
              value={draft.name}
              onChange={(value) => update("name", value)}
            />
            <EditorField
              label="Nr seryjny"
              value={draft.serial_number}
              onChange={(value) => update("serial_number", value)}
            />
            <EditorField
              label="Data zakupu"
              type="date"
              value={draft.purchase_date}
              onChange={(value) => update("purchase_date", value)}
            />
            <div className="equipmentPriceFields">
              <EditorField
                label="Kwota zakupu"
                value={draft.purchase_amount}
                onChange={(value) => update("purchase_amount", value)}
              />
              <label className="field">
                <span>Waluta</span>
                <select
                  value={draft.purchase_currency}
                  onChange={(event) => update("purchase_currency", event.target.value as Currency)}
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="modalActions">
            <button type="button" onClick={onCancel}>
              Anuluj i wyjdź
            </button>
            <button type="submit">Zapisz i wyjdź</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EquipmentAssignmentModal({
  partner,
  equipment,
  assignments,
  draft,
  partners,
  onChange,
  onCancel,
  onSubmit
}: {
  partner: Partner | null;
  equipment: Equipment[];
  assignments: PartnerEquipmentAssignment[];
  draft: EquipmentAssignmentDraft;
  partners: Partner[];
  onChange: (draft: EquipmentAssignmentDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const guardians = partner ? getPartnerGuardians(partner) : [];
  const activeAssignments = assignments.filter((assignment) => !assignment.returned_at);
  const assignedEquipmentIds = new Set(
    activeAssignments.map((assignment) => assignment.equipment_id)
  );
  const availableEquipment = equipment.filter((item) => !assignedEquipmentIds.has(item.id));
  const partnerAssignments = partner
    ? activeAssignments.filter((assignment) => assignment.partner_id === partner.id)
    : [];

  function update<K extends keyof EquipmentAssignmentDraft>(
    key: K,
    value: EquipmentAssignmentDraft[K]
  ) {
    onChange({
      ...draft,
      [key]: value,
      boundary_date: key === "relation" && value === "wydanie" ? "" : draft.boundary_date
    });
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalPanel equipmentAssignPanel">
        <form className="equipmentAssignForm" onSubmit={onSubmit}>
          <h2>Przypisz urządzenia do partnera: {partner?.name ?? ""}</h2>
          <div className="equipmentAssignGrid">
            <section className="equipmentChoicePanel">
              <span>Dostępne urządzenia</span>
              <div className="equipmentChoiceHeader">
                <span>Nr wewnętrzny</span>
                <span>Typ</span>
                <span>Nazwa</span>
                <span>Nr seryjny</span>
                <span />
              </div>
              <div className="equipmentChoiceRows">
                {availableEquipment.length === 0 ? (
                  <p className="emptyState">Brak dostępnych urządzeń.</p>
                ) : null}
                {availableEquipment.map((item) => (
                  <div
                    className={`equipmentChoiceRow ${draft.equipment_id === item.id ? "selected" : ""}`}
                    key={item.id}
                  >
                    <span>{item.internal_id}</span>
                    <span>{capitalize(item.equipment_type)}</span>
                    <span>{item.name}</span>
                    <span>{item.serial_number}</span>
                    <button
                      type="button"
                      onClick={() => update("equipment_id", item.id)}
                    >
                      Przypisz
                    </button>
                  </div>
                ))}
                {activeAssignments
                  .filter((assignment) => assignment.partner_id !== partner?.id)
                  .map((assignment) => {
                    const item = equipment.find((entry) => entry.id === assignment.equipment_id);
                    const assignedPartner =
                      partners.find((item) => item.id === assignment.partner_id)?.name ??
                      assignment.partner_id;

                    if (!item) {
                      return null;
                    }

                    return (
                      <div className="equipmentChoiceRow unavailable" key={assignment.id}>
                        <span>{item.internal_id}</span>
                        <span>{capitalize(item.equipment_type)}</span>
                        <span>{item.name}</span>
                        <span>{item.serial_number}</span>
                        <small>Przypisane do: {assignedPartner}</small>
                      </div>
                    );
                  })}
              </div>
            </section>
            <section className="equipmentChoicePanel">
              <span>Przypisane urządzenia</span>
              <div className="equipmentAssignedHeader">
                <span>Nr wewnętrzny</span>
                <span>Typ</span>
                <span>Nazwa</span>
                <span>Nr seryjny</span>
                <span>Opiekun</span>
                <span>Relacja</span>
                <span>Data graniczna</span>
              </div>
              <div className="equipmentAssignedRows">
                {partnerAssignments.length === 0 ? (
                  <p className="emptyState">Brak przypisanego sprzętu.</p>
                ) : null}
                {partnerAssignments.map((assignment) => {
                  const item = equipment.find((entry) => entry.id === assignment.equipment_id);

                  if (!item) {
                    return null;
                  }

                  return (
                    <div className="equipmentAssignedRow" key={assignment.id}>
                      <span>{item.internal_id}</span>
                      <span>{capitalize(item.equipment_type)}</span>
                      <span>{item.name}</span>
                      <span>{item.serial_number}</span>
                      <span>{assignment.guardian_name}</span>
                      <span>{capitalize(assignment.relation)}</span>
                      <span>{assignment.boundary_date}</span>
                    </div>
                  );
                })}
                {draft.equipment_id ? (
                  <div className="equipmentAssignmentEditor">
                    <label>
                      <span>Opiekun</span>
                      <select
                        value={draft.guardian_name}
                        onChange={(event) => update("guardian_name", event.target.value)}
                      >
                        <option value="">Brak opiekuna</option>
                        {guardians.map((guardian) => (
                          <option key={guardian} value={guardian}>
                            {guardian}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Relacja</span>
                      <select
                        value={draft.relation}
                        onChange={(event) =>
                          update("relation", event.target.value as EquipmentRelation)
                        }
                      >
                        {equipmentRelations.map((relation) => (
                          <option key={relation} value={relation}>
                            {capitalize(relation)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Data graniczna</span>
                      <input
                        disabled={draft.relation !== "wypożyczenie"}
                        type="date"
                        value={draft.boundary_date}
                        onChange={(event) => update("boundary_date", event.target.value)}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
          <div className="modalActions">
            <button type="button" onClick={onCancel}>
              Anuluj i wyjdź
            </button>
            <button type="submit" disabled={!draft.equipment_id}>
              Zapisz i wyjdź
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PartnerDetails({
  partner,
  actions,
  activeTab,
  equipment,
  equipmentAssignments,
  onTabChange,
  onCancel,
  onDelete,
  onEdit,
  onEditAccounts,
  onOpenEquipmentModal,
  onOpenAssignEquipment,
  onAssignEquipment,
  onReturnEquipmentAssignment,
  onRemoveAccountItem,
  onUpdateEquipmentAssignment,
  onUpdateAccountItem,
  updateActionStatus
}: {
  partner: Partner;
  actions: PartnerAction[];
  activeTab: PartnerTab;
  equipment: Equipment[];
  equipmentAssignments: PartnerEquipmentAssignment[];
  onTabChange: (tab: PartnerTab) => void;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onEditAccounts: () => void;
  onOpenEquipmentModal: () => void;
  onOpenAssignEquipment: () => void;
  onAssignEquipment: (partner: Partner, item: Equipment) => void;
  onReturnEquipmentAssignment: (assignment: PartnerEquipmentAssignment) => void;
  onRemoveAccountItem: (partnerId: string, listId: string, itemId: string) => void;
  onUpdateEquipmentAssignment: (
    assignment: PartnerEquipmentAssignment,
    field: keyof Pick<
      PartnerEquipmentAssignment,
      "guardian_name" | "relation" | "boundary_date"
    >,
    value: string
  ) => void;
  onUpdateAccountItem: (
    partnerId: string,
    listId: string,
    itemId: string,
    field: keyof Pick<PartnerAccountItem, "account_number" | "login" | "password">,
    value: string
  ) => void;
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
        <button
          aria-label="Zwiń szczegóły partnera"
          className="partnerDetailsCollapse"
          onClick={onCancel}
          type="button"
        >
          <Minus size={22} aria-hidden="true" />
        </button>
      </div>

      <div className={`partnerDetailsBody partnerDetailsBody-${activeTab}`}>
        {activeTab === "general" ? <PartnerGeneralTab partner={partner} /> : null}
        {activeTab === "equipment" ? (
          <PartnerEquipmentTab
            assignments={equipmentAssignments}
            equipment={equipment}
            onAssign={onOpenAssignEquipment}
            onAssignEquipment={onAssignEquipment}
            onCreateEquipment={onOpenEquipmentModal}
            onReturn={onReturnEquipmentAssignment}
            onUpdateAssignment={onUpdateEquipmentAssignment}
            partner={partner}
          />
        ) : null}
        {activeTab === "accounts" ? (
          <PartnerAccountsTab
            onEditAccounts={onEditAccounts}
            onRemoveAccountItem={onRemoveAccountItem}
            onUpdateAccountItem={onUpdateAccountItem}
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
      <DetailField label="Aplikacja komunikacyjna" value={capitalize(partner.communication_group)} />
      <DetailField label="Nazwa grupy" value={partner.group_name} />
      <DetailArea label="Notatka" value={partner.note} />
      <section className="detailCard contactsCard">
        <span>Osoby kontaktowe</span>
        {partner.contacts.map((contact) => (
          <div className="contactRow" key={contact.id}>
            <strong>{contact.name}</strong>
            <small>{contact.email}</small>
            <small>{contact.phone}</small>
          </div>
        ))}
      </section>
    </div>
  );
}

function PartnerEquipmentTab({
  partner,
  equipment,
  assignments,
  onAssign,
  onAssignEquipment,
  onCreateEquipment,
  onReturn,
  onUpdateAssignment
}: {
  partner: Partner;
  equipment: Equipment[];
  assignments: PartnerEquipmentAssignment[];
  onAssign: () => void;
  onAssignEquipment: (partner: Partner, item: Equipment) => void;
  onCreateEquipment: () => void;
  onReturn: (assignment: PartnerEquipmentAssignment) => void;
  onUpdateAssignment: (
    assignment: PartnerEquipmentAssignment,
    field: keyof Pick<
      PartnerEquipmentAssignment,
      "guardian_name" | "relation" | "boundary_date"
    >,
    value: string
  ) => void;
}) {
  const guardians = getPartnerGuardians(partner);
  const activeAssignments = assignments.filter(
    (assignment) => assignment.partner_id === partner.id && !assignment.returned_at
  );
  const assignedEquipmentIds = new Set(
    assignments
      .filter((assignment) => !assignment.returned_at)
      .map((assignment) => assignment.equipment_id)
  );
  const availableEquipment = equipment.filter(
    (item) => item.status === "nieoznaczony" && !assignedEquipmentIds.has(item.id)
  );

  return (
    <section className="partnerEquipmentSplit">
      <div className="equipmentCardHeader">
        <span>Dostępne urządzenia</span>
        <div>
          <button className="addInlineButton" type="button" onClick={() => onCreateEquipment()}>
            + Dodaj nowe urządzenie
          </button>
        </div>
      </div>
      <section className="equipmentRelationGrid">
        <div className="equipmentRelationPanel">
          <div className="equipmentAvailableHeader">
            <span>Nr wewnętrzny</span>
            <span>Typ</span>
            <span>Model</span>
            <span>Nr seryjny</span>
            <span />
          </div>
          <div className="equipmentRelationRows">
            {availableEquipment.length === 0 ? (
              <p className="emptyState">Brak nieoznaczonych urządzeń.</p>
            ) : null}
            {availableEquipment.map((item) => (
              <div className="equipmentAvailableRow" key={item.id}>
                <span>{item.internal_id}</span>
                <span>{capitalize(item.equipment_type)}</span>
                <span>{item.name}</span>
                <span>{item.serial_number}</span>
                <button type="button" onClick={() => onAssignEquipment(partner, item)}>
                  Przypisz
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="equipmentRelationPanel">
          <span className="equipmentRelationTitle">Przypisane urządzenia</span>
          <div className="equipmentAssignedHeader">
            <span>Nr wewnętrzny</span>
            <span>Typ</span>
            <span>Model</span>
            <span>Nr seryjny</span>
            <span>Data przypisania</span>
            <span>Opiekun</span>
            <span>Relacja</span>
            <span>Data graniczna</span>
            <span />
          </div>
          <div className="equipmentRelationRows">
            {activeAssignments.length === 0 ? (
              <p className="emptyState">Brak przypisanego sprzętu.</p>
            ) : null}
            {activeAssignments.map((assignment) => {
              const item = equipment.find((entry) => entry.id === assignment.equipment_id);

              if (!item) {
                return null;
              }

              return (
                <div className="equipmentAssignedRow" key={assignment.id}>
                  <span>{item.internal_id}</span>
                  <span>{capitalize(item.equipment_type)}</span>
                  <span>{item.name}</span>
                  <span>{item.serial_number}</span>
                  <span>{formatDate(assignment.assigned_at)}</span>
                  <select
                    aria-label="Opiekun sprzętu"
                    value={assignment.guardian_name}
                    onChange={(event) =>
                      onUpdateAssignment(assignment, "guardian_name", event.target.value)
                    }
                  >
                    <option value="">Brak opiekuna</option>
                    {guardians.map((guardian) => (
                      <option key={guardian} value={guardian}>
                        {guardian}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Relacja sprzętu"
                    value={assignment.relation}
                    onChange={(event) =>
                      onUpdateAssignment(
                        assignment,
                        "relation",
                        event.target.value as EquipmentRelation
                      )
                    }
                  >
                    {equipmentRelations.map((relation) => (
                      <option key={relation} value={relation}>
                        {capitalize(relation)}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Data graniczna"
                    disabled={assignment.relation !== "wypożyczenie"}
                    type="date"
                    value={assignment.boundary_date}
                    onChange={(event) =>
                      onUpdateAssignment(assignment, "boundary_date", event.target.value)
                    }
                  />
                  <button className="dangerPill" type="button" onClick={() => onReturn(assignment)}>
                    Zwróć
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}

function PartnerAccountsTab({
  partner,
  onEditAccounts,
  onRemoveAccountItem,
  onUpdateAccountItem
}: {
  partner: Partner;
  onEditAccounts: () => void;
  onRemoveAccountItem: (partnerId: string, listId: string, itemId: string) => void;
  onUpdateAccountItem: (
    partnerId: string,
    listId: string,
    itemId: string,
    field: keyof Pick<PartnerAccountItem, "account_number" | "login" | "password">,
    value: string
  ) => void;
}) {
  return (
    <div className="accountsGrid">
      {partner.accountLists.length === 0 ? (
        <section className="accountPanel">
          <span>Listy kont</span>
          <p className="emptyState">Dodaj listę kont w edycji partnera.</p>
          <button className="addInlineButton" type="button" onClick={onEditAccounts}>
            + Dodaj listę kont
          </button>
        </section>
      ) : null}
      {partner.accountLists.map((list) => (
        <AccountPanel
          key={list.id}
          list={list}
          onRemove={(itemId) => onRemoveAccountItem(partner.id, list.id, itemId)}
          onUpdate={(itemId, field, value) =>
            onUpdateAccountItem(partner.id, list.id, itemId, field, value)
          }
        />
      ))}
      <section className="accountSettings">
        <button className="addInlineButton" type="button" onClick={onEditAccounts}>
          + Dodaj listę kont
        </button>
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
  onRemove,
  onUpdate
}: {
  list: PartnerAccountList;
  onRemove: (itemId: string) => void;
  onUpdate: (
    itemId: string,
    field: keyof Pick<PartnerAccountItem, "account_number" | "login" | "password">,
    value: string
  ) => void;
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
          <input
            aria-label="Numer konta"
            placeholder="Numer"
            value={item.account_number}
            onChange={(event) =>
              onUpdate(item.id, "account_number", event.target.value)
            }
          />
          <input
            aria-label="Login konta"
            placeholder="Login"
            value={item.login}
            onChange={(event) => onUpdate(item.id, "login", event.target.value)}
          />
          <input
            aria-label="Hasło konta"
            placeholder="Hasło"
            value={item.password}
            onChange={(event) => onUpdate(item.id, "password", event.target.value)}
          />
          <button className="accountDeleteButton" type="button" onClick={() => onRemove(item.id)}>
            Usuń
          </button>
        </div>
      ))}
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
  onGrow,
  onShrink,
  children
}: {
  title: string;
  upDisabled: boolean;
  downDisabled: boolean;
  onGrow: () => void;
  onShrink: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="panelHeader">
      <h1>{title}</h1>
      <div className="panelHeaderMiddle">{children}</div>
      <div className="panelArrows">
        <button
          type="button"
          aria-label={`Zmniejsz panel ${title}`}
          disabled={downDisabled}
          onClick={onShrink}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Powiększ panel ${title}`}
          disabled={upDisabled}
          onClick={onGrow}
        >
          <Plus size={18} aria-hidden="true" />
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`dropdownControl statusSelect ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget as Node | null;

        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      <button className="dropdownButton" type="button" onClick={() => setIsOpen((current) => !current)}>
        <CalendarDays size={16} aria-hidden="true" />
        <span>{capitalize(value)}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="dropdownMenu" role="listbox">
          {actionStatuses.map((status) => (
            <button
              aria-selected={value === status}
              className={value === status ? "selected" : ""}
              key={status}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(status);
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              {capitalize(status)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RelationStatusSelect({
  value,
  onChange
}: {
  value: RelationStatus;
  onChange: (status: RelationStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`dropdownControl relationStatus ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget as Node | null;

        if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
          setIsOpen(false);
        }
      }}
    >
      <button className="dropdownButton" type="button" onClick={() => setIsOpen((current) => !current)}>
        <span
          className={`statusDot ${getStatusTone(value)}`}
          aria-hidden="true"
        />
        <span>{value}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="dropdownMenu" role="listbox">
          {relationStatuses.map((status) => (
            <button
              aria-selected={value === status}
              className={value === status ? "selected" : ""}
              key={status}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(status);
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              <span
                className={`statusDot ${getStatusTone(status)}`}
                aria-hidden="true"
              />
              <span>{status}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
