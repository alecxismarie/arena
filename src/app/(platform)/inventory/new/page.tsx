import { InventoryForm } from "@/components/inventory/inventory-form";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewInventoryRecordPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  return <InventoryForm canViewFinancial={context.role === "owner"} />;
}
