"use client";

import {
  createDailyProductReportAction,
  INITIAL_DAILY_REPORT_FORM_STATE,
  type DailyReportFormState,
} from "@/app/actions/inventory-actions";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

type ProductOption = {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
};

type DailyReportFormProps = {
  products: ProductOption[];
};

const todayDateValue = new Date().toISOString().slice(0, 10);

function calculatePreviewUnitsSold(
  beginningStock: string,
  stockAdded: string,
  endingStock: string,
  wasteUnits: string,
) {
  const beginning = Number(beginningStock || "0");
  const added = Number(stockAdded || "0");
  const ending = Number(endingStock || "0");
  const waste = Number(wasteUnits || "0");
  if (
    !Number.isFinite(beginning) ||
    !Number.isFinite(added) ||
    !Number.isFinite(ending) ||
    !Number.isFinite(waste)
  ) {
    return null;
  }
  return beginning + added - ending - waste;
}

export function DailyReportForm({ products }: DailyReportFormProps) {
  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active),
    [products],
  );
  const [state, formAction, isPending] = useActionState<DailyReportFormState, FormData>(
    createDailyProductReportAction,
    INITIAL_DAILY_REPORT_FORM_STATE,
  );

  const [beginningStock, setBeginningStock] = useState("0");
  const [stockAdded, setStockAdded] = useState("0");
  const [endingStock, setEndingStock] = useState("0");
  const [wasteUnits, setWasteUnits] = useState("0");
  const unitsSoldPreview = calculatePreviewUnitsSold(
    beginningStock,
    stockAdded,
    endingStock,
    wasteUnits,
  );

  return (
    <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Add daily product report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit daily closing stock by product. Signals computes units sold, revenue, and gross
          profit on the server and adds this data to the daily business summary.
        </p>
      </header>

      {activeProducts.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          <p>Add at least one active product before submitting daily reports.</p>
          <Link
            href="/inventory/products/new"
            className="btn-secondary mt-3 inline-flex rounded-xl px-3 py-2 text-xs font-medium"
          >
            Add product
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Product</span>
              <select
                name="product_id"
                required
                defaultValue=""
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              >
                <option value="" disabled>
                  Select product
                </option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {product.category ? ` (${product.category})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Report date</span>
              <input
                type="date"
                name="report_date"
                defaultValue={todayDateValue}
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Beginning stock</span>
              <input
                type="number"
                min={0}
                name="beginning_stock"
                defaultValue={0}
                required
                onChange={(event) => setBeginningStock(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Stock added</span>
              <input
                type="number"
                min={0}
                name="stock_added"
                defaultValue={0}
                required
                onChange={(event) => setStockAdded(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Ending stock</span>
              <input
                type="number"
                min={0}
                name="ending_stock"
                defaultValue={0}
                required
                onChange={(event) => setEndingStock(event.target.value)}
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
                onChange={(event) => setWasteUnits(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            Units sold formula: beginning stock + stock added - ending stock - waste units.
            <span className="mt-1 block font-medium text-foreground">
              Preview units sold: {unitsSoldPreview === null ? "--" : unitsSoldPreview}
            </span>
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
              {isPending ? "Saving..." : "Save daily report"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
