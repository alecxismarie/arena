"use client";

import {
  createProductAction,
} from "@/app/actions/inventory-actions";
import Link from "next/link";
import { useActionState } from "react";

type ProductFormProps = {
  canManagePricing: boolean;
};

type ProductFormState = {
  error: string | null;
};

const INITIAL_PRODUCT_FORM_STATE: ProductFormState = {
  error: null,
};

export function ProductForm({ canManagePricing }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState<ProductFormState, FormData>(
    createProductAction,
    INITIAL_PRODUCT_FORM_STATE,
  );

  if (!canManagePricing) {
    return (
      <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add product</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Product pricing is restricted to workspace owners.
        </p>
        <div className="mt-5">
          <Link
            href="/inventory/products"
            className="btn-secondary inline-flex rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            Back to products
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set product pricing once, then submit daily stock reports for computed sales and profit.
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Product name</span>
            <input
              name="name"
              placeholder="Enter product name"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Category (optional)</span>
            <input
              name="category"
              placeholder="e.g. Beverage, Food, Pastry"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Selling price per piece</span>
            <input
              type="number"
              step="0.01"
              min={0}
              name="selling_price"
              required
              placeholder="e.g. 5.80"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Cost price per piece</span>
            <input
              type="number"
              step="0.01"
              min={0}
              name="cost_price"
              required
              placeholder="e.g. 2.15"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>
        </div>

        {state.error ? (
          <p className="rounded-xl border border-red-200/70 bg-red-50/85 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}

        <div className="pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Saving..." : "Save product"}
          </button>
        </div>
      </form>
    </section>
  );
}
