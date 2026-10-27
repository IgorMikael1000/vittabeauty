"use client";

import { useActionState } from "react";
import { createSubscriptionCheckoutAction } from "@/app/actions/subscriptions";
import type { FormState } from "@/app/actions/auth";
import {
  subscriptionPlans,
  type SubscriptionPlanType,
} from "@/lib/subscriptions";

const initialState: FormState = {};

function SubscribeButton({ planType }: { planType: SubscriptionPlanType }) {
  const [state, formAction, pending] = useActionState(
    createSubscriptionCheckoutAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-auto">
      <input name="planType" type="hidden" value={planType} />
      {state.error && (
        <p className="mb-3 text-xs leading-5 text-red-700" role="alert">
          {state.error}
        </p>
      )}
      <button
        className="w-full rounded-xl bg-vitta px-4 py-3 text-sm font-semibold text-white transition hover:bg-vitta/90 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Preparando checkout..." : "Assinar"}
      </button>
    </form>
  );
}

export function PlanCards() {
  const planTypes = Object.keys(
    subscriptionPlans,
  ) as SubscriptionPlanType[];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {planTypes.map((planType) => {
        const plan = subscriptionPlans[planType];
        const isAnnual = planType === "ANNUAL";
        const isSemiannual = planType === "SEMIANNUAL";

        return (
          <article
            className={`relative flex flex-col rounded-2xl border p-5 ${
              isAnnual
                ? "border-vitta bg-gradient-to-br from-[#faf6fd] to-[#f0e5f7] shadow-[0_12px_34px_rgba(121,80,165,0.18)] ring-1 ring-vitta/20"
                : "border-vitta-border bg-white"
            }`}
            key={planType}
          >
            {(isAnnual || isSemiannual) && (
              <span
                className={`mb-3 w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  isAnnual
                    ? "bg-vitta text-white"
                    : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {plan.savings}
              </span>
            )}
            <h3 className="text-lg font-semibold text-vitta-text">
              {plan.name}
            </h3>
            <p className="mt-2 text-2xl font-bold tracking-tight text-vitta-text">
              {plan.priceLabel}
            </p>
            <p className="mt-1 text-xs text-vitta-muted">
              {plan.intervalLabel}
            </p>
            <p className="mt-4 flex-1 text-sm leading-6 text-vitta-muted">
              Acesso completo ao Vitta Beauty com cobrança recorrente pelo
              Mercado Pago.
            </p>
            <SubscribeButton planType={planType} />
          </article>
        );
      })}
    </div>
  );
}
