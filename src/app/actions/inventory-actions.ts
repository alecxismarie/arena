"use server";

import { assertCanOperateInventory, canViewFinancial } from "@/lib/access-control";
import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type InventoryFormState = {
  error: string | null;
};

export const INITIAL_INVENTORY_FORM_STATE: InventoryFormState = {
  error: null,
};

function parseProductName(value: FormDataEntryValue | null) {
  const productName = String(value ?? "").trim();
  if (!productName) {
    throw new Error("Product name is required");
  }
  if (productName.length > 120) {
    throw new Error("Product name must be 120 characters or less");
  }
  return productName;
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

function parseOptionalNonNegativeDecimal(
  value: FormDataEntryValue | null,
  field: string,
) {
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${field}`);
  }
  if (parsed < 0) {
    throw new Error(`${field} must be greater than or equal to 0`);
  }

  return Number(parsed.toFixed(2));
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to save inventory record. Please try again.";
}

export async function createInventoryRecordAction(
  _previousState: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const context = await requireAuthContext();
  assertCanOperateInventory(context);

  try {
    const productName = parseProductName(formData.get("product_name"));
    const recordDate = parseDateInput(formData.get("record_date"), "record date");
    const unitsIn = parseNonNegativeNumber(formData.get("units_in"), "units in");
    const unitsOut = parseNonNegativeNumber(formData.get("units_out"), "units out");
    const remainingStock = parseNonNegativeNumber(
      formData.get("remaining_stock"),
      "remaining stock",
    );
    const wasteUnits = parseNonNegativeNumber(
      formData.get("waste_units"),
      "waste units",
      {
        required: false,
        defaultValue: 0,
      },
    );

    // Opening stock is not modeled in Inventory v1, so outbound upper-bound
    // validation is intentionally limited to non-negative and numeric checks.
    const revenue = canViewFinancial(context.role)
      ? parseOptionalNonNegativeDecimal(formData.get("revenue"), "revenue")
      : null;

    await prisma.inventoryRecord.create({
      data: {
        workspace_id: context.workspaceId,
        product_name: productName,
        record_date: recordDate,
        units_in: unitsIn,
        units_out: unitsOut,
        remaining_stock: remainingStock,
        waste_units: wasteUnits,
        revenue,
      },
    });
  } catch (error) {
    return {
      error: safeErrorMessage(error),
    };
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}
