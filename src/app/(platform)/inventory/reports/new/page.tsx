import { DailyReportForm } from "@/components/inventory/daily-report-form";
import { getAuthContext } from "@/lib/auth";
import { getInventoryProducts } from "@/lib/inventory";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewInventoryDailyReportPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const products = await getInventoryProducts();

  return (
    <DailyReportForm
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        is_active: product.is_active,
      }))}
    />
  );
}
