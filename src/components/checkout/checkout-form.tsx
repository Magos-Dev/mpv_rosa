"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Banknote,
  Bike,
  CreditCard,
  Loader2,
  QrCode,
  ShoppingBag,
  Store,
  TicketPercent,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ChoiceCards } from "@/components/checkout/choice-cards";
import { EmptyState } from "@/components/feedback/empty-state";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useQuote } from "@/hooks/use-quote";
import { applyServerFieldErrors } from "@/hooks/use-server-action";
import { getSource, loadCustomer, saveCustomer } from "@/lib/cart/memory";
import { cart, toPayload, useCart, useHydrated } from "@/lib/cart/store";
import { formatBRL } from "@/lib/format";
import { placeOrder } from "@/lib/orders/actions";
import {
  checkoutSchema,
  formatPhone,
  type CheckoutData,
  type CheckoutInput,
} from "@/lib/orders/schemas";
import { lookupCep } from "@/lib/viacep";

const EMPTY_ADDRESS: CheckoutInput["address"] = {
  zip_code: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  reference: "",
};

const DEFAULTS: CheckoutInput = {
  name: "",
  phone: "",
  email: "",
  order_type: "delivery",
  address: EMPTY_ADDRESS,
  payment_method: "pix",
  change_for: "",
  notes: "",
  marketing_opt_in: false,
};

export function CheckoutForm({ accepting }: { accepting: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { lines } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const form = useForm<CheckoutInput, unknown, CheckoutData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: DEFAULTS,
  });
  const errors = form.formState.errors;
  const orderType = useWatch({ control: form.control, name: "order_type" });
  const payment = useWatch({ control: form.control, name: "payment_method" });

  // Preenche com os dados lembrados neste aparelho
  useEffect(() => {
    const saved = loadCustomer();
    if (!saved) return;
    form.reset({
      ...DEFAULTS,
      name: saved.name ?? "",
      phone: saved.phone ? formatPhone(saved.phone) : "",
      email: saved.email ?? "",
      order_type: saved.order_type ?? "delivery",
      payment_method: saved.payment_method ?? "pix",
      address: { ...EMPTY_ADDRESS, ...saved.address },
    });
  }, [form]);

  const quote = useQuote(
    lines,
    orderType === "pickup" ? "pickup" : "delivery",
    hydrated && !placed,
    appliedCoupon,
  );

  async function onCepChange(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    const found = await lookupCep(digits);
    setCepLoading(false);
    if (!found) {
      toast.error("CEP não encontrado. Preencha o endereço manualmente.");
      return;
    }
    const opts = { shouldValidate: true, shouldDirty: true };
    if (found.street) form.setValue("address.street", found.street, opts);
    if (found.neighborhood) form.setValue("address.neighborhood", found.neighborhood, opts);
    if (found.city) form.setValue("address.city", found.city, opts);
    if (found.state) form.setValue("address.state", found.state, opts);
    form.setFocus("address.number");
  }

  async function onSubmit(values: CheckoutData) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const raw = form.getValues();
      const result = await placeOrder({
        checkout: raw,
        items: toPayload(lines),
        source: getSource(),
        website: honeypot,
        // Só envia o cupom se a cotação o aceitou (o banco valida de novo)
        couponCode: quote.status === "ready" && quote.quote.coupon ? quote.quote.coupon.code : null,
      });

      if (!result.ok) {
        applyServerFieldErrors(form.setError, result.fieldErrors);
        setSubmitError(result.error);
        return;
      }

      saveCustomer({
        name: values.name,
        phone: values.phone,
        email: values.email ?? "",
        order_type: values.order_type,
        payment_method: values.payment_method,
        address: values.order_type === "delivery" ? raw.address : (loadCustomer()?.address ?? EMPTY_ADDRESS),
      });
      setPlaced(true);
      cart.clear();
      router.replace(`/pedido/${result.data.public_token}`);
    } catch {
      setSubmitError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (placed) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        <p className="font-medium">Pedido enviado! Abrindo o acompanhamento…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Seu carrinho está vazio"
        action={
          <Button asChild size="lg">
            <Link href="/cardapio">Ver cardápio</Link>
          </Button>
        }
      />
    );
  }

  const total = quote.status === "ready" ? quote.quote.total : null;
  const belowMinimum =
    quote.status === "ready" && quote.quote.subtotal < quote.quote.minimum_order;
  const canSubmit = accepting && quote.status === "ready" && !belowMinimum && !submitting;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 pb-28" noValidate>
      {/* Anti-bot: invisível para pessoas */}
      <input
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seus dados</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Nome" htmlFor="name" error={errors.name?.message}>
            <Input id="name" autoComplete="name" className="h-11 text-base" {...form.register("name")} />
          </Field>
          <Field
            label="WhatsApp"
            htmlFor="phone"
            error={errors.phone?.message}
            hint="Usaremos para falar sobre o seu pedido."
          >
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 98765-4321"
              className="h-11 text-base"
              {...form.register("phone", {
                onBlur: (e) => form.setValue("phone", formatPhone(e.target.value)),
              })}
            />
          </Field>
          <Field label="E-mail (opcional)" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="h-11 text-base"
              {...form.register("email")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como você quer receber?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="order_type"
            render={({ field }) => (
              <ChoiceCards
                name="Tipo do pedido"
                value={field.value}
                onChange={field.onChange}
                choices={[
                  { value: "delivery", label: "Entrega", icon: Bike },
                  { value: "pickup", label: "Retirar no local", icon: Store },
                ]}
              />
            )}
          />

          {orderType === "delivery" && (
            <div className="grid gap-4 sm:grid-cols-6">
              <Field
                label="CEP"
                htmlFor="zip"
                error={errors.address?.zip_code?.message}
                className="sm:col-span-2"
              >
                <div className="relative">
                  <Input
                    id="zip"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    className="h-11 text-base"
                    {...form.register("address.zip_code", {
                      onChange: (e) => void onCepChange(e.target.value),
                    })}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" aria-label="Buscando CEP" />
                  )}
                </div>
              </Field>
              <Field
                label="Rua"
                htmlFor="street"
                error={errors.address?.street?.message}
                className="sm:col-span-4"
              >
                <Input id="street" autoComplete="address-line1" className="h-11 text-base" {...form.register("address.street")} />
              </Field>
              <Field
                label="Número"
                htmlFor="number"
                error={errors.address?.number?.message}
                className="sm:col-span-2"
              >
                <Input id="number" inputMode="numeric" className="h-11 text-base" {...form.register("address.number")} />
              </Field>
              <Field
                label="Complemento"
                htmlFor="complement"
                error={errors.address?.complement?.message}
                className="sm:col-span-4"
              >
                <Input id="complement" placeholder="Apto, bloco…" className="h-11 text-base" {...form.register("address.complement")} />
              </Field>
              <Field
                label="Bairro"
                htmlFor="neighborhood"
                error={errors.address?.neighborhood?.message}
                className="sm:col-span-3"
              >
                <Input id="neighborhood" className="h-11 text-base" {...form.register("address.neighborhood")} />
              </Field>
              <Field
                label="Cidade"
                htmlFor="city"
                error={errors.address?.city?.message}
                className="sm:col-span-2"
              >
                <Input id="city" autoComplete="address-level2" className="h-11 text-base" {...form.register("address.city")} />
              </Field>
              <Field
                label="UF"
                htmlFor="state"
                error={errors.address?.state?.message}
                className="sm:col-span-1"
              >
                <Input id="state" maxLength={2} className="h-11 text-base uppercase" {...form.register("address.state")} />
              </Field>
              <Field
                label="Ponto de referência"
                htmlFor="reference"
                error={errors.address?.reference?.message}
                className="sm:col-span-6"
              >
                <Input id="reference" placeholder="Ex.: portão azul" className="h-11 text-base" {...form.register("address.reference")} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <ChoiceCards
                name="Forma de pagamento"
                columns={3}
                value={field.value}
                onChange={field.onChange}
                choices={[
                  { value: "pix", label: "PIX", icon: QrCode },
                  { value: "cash", label: "Dinheiro", icon: Banknote },
                  {
                    value: "card_on_delivery",
                    label: "Cartão",
                    description: orderType === "pickup" ? "Na retirada" : "Na entrega",
                    icon: CreditCard,
                  },
                ]}
              />
            )}
          />
          {payment === "cash" && (
            <Field
              label="Troco para quanto?"
              htmlFor="change"
              error={errors.change_for?.message}
              hint="Deixe vazio se não precisar de troco."
            >
              <Input
                id="change"
                inputMode="decimal"
                placeholder="Ex.: 100,00"
                className="h-11 text-base"
                {...form.register("change_for")}
              />
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-0">
          <Field label="Observações do pedido (opcional)" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" rows={2} maxLength={500} {...form.register("notes")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {quote.status === "error" ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>
                {quote.error}{" "}
                <Link href="/carrinho" className="underline">
                  Voltar ao carrinho
                </Link>
              </AlertDescription>
            </Alert>
          ) : quote.status !== "ready" ? (
            <Skeleton className="h-24" />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {quote.quote.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      {item.quantity}× {item.name}
                      {item.options.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {item.options.map((o) => o.name).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0">{formatBRL(item.total)}</span>
                  </li>
                ))}
              </ul>
              <dl className="flex flex-col gap-1 border-t pt-3">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatBRL(quote.quote.subtotal)}</dd>
                </div>
                {quote.quote.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Desconto (cupom {quote.quote.coupon?.code})</dt>
                    <dd>− {formatBRL(quote.quote.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Taxa de entrega</dt>
                  <dd className={quote.quote.coupon?.type === "free_delivery" ? "text-emerald-700" : undefined}>
                    {orderType === "pickup"
                      ? "Retirada"
                      : quote.quote.coupon?.type === "free_delivery"
                        ? `Grátis (cupom ${quote.quote.coupon.code})`
                        : quote.quote.delivery_fee > 0
                          ? formatBRL(quote.quote.delivery_fee)
                          : "Grátis"}
                  </dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatBRL(quote.quote.total)}</dd>
                </div>
              </dl>
              {belowMinimum && (
                <p className="text-destructive">
                  O pedido mínimo é de {formatBRL(quote.quote.minimum_order)}.
                </p>
              )}
            </>
          )}

          {/* Cupom (seção 15) — validado no servidor a cada alteração */}
          <div className="flex flex-col gap-2 border-t pt-3">
            {appliedCoupon && quote.status === "ready" && quote.quote.coupon ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                <span className="flex items-center gap-2">
                  <TicketPercent className="size-4" aria-hidden />
                  Cupom <strong>{quote.quote.coupon.code}</strong> aplicado
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput("");
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  aria-label="Cupom de desconto"
                  placeholder="Cupom de desconto"
                  className="h-10 uppercase"
                  value={couponInput}
                  maxLength={30}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (couponInput.trim()) setAppliedCoupon(couponInput.trim());
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={!couponInput.trim() || quote.status === "loading"}
                  onClick={() => setAppliedCoupon(couponInput.trim())}
                >
                  Aplicar
                </Button>
              </div>
            )}
            {appliedCoupon && quote.status === "ready" && quote.quote.coupon_error && (
              <p className="text-sm text-destructive" role="alert">
                {quote.quote.coupon_error}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 px-1 text-sm">
        <Controller
          control={form.control}
          name="marketing_opt_in"
          render={({ field }) => (
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                className="mt-0.5"
              />
              <span>Quero receber promoções e novidades pelo WhatsApp.</span>
            </label>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Usamos seus dados apenas para preparar e entregar o seu pedido. Saiba mais na{" "}
          <Link href="/privacidade" className="underline" target="_blank">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>

      {!accepting && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>A loja não está recebendo pedidos no momento.</AlertDescription>
        </Alert>
      )}
      {submitError && (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur">
        <Button
          type="submit"
          size="lg"
          className="mx-auto flex h-12 w-full max-w-3xl justify-between text-base"
          disabled={!canSubmit}
        >
          <span className="flex items-center gap-2">
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitting ? "Enviando…" : "Fazer pedido"}
          </span>
          {total !== null && <span>{formatBRL(total)}</span>}
        </Button>
      </div>
    </form>
  );
}
