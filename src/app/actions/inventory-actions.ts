"use server";

import { Prisma } from "@prisma/client";
import { assertCanOperateInventory, canViewFinancial } from "@/lib/access-control";
import { requireAuthContext } from "@/lib/auth";
import {
  createDailyInventoryReport,
  createInventoryProduct,
} from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ProductFormState = {
  error: string | null;
};

type DailyReportFormState = {
  error: string | null;
};

function parseName(value: FormDataEntryValue | null, field: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  if (normalized.length > 120) {
    throw new Error(`${field} must be 120 characters or less`);
  }
  return normalized;
}

function parseOptionalText(value: FormDataEntryValue | null, maxLength: number) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new Error(`Category must be ${maxLength} characters or less`);
  }
  return normalized;
}

function parseDateInput(value: FormDataEntryValue | null, field: string) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    throw new Error(`${field} is required`);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawValue);
  if (!match) {
    throw new Error(`Invalid ${field}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error(`Invalid ${field}`);
  }

  return parsed;
}

function parseNonNegativeNumber(
  value: FormDataEntryValue | null,
  field: string,
  options?: {
    integer?: boolean;
    required?: boolean;
    defaultValue?: number;
  },
) {
  const { integer = true, required = true, defaultValue = 0 } = options ?? {};
  if (value === null || value === "") {
    if (!required) return defaultValue;
    throw new Error(`${field} is required`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${field}`);
  }
  if (parsed < 0) {
    throw new Error(`${field} must be greater than or equal to 0`);
  }
  if (integer && !Number.isInteger(parsed)) {
    throw new Error(`${field} must be a whole number`);
  }

  return parsed;
}

function parsePositiveInteger(value: FormDataEntryValue | null, field: string) {
  const parsed = parseNonNegativeNumber(value, field, { integer: true });
  if (parsed < 1) {
    throw new Error(`${field} must be at least 1`);
  }
  return parsed;
}

function parseProductId(value: FormDataEntryValue | null) {
  const productId = String(value ?? "").trim();
  if (!productId) {
    throw new Error("Product is required");
  }
  return productId;
}

function parseStaffName(value: FormDataEntryValue | null) {
  const staffName = String(value ?? "").trim();
  if (!staffName) {
    throw new Error("Staff name is required");
  }
  if (staffName.length > 40) {
    throw new Error("Staff name must be 40 characters or less");
  }
  return staffName;
}

function parseEntryStage(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "opening") {
    return "opening" as const;
  }
  if (normalized === "closing") {
    return "closing" as const;
  }

  throw new Error("Invalid entry stage");
}

function safeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const context = await requireAuthContext();
  assertCanOperateInventory(context);

  if (!canViewFinancial(context.role)) {
    return {
      error: "Only workspace owners can create products with pricing.",
    };
  }

  try {
    const name = parseName(formData.get("name"), "Product name");
    const sellingPrice = parseNonNegativeNumber(
      formData.get("selling_price"),
      "Selling price",
      {
        integer: false,
      },
    );
    const costPrice = parseNonNegativeNumber(formData.get("cost_price"), "Cost price", {
      integer: false,
    });
    const yieldPerRecipe = parsePositiveInteger(
      formData.get("yield_per_recipe"),
      "Yield per recipe",
    );
    const category = parseOptionalText(formData.get("category"), 80);

    await createInventoryProduct({
      workspaceId: context.workspaceId,
      name,
      sellingPrice: Number(sellingPrice.toFixed(2)),
      costPrice: Number(costPrice.toFixed(2)),
      yieldPerRecipe,
      category,
    });
  } catch (error) {
    return {
      error: safeErrorMessage(error, "Unable to save product. Please try again."),
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/products");
  redirect("/inventory/products");
}

export async function createDailyProductReportAction(
  _previousState: DailyReportFormState,
  formData: FormData,
): Promise<DailyReportFormState> {
  const context = await requireAuthContext();
  assertCanOperateInventory(context);

  try {
    const entryStage = parseEntryStage(formData.get("entry_stage"));
    const staffName = parseStaffName(formData.get("staff_name"));
    const productId = parseProductId(formData.get("product_id"));
    const reportDate = parseDateInput(formData.get("report_date"), "report date");

    const beginningStock =
      entryStage === "opening"
        ? parseNonNegativeNumber(formData.get("beginning_stock"), "Beginning stock")
        : undefined;
    const stockAdded =
      entryStage === "closing"
        ? parseNonNegativeNumber(formData.get("stock_added"), "Stock added")
        : undefined;
    const endingStock =
      entryStage === "closing"
        ? parseNonNegativeNumber(formData.get("ending_stock"), "Ending stock")
        : undefined;
    const wasteUnits =
      entryStage === "closing"
        ? parseNonNegativeNumber(formData.get("waste_units"), "Waste units", {
            required: false,
            defaultValue: 0,
          })
        : undefined;

    await createDailyInventoryReport({
      workspaceId: context.workspaceId,
      productId,
      reportDate,
      entryStage,
      staffName,
      beginningStock,
      stockAdded,
      endingStock,
      wasteUnits,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "A report for this product and date already exists.",
      };
    }

    return {
      error: safeErrorMessage(error, "Unable to save daily report. Please try again."),
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/reports/new");
  redirect("/inventory");
}

function parseProductStatus(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "active") {
    return true;
  }
  if (normalized === "sold_out") {
    return false;
  }

  throw new Error("Invalid product status");
}

export async function setProductStatusAction(formData: FormData) {
  const context = await requireAuthContext();
  assertCanOperateInventory(context);

  const productId = parseProductId(formData.get("product_id"));
  const nextIsActive = parseProductStatus(formData.get("next_status"));

  await prisma.product.updateMany({
    where: {
      id: productId,
      workspace_id: context.workspaceId,
    },
    data: {
      is_active: nextIsActive,
    },
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/products");
  revalidatePath("/inventory/reports/new");
  redirect("/inventory/products");
}
