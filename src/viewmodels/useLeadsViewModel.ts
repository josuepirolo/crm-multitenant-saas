"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getLeads } from "@/app/(dashboard)/contacts/actions";
import type { Lead, LeadFilters } from "@/repositories/lead.repository";

const PAGE_SIZE = 20;

export function useLeadsViewModel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<LeadFilters>({ search: "", status: "all" });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async (currentPage: number, currentFilters: LeadFilters) => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await getLeads(currentFilters, currentPage, PAGE_SIZE);
      if (result.error) {
        setFetchError(result.error);
        setLeads([]);
        setTotal(0);
      } else {
        setLeads(result.data);
        setTotal(result.total);
      }
    } catch (err) {
      console.error("[useLeadsViewModel]", err);
      setFetchError("Erro ao carregar leads.");
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(page, filters);
  }, [fetchLeads, page, filters]);

  function openCreate() {
    setEditingLead(null);
    setModalOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingLead(null);
  }

  function onSaved() {
    closeModal();
    startTransition(() => fetchLeads(page, filters));
  }

  function onDeleted() {
    setDeleteConfirm(null);
    startTransition(() => fetchLeads(page, filters));
  }

  function updateFilters(next: Partial<LeadFilters>) {
    setPage(0);
    setFilters((prev) => ({ ...prev, ...next }));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    leads, total, totalPages, page, setPage,
    filters, updateFilters,
    loading: loading || isPending,
    fetchError,
    modalOpen, editingLead, openCreate, openEdit, closeModal, onSaved,
    deleteConfirm, setDeleteConfirm, onDeleted,
    pageSize: PAGE_SIZE,
  };
}
