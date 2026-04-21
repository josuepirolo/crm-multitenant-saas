"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactFiltersBar } from "@/components/contacts/contact-filters";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactModal } from "@/components/contacts/contact-modal";
import { DeleteConfirmDialog } from "@/components/contacts/delete-confirm-dialog";
import { useContactsViewModel } from "@/viewmodels/useContactsViewModel";

export function ContactsClient() {
  const vm = useContactsViewModel();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vm.total > 0 ? `${vm.total} contato${vm.total !== 1 ? "s" : ""} no total` : "Gerencie seus contatos"}
          </p>
        </div>
        <Button onClick={vm.openCreate} className="rounded-xl gap-1.5">
          <Plus size={15} />
          Novo contato
        </Button>
      </div>

      <ContactFiltersBar filters={vm.filters} onChange={vm.updateFilters} />

      {vm.fetchError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {vm.fetchError}
        </div>
      )}

      <ContactsTable
        contacts={vm.contacts}
        total={vm.total}
        page={vm.page}
        pageSize={vm.pageSize}
        loading={vm.loading}
        onEdit={vm.openEdit}
        onDelete={vm.setDeleteConfirm}
        onPageChange={vm.changePage}
      />

      <ContactModal
        open={vm.modalOpen}
        contact={vm.editingContact}
        onClose={vm.closeModal}
        onSaved={vm.onSaved}
      />

      <DeleteConfirmDialog
        contact={vm.deleteConfirm}
        onClose={() => vm.setDeleteConfirm(null)}
        onDeleted={vm.onDeleted}
      />
    </div>
  );
}
