"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Copy, ListPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";

import { EmptyState } from "@/components/feedback/empty-state";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { applyServerFieldErrors, useServerAction } from "@/hooks/use-server-action";
import { getOptionGroupsToCopy, saveOptionGroups } from "@/lib/catalog/actions";
import type { OptionGroupWithOptions } from "@/lib/catalog/queries";
import {
  optionGroupsSchema,
  type OptionGroupsData,
  type OptionGroupsInput,
} from "@/lib/catalog/schemas";
import { toMoneyInput } from "@/lib/format";

type FormGroup = OptionGroupsInput["groups"][number];

type OptionGroupsEditorProps = {
  productId: string;
  groups: OptionGroupWithOptions[];
  copySources: { id: string; name: string; group_count: number }[];
};

function toFormGroups(groups: OptionGroupWithOptions[]): FormGroup[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    required: g.required,
    min_choices: g.min_choices,
    max_choices: g.max_choices,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      additional_price: toMoneyInput(o.additional_price),
      available: o.available,
    })),
  }));
}

const emptyOption = () => ({ name: "", additional_price: "0,00", available: true });

export function OptionGroupsEditor({ productId, groups, copySources }: OptionGroupsEditorProps) {
  const { pending, run } = useServerAction();
  const [copyOpen, setCopyOpen] = useState(false);

  const form = useForm<OptionGroupsInput, unknown, OptionGroupsData>({
    resolver: zodResolver(optionGroupsSchema),
    defaultValues: { groups: toFormGroups(groups) },
  });

  const groupArray = useFieldArray({ control: form.control, name: "groups" });
  const isDirty = form.formState.isDirty;

  function onSubmit(values: OptionGroupsData) {
    run(
      async () => {
        const result = await saveOptionGroups(productId, values);
        if (!result.ok) applyServerFieldErrors(form.setError, result.fieldErrors);
        return result;
      },
      { success: "Adicionais salvos." },
    );
  }

  // Após salvar, o servidor devolve os grupos com os IDs novos: reinicia o
  // formulário. Compara pelo conteúdo para não descartar edições quando a
  // página é revalidada por outro motivo (ex.: salvar o produto).
  const serverSnapshot = JSON.stringify(groups);
  useEffect(() => {
    form.reset({ groups: toFormGroups(JSON.parse(serverSnapshot)) });
  }, [serverSnapshot, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adicionais e opções</CardTitle>
        <CardDescription>
          Ex.: “Ponto da carne” (obrigatório, escolher 1) ou “Adicionais” (opcional, até 5).
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {groupArray.fields.length === 0 ? (
            <EmptyState
              icon={ListPlus}
              title="Nenhum grupo de adicionais"
              description="Este produto é vendido sem opções. Adicione um grupo se precisar."
            />
          ) : (
            groupArray.fields.map((field, index) => (
              <GroupEditor
                key={field.id}
                index={index}
                total={groupArray.fields.length}
                control={form.control}
                register={form.register}
                errors={form.formState.errors}
                onMove={(to) => groupArray.move(index, to)}
                onRemove={() => groupArray.remove(index)}
              />
            ))
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                groupArray.append({
                  name: "",
                  required: false,
                  min_choices: 0,
                  max_choices: 1,
                  options: [emptyOption()],
                })
              }
            >
              <Plus aria-hidden />
              Adicionar grupo
            </Button>
            {copySources.length > 0 && (
              <Button type="button" variant="outline" onClick={() => setCopyOpen(true)}>
                <Copy aria-hidden />
                Copiar de outro produto
              </Button>
            )}
            <Button type="submit" className="ml-auto" size="lg" disabled={pending || !isDirty}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Salvar adicionais
            </Button>
          </div>
          {isDirty && (
            <p className="text-right text-xs text-muted-foreground">
              Há alterações não salvas nos adicionais.
            </p>
          )}
        </form>
      </CardContent>

      <CopyGroupsDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        sources={copySources}
        onCopy={(copied) => groupArray.append(copied)}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------

type GroupEditorProps = {
  index: number;
  total: number;
  control: Control<OptionGroupsInput, unknown, OptionGroupsData>;
  register: UseFormRegister<OptionGroupsInput>;
  errors: FieldErrors<OptionGroupsInput>;
  onMove: (to: number) => void;
  onRemove: () => void;
};

function GroupEditor({ index, total, control, register, errors, onMove, onRemove }: GroupEditorProps) {
  const optionArray = useFieldArray({ control, name: `groups.${index}.options` });
  const required = useWatch({ control, name: `groups.${index}.required` });
  const groupErrors = errors.groups?.[index];

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border p-4">
      <legend className="sr-only">Grupo {index + 1}</legend>

      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Nome do grupo"
          htmlFor={`group-${index}-name`}
          error={groupErrors?.name?.message}
          className="min-w-48 flex-1"
        >
          <Input
            id={`group-${index}-name`}
            placeholder="Ex.: Adicionais"
            {...register(`groups.${index}.name`)}
          />
        </Field>

        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Mover grupo para cima"
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Mover grupo para baixo"
            disabled={index === total - 1}
            onClick={() => onMove(index + 1)}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Remover grupo"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[auto_8rem_8rem] sm:items-end">
        <label className="col-span-2 flex h-9 items-center gap-2 text-sm font-medium sm:col-span-1">
          <Controller
            control={control}
            name={`groups.${index}.required`}
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          Obrigatório
        </label>
        {required && (
          <Field
            label="Mínimo"
            htmlFor={`group-${index}-min`}
            error={groupErrors?.min_choices?.message}
          >
            <Input
              id={`group-${index}-min`}
              type="number"
              min={1}
              inputMode="numeric"
              {...register(`groups.${index}.min_choices`)}
            />
          </Field>
        )}
        <Field
          label="Máximo"
          htmlFor={`group-${index}-max`}
          error={groupErrors?.max_choices?.message}
        >
          <Input
            id={`group-${index}-max`}
            type="number"
            min={1}
            inputMode="numeric"
            {...register(`groups.${index}.max_choices`)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Opções</p>
        {optionArray.fields.map((option, optionIndex) => {
          const optionErrors = groupErrors?.options?.[optionIndex];
          return (
            <div key={option.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Input
                  placeholder="Ex.: Bacon extra"
                  aria-label={`Nome da opção ${optionIndex + 1}`}
                  aria-invalid={Boolean(optionErrors?.name)}
                  className="min-w-40 flex-1"
                  {...register(`groups.${index}.options.${optionIndex}.name`)}
                />
                <div className="relative w-28">
                  <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                    + R$
                  </span>
                  <Input
                    inputMode="decimal"
                    aria-label={`Preço adicional da opção ${optionIndex + 1}`}
                    aria-invalid={Boolean(optionErrors?.additional_price)}
                    className="pl-10"
                    {...register(`groups.${index}.options.${optionIndex}.additional_price`)}
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Controller
                    control={control}
                    name={`groups.${index}.options.${optionIndex}.available`}
                    render={({ field }) => (
                      <Switch
                        size="sm"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Opção disponível"
                      />
                    )}
                  />
                  Disp.
                </label>
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Mover opção para cima"
                    disabled={optionIndex === 0}
                    onClick={() => optionArray.move(optionIndex, optionIndex - 1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Mover opção para baixo"
                    disabled={optionIndex === optionArray.fields.length - 1}
                    onClick={() => optionArray.move(optionIndex, optionIndex + 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover opção"
                    className="text-destructive hover:text-destructive"
                    onClick={() => optionArray.remove(optionIndex)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {(optionErrors?.name || optionErrors?.additional_price) && (
                <p className="text-sm text-destructive">
                  {optionErrors.name?.message ?? optionErrors.additional_price?.message}
                </p>
              )}
            </div>
          );
        })}
        {groupErrors?.options?.root?.message || groupErrors?.options?.message ? (
          <p className="text-sm text-destructive">
            {groupErrors.options.root?.message ?? groupErrors.options.message}
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => optionArray.append(emptyOption())}
        >
          <Plus aria-hidden />
          Adicionar opção
        </Button>
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------

type CopyGroupsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: { id: string; name: string; group_count: number }[];
  onCopy: (groups: FormGroup[]) => void;
};

function CopyGroupsDialog({ open, onOpenChange, sources, onCopy }: CopyGroupsDialogProps) {
  const { pending, run } = useServerAction();
  const [sourceId, setSourceId] = useState<string>();

  function copy() {
    if (!sourceId) return;
    run(() => getOptionGroupsToCopy(sourceId), {
      onSuccess: (result) => {
        onCopy(
          result.data.map((g) => ({
            ...g,
            options: g.options.map((o) => ({
              ...o,
              additional_price: toMoneyInput(Number(o.additional_price)),
            })),
          })),
        );
        onOpenChange(false);
        setSourceId(undefined);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar adicionais</DialogTitle>
          <DialogDescription>
            Os grupos do produto escolhido serão adicionados aqui. Revise e clique em “Salvar
            adicionais”.
          </DialogDescription>
        </DialogHeader>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="w-full" aria-label="Produto de origem">
            <SelectValue placeholder="Escolha um produto…" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.group_count} {s.group_count === 1 ? "grupo" : "grupos"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={copy} disabled={!sourceId || pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Copiar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
