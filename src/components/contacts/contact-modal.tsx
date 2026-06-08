"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import PhoneInput, { type Value as PhoneValue } from "react-phone-number-input";
import ptBR from "react-phone-number-input/locale/pt-BR.json";
import "react-phone-number-input/style.css";
import { createContact, updateContact } from "@/app/(dashboard)/contacts/actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { appleEase } from "@/components/ui/motion";
import { contactSchema, type ContactFormValues } from "@/lib/validations/contact";
import { DocumentField } from "@/components/ui/document-field";
import { maskDocument, stripDocument } from "@/lib/validations/document";
import type { Contact } from "@/repositories/contact.repository";
import type { ContactSource } from "@/types";

const STATUS_OPTIONS = [
  { value: "lead",     label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "customer", label: "Cliente" },
  { value: "churned",  label: "Inativo" },
];

interface ContactModalProps {
  open: boolean;
  contact?: Contact | null;
  sources: ContactSource[];
  onClose: () => void;
  onSaved: (contact: Contact, isEdit: boolean) => void;
}

export function ContactModal({ open, contact, sources, onClose, onSaved }: ContactModalProps) {
  const isEdit = !!contact;

  const { register, handleSubmit, reset, setError, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { status: "lead", personType: "fisica" },
  });

  const personType = watch("personType");

  useEffect(() => {
    if (!open) return;
    if (contact) {
      const pType = contact.document
        ? stripDocument(contact.document).length === 14 ? "juridica" : "fisica"
        : "fisica";
      reset({
        name:       contact.name,
        personType: pType,
        document:   contact.document ? maskDocument(contact.document) : "",
        phone:      contact.phone ? `+${contact.phone}` : "",
        email:      contact.email ?? "",
        company:    contact.company ?? "",
        status:     contact.status,
        notes:      contact.notes ?? "",
        source_id:  contact.source_id ?? "",
      });
    } else {
      reset({ name: "", personType: "fisica", document: "", phone: "", email: "", company: "", status: "lead", notes: "", source_id: "" });
    }
  }, [open, contact, reset]);

  function handlePersonTypeChange(type: "fisica" | "juridica") {
    setValue("personType", type);
    setValue("document", "");
  }

  async function onSubmit(values: ContactFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => formData.append(k, v ?? ""));
    if (isEdit) formData.append("id", contact.id);

    const action = isEdit ? updateContact : createContact;

    const resultPromise = action(null, formData).then((r): { error: undefined; contact: Contact } => {
      if (r.error) throw new Error(r.error);
      return r as { error: undefined; contact: Contact };
    });

    toast.promise(resultPromise, {
      loading: isEdit ? "Salvando alterações..." : "Criando contato...",
      success: isEdit ? "Contato atualizado!" : "Contato criado!",
      error: (err: Error) => err.message ?? "Erro ao salvar contato.",
    });

    try {
      const result = await resultPromise;
      onSaved(result.contact!, isEdit);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes("telefone"))                          setError("phone",    { message: msg });
      else if (msg.includes("e-mail"))                       setError("email",    { message: msg });
      else if (msg.includes("CPF") || msg.includes("CNPJ")) setError("document", { message: msg });
    }
  }

  const inputCls = "h-10 rounded-xl border-border/60 bg-background text-sm";

  return (
    <AnimatePresence>
      {open && (
        <>
          <ModalOverlay onClick={onClose} />
          <motion.div key="modal"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-2xl border border-border/50 bg-card shadow-2xl shadow-black/20 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h2 className="text-base font-semibold">{isEdit ? "Editar contato" : "Novo contato"}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium">Nome *</Label>
                  <Input {...register("name")} placeholder="Nome completo" autoFocus className={inputCls} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium">Tipo de pessoa</Label>
                  <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 w-fit">
                    {(["fisica", "juridica"] as const).map((t) => (
                      <button key={t} type="button"
                        onClick={() => handlePersonTypeChange(t)}
                        className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                          personType === t
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <DocumentField
                    value={watch("document") ?? ""}
                    onChange={(v) => setValue("document", v, { shouldValidate: false })}
                    label={personType === "fisica" ? "CPF" : "CNPJ"}
                    error={errors.document?.message}
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium">Celular *</Label>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        international
                        defaultCountry="BR"
                        labels={ptBR}
                        value={field.value as PhoneValue}
                        onChange={field.onChange}
                        inputComponent={Input as React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>}
                        className="phone-input-wrapper"
                      />
                    )}
                  />
                  {errors.phone
                    ? <p className="text-xs text-destructive">{errors.phone.message}</p>
                    : <p className="text-xs text-muted-foreground">Salvo em formato internacional (E.164)</p>
                  }
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium">E-mail</Label>
                  <Input type="email" {...register("email")} placeholder="email@empresa.com" className={inputCls} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Empresa</Label>
                  <Input {...register("company")} placeholder="Nome da empresa" className={inputCls} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Status</Label>
                  <select {...register("status")}
                    className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Origem</Label>
                  <select {...register("source_id")}
                    className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
                    <option value="">Não informada</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium">Notas</Label>
                  <textarea {...register("notes")} placeholder="Observações sobre este contato..."
                    rows={3}
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl min-w-[120px]">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Salvando...
                    </span>
                  ) : isEdit ? "Salvar" : "Criar contato"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
