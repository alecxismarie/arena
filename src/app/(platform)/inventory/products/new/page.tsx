import { ProductForm } from "@/components/inventory/product-form";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewInventoryProductPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  return <ProductForm canManagePricing={context.role === "owner"} />;
}
