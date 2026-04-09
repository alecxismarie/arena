"use server";

import { assertCanOperateAssets, canViewFinancial } from "@/lib/access-control";
import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AssetFormState = {
  error: string | null;
};

function parseAssetName(value: FormDataEntryValue | null) {
  const assetName = String(value ?? "").trim();
  if (!assetName) {
    throw new Error("Asset name is required");
  }
  if (assetName.length > 120) {
    throw new Error("Asset name must be 120 characters or less");
  }
  return assetName;
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

function parseNonNegativeInteger(value: FormDataEntryValue | null, field: string) {
  if (value === null || value === "") {
    throw new Error(`${field} is required`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${field} must be a whole number`);
  }
  if (parsed < 0) {
    throw new Error(`${field} must be greater than or equal to 0`);
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
  return "Unable to save asset record. Please try again.";
}

export async function createAssetRecordAction(
  _previousState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const context = await requireAuthContext();
  assertCanOperateAssets(context);

  try {
    const assetName = parseAssetName(formData.get("asset_name"));
    const recordDate = parseDateInput(formData.get("record_date"), "record date");
    const totalAssets = parseNonNegativeInteger(
      formData.get("total_assets"),
      "total assets",
    );
    const bookedAssets = parseNonNegativeInteger(
      formData.get("booked_assets"),
      "booked assets",
    );
    const idleAssets = parseNonNegativeInteger(formData.get("idle_assets"), "idle assets");

    if (totalAssets <= 0) {
      throw new Error("Total assets must be greater than 0");
    }
    if (bookedAssets > totalAssets) {
      throw new Error("Booked assets cannot exceed total assets");
    }
    if (idleAssets > totalAssets) {
      throw new Error("Idle assets cannot exceed total assets");
    }

    const revenue = canViewFinancial(context.role)
      ? parseOptionalNonNegativeDecimal(formData.get("revenue"), "revenue")
      : null;

    await prisma.assetRecord.create({
      data: {
        workspace_id: context.workspaceId,
        asset_name: assetName,
        record_date: recordDate,
        total_assets: totalAssets,
        booked_assets: bookedAssets,
        idle_assets: idleAssets,
        revenue,
      },
    });
  } catch (error) {
    return {
      error: safeErrorMessage(error),
    };
  }

  revalidatePath("/assets");
  redirect("/assets");
}
