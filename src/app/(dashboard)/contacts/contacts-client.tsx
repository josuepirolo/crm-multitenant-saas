"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadFiltersBar } from "@/components/contacts/lead-filters";
import { LeadsTable } from "@/components/contacts/leads-table";
import { LeadModal } from "@/components/contacts/lead-modal";
import { DeleteConfirmDialog } from "@/components/contacts/delete-confirm-dialog";
import { useLeadsViewModel } from "@/viewmodels/useLeadsViewModel";

export function ContactsClient() {
  const vm = useLeadsViewModel();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vm.total > 0 ? `${vm.total} lead${vm.total !== 1 ? "s" : ""} no total` : "Gerencie seus leads"}
          </p>
        </div>
        <Button onClick={vm.openCreate} className="rounded-xl gap-1.5">
          <Plus size={15} />
          Novo lead
        </Button>
      </div>

      {/* Filters */}
      <LeadFiltersBar filters={vm.filters} onChange={vm.updateFilters} />

      {/* Fetch error */}
      {vm.fetchError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {vm.fetchError}
        </div>
      )}

      {/* Table */}
      <LeadsTable
        leads={vm.leads}
        total={vm.total}
        page={vm.page}
        pageSize={vm.pageSize}
        loading={vm.loading}
        onEdit={vm.openEdit}
        onDelete={vm.setDeleteConfirm}
        onPageChange={vm.setPage}
      />

      {/* Create/Edit modal */}
      <LeadModal
        open={vm.modalOpen}
        lead={vm.editingLead}
        onClose={vm.closeModal}
        onSaved={vm.onSaved}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        lead={vm.deleteConfirm}
        onClose={() => vm.setDeleteConfirm(null)}
        onDeleted={vm.onDeleted}
      />
    </div>
  );
}
