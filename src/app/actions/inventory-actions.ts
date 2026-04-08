"use server";

import { Prisma } from "@prisma/client";
import { assertCanOperateInventory, canViewFinancial } from "@/lib/access-control";
import { requireAuthContext } from "@/lib/auth";
import {
  createDailyInventoryReport,
  createInventoryProduct,
} from "@/lib/inventory";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProductFormState = {
  error: string | null;
};

export const INITIAL_PRODUCT_FORM_STATE: ProductFormState = {
  error: null,
};

export type DailyReportFormState = {
  error: string | null;
};

export const INITIAL_DAILY_REPORT_FORM_STATE: DailyReportFormState = {
  error: null,
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

function parseProductId(value: FormDataEntryValue | null) {
  const productId = String(value ?? "").trim();
  if (!productId) {
    throw new Error("Product is required");
  }
  return productId;
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
    const category = parseOptionalText(formData.get("category"), 80);

    await createInventoryProduct({
      workspaceId: context.workspaceId,
      name,
      sellingPrice: Number(sellingPrice.toFixed(2)),
      costPrice: Number(costPrice.toFixed(2)),
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
    const productId = parseProductId(formData.get("product_id"));
    const reportDate = parseDateInput(formData.get("report_date"), "report date");
    const beginningStock = parseNonNegativeNumber(
      formData.get("beginning_stock"),
      "Beginning stock",
    );
    const stockAdded = parseNonNegativeNumber(formData.get("stock_added"), "Stock added");
    const endingStock = parseNonNegativeNumber(formData.get("ending_stock"), "Ending stock");
    const wasteUnits = parseNonNegativeNumber(formData.get("waste_units"), "Waste units", {
      required: false,
      defaultValue: 0,
    });

    await createDailyInventoryReport({
      workspaceId: context.workspaceId,
      productId,
      reportDate,
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
