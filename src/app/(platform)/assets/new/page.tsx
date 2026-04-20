import { AssetForm } from "@/components/assets/asset-form";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";


export default async function NewAssetRecordPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  return <AssetForm canViewFinancial={context.role === "owner"} />;
}
