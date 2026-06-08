"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { toast } from "sonner";
import { getContacts, assignContact, grantContactAccess, revokeContactAccess, listContactAccess, listContactSources } from "@/app/(dashboard)/contacts/actions";
import type { Contact, ContactAccess, ContactSource, MemberRole, WorkspaceMemberWithProfile } from "@/types";
import type { ContactFilters } from "@/repositories/contact.repository";

const PAGE_SIZE = 20;
const MANAGER_ROLES: MemberRole[] = ["owner", "admin", "manager"];

export interface ContactsViewModelProps {
  initialRole: MemberRole | null;
  initialMembers: WorkspaceMemberWithProfile[];
  currentUserId: string;
}

export function useContactsViewModel({ initialRole, initialMembers, currentUserId }: ContactsViewModelProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ContactFilters>({ search: "", status: "all", assignedTo: "all" });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isNavigating, startNavigation] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);

  const [assignModal, setAssignModal] = useState<{ open: boolean; contact: Contact | null }>({ open: false, contact: null });
  const [accessSheet, setAccessSheet] = useState<{ open: boolean; contact: Contact | null; grants: ContactAccess[] }>({ open: false, contact: null, grants: [] });

  const [sources, setSources] = useState<ContactSource[]>([]);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  const isManager = !!initialRole && MANAGER_ROLES.includes(initialRole);
  const members = initialMembers;

  const lastKey = useRef<string | null>(null);

  const fetchContacts = useCallback(async (currentPage: number, currentFilters: ContactFilters) => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await getContacts(currentFilters, currentPage, PAGE_SIZE);
      if (result.error) {
        setFetchError(result.error);
        setContacts([]);
        setTotal(0);
      } else {
        setContacts(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      console.error("[useContactsViewModel]", err);
      setFetchError("Erro ao carregar contatos.");
      setContacts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const key = `${page}|${filters.search}|${filters.status}|${filters.assignedTo}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    fetchContacts(page, filters);
  }, [fetchContacts, page, filters]);

  const fetchSources = useCallback(async () => {
    const result = await listContactSources({ onlyActive: true });
    setSources(result.data ?? []);
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  function openSourcesSheet() {
    setSourcesSheetOpen(true);
  }

  function closeSourcesSheet() {
    setSourcesSheetOpen(false);
    fetchSources();
  }

  function openCreate() {
    setEditingContact(null);
    setModalOpen(true);
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingContact(null);
  }

  function onSaved(contact: Contact, isEdit: boolean) {
    closeModal();
    if (isEdit) {
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
    } else {
      setContacts((prev) => [contact, ...prev]);
      setTotal((prev) => prev + 1);
    }
    startTransition(() => fetchContacts(page, filters));
  }

  function onDeleted() {
    setDeleteConfirm(null);
    startTransition(() => fetchContacts(page, filters));
  }

  function refetch() {
    lastKey.current = null;
    startTransition(() => fetchContacts(page, filters));
  }

  const updateFilters = useCallback((next: Partial<ContactFilters>) => {
    startNavigation(() => {
      setPage(0);
      setFilters((prev) => ({ ...prev, ...next }));
    });
  }, []);

  const changePage = useCallback((newPage: number) => {
    startNavigation(() => setPage(newPage));
  }, []);

  // ─── carteira ────────────────────────────────────────────────────────────

  function openAssign(contact: Contact) {
    setAssignModal({ open: true, contact });
  }

  function closeAssign() {
    setAssignModal({ open: false, contact: null });
  }

  async function onAssign(contactId: string, userId: string | null) {
    const result = await assignContact(contactId, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Responsável atribuído!");
    const updated = "contact" in result ? result.contact : undefined;
    if (updated) setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
    closeAssign();
  }

  async function openAccess(contact: Contact) {
    const result = await listContactAccess(contact.id);
    setAccessSheet({ open: true, contact, grants: result.data ?? [] });
  }

  function closeAccess() {
    setAccessSheet({ open: false, contact: null, grants: [] });
  }

  async function onGrantAccess(contactId: string, userId: string) {
    const result = await grantContactAccess(contactId, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const updated = await listContactAccess(contactId);
    setAccessSheet((prev) => ({ ...prev, grants: updated.data ?? [] }));
    toast.success("Acesso concedido.");
  }

  async function onRevokeAccess(contactId: string, userId: string) {
    const result = await revokeContactAccess(contactId, userId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setAccessSheet((prev) => ({
      ...prev,
      grants: prev.grants.filter((g) => g.user_id !== userId),
    }));
    toast.success("Acesso removido.");
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    contacts, total, totalPages, page, changePage,
    filters, updateFilters,
    loading: loading || isPending,
    isNavigating,
    fetchError,
    modalOpen, editingContact, openCreate, openEdit, closeModal, onSaved, isEdit: !!editingContact,
    deleteConfirm, setDeleteConfirm, onDeleted, refetch,
    pageSize: PAGE_SIZE,
    // carteira
    isManager,
    members,
    currentUserId,
    assignModal, openAssign, closeAssign, onAssign,
    accessSheet, openAccess, closeAccess, onGrantAccess, onRevokeAccess,
    // origens
    sources, sourcesSheetOpen, openSourcesSheet, closeSourcesSheet,
  };
}
