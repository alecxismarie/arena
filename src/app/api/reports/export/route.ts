import { assertOwner } from "@/lib/access-control";
import { getReportsData } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

type ExportReportType =
  | "event_summary"
  | "attendance"
  | "revenue"
  | "weekly_sales"
  | "monthly_sales";

function isExportReportType(value: string): value is ExportReportType {
  return (
    value === "event_summary" ||
    value === "attendance" ||
    value === "revenue" ||
    value === "weekly_sales" ||
    value === "monthly_sales"
  );
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function buildCsv(headers: string[], rows: Array<Array<unknown>>) {
  const output: string[] = [headers.map(csvEscape).join(",")];
  rows.forEach((row) => {
    output.push(row.map(csvEscape).join(","));
  });
  return output.join("\n");
}

function toPercent(value: number) {
  return Number((value * 100).toFixed(2));
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getAuthContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertOwner(context);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestedType =
    request.nextUrl.searchParams.get("report")?.trim().toLowerCase() ?? "";
  const reportType: ExportReportType = isExportReportType(requestedType)
    ? requestedType
    : "event_summary";

  const data = await getReportsData();

  let headers: string[] = [];
  let rows: Array<Array<unknown>> = [];

  switch (reportType) {
    case "attendance":
      headers = ["Event Name", "Actual Attendance"];
      rows = data.attendanceReport.map((row) => [row.name, row.attendance]);
      break;
    case "revenue":
      headers = ["Event Name", "Revenue"];
      rows = data.revenueReport.map((row) => [row.name, row.revenue]);
      break;
    case "weekly_sales":
      headers = ["Week", "Tickets Sold", "Revenue"];
      rows = data.weeklySales.map((row) => [row.label, row.tickets, row.revenue]);
      break;
    case "monthly_sales":
      headers = ["Month", "Tickets Sold", "Revenue"];
      rows = data.monthlySales.map((row) => [row.label, row.tickets, row.revenue]);
      break;
    case "event_summary":
    default:
      headers = [
        "Event Name",
        "Date",
        "Status",
        "Expected Attendance",
        "Actual Attendance",
        "Tickets Sold",
        "Attendance Variance",
        "Attendance Rate (%)",
        "Revenue",
      ];
      rows = data.eventSummaryRows.map((row) => [
        row.name,
        format(row.date, "yyyy-MM-dd"),
        row.status,
        row.expected_attendees,
        row.actual_attendees,
        row.tickets_sold,
        row.attendance_variance,
        toPercent(row.attendance_rate),
        row.revenue,
      ]);
      break;
  }

  const csv = buildCsv(headers, rows);
  const today = format(new Date(), "yyyyMMdd");
  const fileName = `signals_${reportType}_${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store",
    },
  });
}
