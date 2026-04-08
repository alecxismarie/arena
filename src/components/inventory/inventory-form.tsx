"use client";

import {
  createInventoryRecordAction,
  INITIAL_INVENTORY_FORM_STATE,
  type InventoryFormState,
} from "@/app/actions/inventory-actions";
import { useActionState } from "react";

type InventoryFormProps = {
  canViewFinancial: boolean;
};

const todayDateValue = new Date().toISOString().slice(0, 10);

export function InventoryForm({ canViewFinancial }: InventoryFormProps) {
  const [state, formAction, isPending] = useActionState<
    InventoryFormState,
    FormData
  >(createInventoryRecordAction, INITIAL_INVENTORY_FORM_STATE);

  return (
    <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Add inventory record
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log units in, units out, remaining stock, and optional revenue.
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Product name</span>
            <input
              name="product_name"
              placeholder="Enter product name"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Record date</span>
            <input
              type="date"
              name="record_date"
              defaultValue={todayDateValue}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>
        </div>

        <div
          className={`grid gap-4 ${canViewFinancial ? "md:grid-cols-3" : "md:grid-cols-2"}`}
        >
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Units in</span>
            <input
              type="number"
              min={0}
              name="units_in"
              defaultValue={0}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Units out</span>
            <input
              type="number"
              min={0}
              name="units_out"
              defaultValue={0}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Remaining stock</span>
            <input
              type="number"
              min={0}
              name="remaining_stock"
              defaultValue={0}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Waste units</span>
            <input
              type="number"
              min={0}
              name="waste_units"
              defaultValue={0}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
            />
          </label>

          {canViewFinancial ? (
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Revenue (optional)</span>
              <input
                type="number"
                step="0.01"
                min={0}
                name="revenue"
                placeholder="e.g. 1250.00"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>
          ) : null}
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
            {isPending ? "Saving..." : "Save record"}
          </button>
        </div>
      </form>
    </section>
  );
}
