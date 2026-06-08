"use client";

import { Plus, Upload, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactFiltersBar } from "@/components/contacts/contact-filters";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactModal } from "@/components/contacts/contact-modal";
import { DeleteConfirmDialog } from "@/components/contacts/delete-confirm-dialog";
import { AssignContactDialog } from "@/components/contacts/assign-contact-dialog";
import { ContactAccessSheet } from "@/components/contacts/contact-access-sheet";
import { ContactSourcesSheet } from "@/components/contacts/contact-sources-sheet";
import { ImportContactsDialog } from "@/components/contacts/import-contacts-dialog";
import { useContactsViewModel } from "@/viewmodels/useContactsViewModel";
import { useContactSourcesViewModel } from "@/viewmodels/useContactSourcesViewModel";
import { useContactImportViewModel } from "@/viewmodels/useContactImportViewModel";
import type { MemberRole, WorkspaceMemberWithProfile } from "@/types";

interface ContactsClientProps {
  initialRole: MemberRole | null;
  initialMembers: WorkspaceMemberWithProfile[];
  currentUserId: string;
}

export function ContactsClient({ initialRole, initialMembers, currentUserId }: ContactsClientProps) {
  const vm = useContactsViewModel({ initialRole, initialMembers, currentUserId });
  const importVm = useContactImportViewModel(vm.refetch);
  const sourcesVm = useContactSourcesViewModel(vm.sourcesSheetOpen);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vm.total > 0 ? `${vm.total} contato${vm.total !== 1 ? "s" : ""} no total` : "Gerencie seus contatos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {vm.isManager && (
            <Button onClick={vm.openSourcesSheet} variant="outline" size="icon" className="rounded-xl shrink-0" title="Gerenciar origens">
              <Tag size={15} />
            </Button>
          )}
          <Button onClick={importVm.openDialog} variant="outline" className="rounded-xl gap-1.5">
            <Upload size={15} />
            Importar planilha
          </Button>
          <Button onClick={vm.openCreate} className="rounded-xl gap-1.5">
            <Plus size={15} />
            Novo contato
          </Button>
        </div>
      </div>

      <ContactFiltersBar
        filters={vm.filters}
        onChange={vm.updateFilters}
        isManager={vm.isManager}
        members={vm.members}
      />

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
        isManager={vm.isManager}
        members={vm.members}
        onEdit={vm.openEdit}
        onDelete={vm.setDeleteConfirm}
        onAssign={vm.openAssign}
        onAccess={vm.openAccess}
        onPageChange={vm.changePage}
      />

      <ContactModal
        open={vm.modalOpen}
        contact={vm.editingContact}
        sources={vm.sources}
        onClose={vm.closeModal}
        onSaved={vm.onSaved}
      />

      <DeleteConfirmDialog
        contact={vm.deleteConfirm}
        onClose={() => vm.setDeleteConfirm(null)}
        onDeleted={vm.onDeleted}
      />

      <AssignContactDialog
        open={vm.assignModal.open}
        contact={vm.assignModal.contact}
        members={vm.members}
        onClose={vm.closeAssign}
        onAssign={vm.onAssign}
      />

      <ContactAccessSheet
        open={vm.accessSheet.open}
        contact={vm.accessSheet.contact}
        grants={vm.accessSheet.grants}
        members={vm.members}
        onClose={vm.closeAccess}
        onGrant={vm.onGrantAccess}
        onRevoke={vm.onRevokeAccess}
      />

      <ImportContactsDialog vm={importVm} />

      <ContactSourcesSheet
        open={vm.sourcesSheetOpen}
        sources={sourcesVm.sources}
        loading={sourcesVm.loading}
        creating={sourcesVm.creating}
        onClose={vm.closeSourcesSheet}
        onCreate={sourcesVm.onCreate}
        onRename={sourcesVm.onRename}
        onToggleActive={sourcesVm.onToggleActive}
      />
    </div>
  );
}
