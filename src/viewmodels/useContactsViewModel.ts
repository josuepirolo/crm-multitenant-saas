"use client";

import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { getContacts } from "@/app/(dashboard)/contacts/actions";
import type { Contact, ContactFilters } from "@/repositories/contact.repository";

const PAGE_SIZE = 20;

export function useContactsViewModel() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ContactFilters>({ search: "", status: "all" });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isNavigating, startNavigation] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);

  // Deduplicação: ref persiste entre ciclos de mount do StrictMode.
  // Se a mesma chave (page + filters) já foi disparada, a chamada é ignorada.
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
    const key = `${page}|${filters.search}|${filters.status}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    fetchContacts(page, filters);
  }, [fetchContacts, page, filters]);

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
    // reconcilia em background sem bloquear a UI
    startTransition(() => fetchContacts(page, filters));
  }

  function onDeleted() {
    setDeleteConfirm(null);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    contacts, total, totalPages, page, changePage,
    filters, updateFilters,
    loading: loading || isPending,
    isNavigating,
    fetchError,
    modalOpen, editingContact, openCreate, openEdit, closeModal, onSaved, isEdit: !!editingContact,
    deleteConfirm, setDeleteConfirm, onDeleted,
    pageSize: PAGE_SIZE,
  };
}
