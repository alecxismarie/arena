import { setProductStatusAction } from "@/app/actions/inventory-actions";
import { getAuthContext } from "@/lib/auth";
import { getInventoryProductsPage } from "@/lib/inventory";
import { formatCurrency, formatInTimezone } from "@/lib/utils";
import { getWorkspaceById } from "@/lib/workspace";
import Link from "next/link";
import { redirect } from "next/navigation";

type InventoryProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const INVENTORY_PRODUCTS_PAGE_SIZE = 25;

function statusClass(isActive: boolean) {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function parsePage(raw: string | string[] | undefined) {
  const normalized = Array.isArray(raw) ? raw[0] : raw;
  if (!normalized) return 1;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export default async function InventoryProductsPage({
  searchParams,
}: InventoryProductsPageProps) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const params = await searchParams;
  const requestedPage = parsePage(params.page);
  const canViewFinancial = context.role === "owner";
  const [productsPage, workspace] = await Promise.all([
    getInventoryProductsPage({
      page: requestedPage,
      pageSize: INVENTORY_PRODUCTS_PAGE_SIZE,
    }),
    getWorkspaceById(context.workspaceId),
  ]);
  const products = productsPage.products;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Inventory products</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Product catalog with reusable pricing. Mark products sold out and reactivate later.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewFinancial ? (
            <Link
              href="/inventory/products/new"
              className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Add product
            </Link>
          ) : null}
          <Link
            href="/inventory/reports/new"
            className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            Log daily report
          </Link>
        </div>
      </header>

      {products.length === 0 ? (
        <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h2 className="text-lg font-semibold text-foreground">No products yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add products with selling and cost price to enable daily sales and gross profit
            reporting.
          </p>
          {canViewFinancial ? (
            <div className="mt-5">
              <Link
                href="/inventory/products/new"
                className="btn-primary inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Add product
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Ask a workspace owner to add product pricing.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Yield</th>
                  {canViewFinancial ? <th className="px-3 py-2">Selling price</th> : null}
                  {canViewFinancial ? <th className="px-3 py-2">Cost price</th> : null}
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="rounded-xl bg-muted/35 text-foreground">
                    <td className="rounded-l-xl px-3 py-3 font-medium">{product.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {product.category ?? "--"}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {product.yield_per_recipe} pcs/recipe
                    </td>
                    {canViewFinancial ? (
                      <td className="px-3 py-3">
                        {formatCurrency(product.selling_price, workspace?.currency)}
                      </td>
                    ) : null}
                    {canViewFinancial ? (
                      <td className="px-3 py-3">
                        {formatCurrency(product.cost_price, workspace?.currency)}
                      </td>
                    ) : null}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${statusClass(product.is_active)}`}
                      >
                        {product.is_active ? "Active" : "Sold out"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatInTimezone(product.updated_at, workspace?.timezone, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="rounded-r-xl px-3 py-3">
                      <form action={setProductStatusAction}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input
                          type="hidden"
                          name="next_status"
                          value={product.is_active ? "sold_out" : "active"}
                        />
                        <button
                          type="submit"
                          className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs font-medium"
                        >
                          {product.is_active ? "Mark sold out" : "Mark active"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
            <span>
              Showing{" "}
              {`${(productsPage.page - 1) * productsPage.pageSize + 1}-${Math.min(
                productsPage.page * productsPage.pageSize,
                productsPage.totalCount,
              )}`}{" "}
              of {productsPage.totalCount} products
            </span>
            <div className="flex items-center gap-2">
              {productsPage.page > 1 ? (
                <Link
                  href={`/inventory/products?page=${productsPage.page - 1}`}
                  className="btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-border/40 px-3 py-1.5 text-muted-foreground/60">
                  Previous
                </span>
              )}
              <span>
                Page {productsPage.page} of {productsPage.pageCount}
              </span>
              {productsPage.page < productsPage.pageCount ? (
                <Link
                  href={`/inventory/products?page=${productsPage.page + 1}`}
                  className="btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-lg border border-border/40 px-3 py-1.5 text-muted-foreground/60">
                  Next
                </span>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

