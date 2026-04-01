"use client";

import { formatCurrency, formatNumber } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const brandPalette = [
  "#e89a17",
  "#d88914",
  "#c67712",
  "#ad6b2a",
  "#8e6b4e",
  "#6f594a",
];
const chartGridStroke = "rgba(127, 102, 83, 0.16)";
const chartTooltipStyle = {
  borderRadius: "0.75rem",
  borderColor: "#cdb9a8",
  boxShadow: "0 10px 28px -20px rgba(84,45,14,0.45)",
};

function TicketDistributionLegend({
  payload,
}: {
  payload?: Array<{ color?: string; value?: string }>;
}) {
  if (!payload?.length) return null;

  return (
    <ul className="mt-3 flex list-none flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 text-sm text-muted-foreground">
      {payload.map((entry) => (
        <li
          key={`${entry.value}-${entry.color}`}
          className="inline-flex items-center gap-1.5"
        >
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: entry.color ?? "var(--color-muted-foreground)" }}
          />
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

function valueFormatter(
  value: number,
  mode: "number" | "currency",
  currency?: string,
) {
  return mode === "currency" ? formatCurrency(value, currency) : formatNumber(value);
}

function numericValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function RevenueTrendChart({
  weekly,
  monthly,
  currency,
}: {
  weekly: Array<{ label: string; revenue: number }>;
  monthly: Array<{ label: string; revenue: number }>;
  currency?: string;
}) {
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const data = mode === "weekly" ? weekly : monthly;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "weekly" ? "btn-primary shadow-sm" : "btn-secondary"}`}
            onClick={() => setMode("weekly")}
            type="button"
          >
            Weekly
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "monthly" ? "btn-primary shadow-sm" : "btn-secondary"}`}
            onClick={() => setMode("monthly")}
            type="button"
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="revenue-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e89a17" />
                <stop offset="100%" stopColor="#b26f1c" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(value) => formatCurrency(Math.round(Number(value)), currency)}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) =>
                valueFormatter(numericValue(value), "currency", currency)
              }
              contentStyle={chartTooltipStyle}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="url(#revenue-stroke)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AttendanceByEventChart({
  data,
}: {
  data: Array<{ id: string; name: string; attendance: number }>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => valueFormatter(numericValue(value), "number")}
            contentStyle={chartTooltipStyle}
          />
          <Bar dataKey="attendance" radius={[8, 8, 0, 0]} fill="#cf8312" maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesTrendChart({ data }: { data: Array<{ label: string; tickets: number }> }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e89a17" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#e89a17" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => valueFormatter(numericValue(value), "number")}
            contentStyle={chartTooltipStyle}
          />
          <Area type="monotone" dataKey="tickets" stroke="#cf8312" fill="url(#sales-area)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TicketDistributionChart({
  data,
}: {
  data: Array<{ id: string; name: string; tickets: number }>;
}) {
  const pieData = useMemo(
    () =>
      data.map((item, index) => ({
        ...item,
        fill: brandPalette[index % brandPalette.length],
      })),
    [data],
  );

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            formatter={(value) => valueFormatter(numericValue(value), "number")}
            contentStyle={chartTooltipStyle}
          />
          <Legend
            align="center"
            verticalAlign="bottom"
            height={84}
            content={<TicketDistributionLegend />}
          />
          <Pie
            data={pieData}
            dataKey="tickets"
            nameKey="name"
            innerRadius={65}
            outerRadius={100}
            stroke="none"
            paddingAngle={2}
          >
            {pieData.map((entry) => (
              <Cell key={entry.id} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EventSalesMiniChart({
  data,
  currency,
}: {
  data: Array<{ label: string; tickets: number; revenue: number }>;
  currency?: string;
}) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) =>
              name === "revenue"
                ? valueFormatter(numericValue(value), "currency", currency)
                : valueFormatter(numericValue(value), "number")
            }
            contentStyle={chartTooltipStyle}
          />
          <Line type="monotone" dataKey="tickets" stroke="#cf8312" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="revenue" stroke="#7f6653" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportBarChart({
  data,
  valueKey,
  color,
  formatMode = "number",
  currency,
}: {
  data: Array<{ name: string; [key: string]: string | number }>;
  valueKey: string;
  color: string;
  formatMode?: "number" | "currency";
  currency?: string;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) =>
              valueFormatter(numericValue(value), formatMode, currency)
            }
            contentStyle={chartTooltipStyle}
          />
          <Bar dataKey={valueKey} radius={[8, 8, 0, 0]} fill={color} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
