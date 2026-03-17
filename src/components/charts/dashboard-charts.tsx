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

const palette = ["#2563eb", "#06b6d4", "#14b8a6", "#0ea5e9", "#60a5fa", "#22d3ee"];

function valueFormatter(value: number, mode: "number" | "currency") {
  return mode === "currency" ? formatCurrency(value) : formatNumber(value);
}

function numericValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export function RevenueTrendChart({
  weekly,
  monthly,
}: {
  weekly: Array<{ label: string; revenue: number }>;
  monthly: Array<{ label: string; revenue: number }>;
}) {
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const data = mode === "weekly" ? weekly : monthly;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "weekly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("weekly")}
            type="button"
          >
            Weekly
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${mode === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
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
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b81f" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => valueFormatter(numericValue(value), "currency")}
              contentStyle={{
                borderRadius: "0.75rem",
                borderColor: "#cbd5e1",
                boxShadow: "0 10px 28px -20px rgba(15,23,42,0.8)",
              }}
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
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b81f" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => valueFormatter(numericValue(value), "number")}
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#cbd5e1",
              boxShadow: "0 10px 28px -20px rgba(15,23,42,0.8)",
            }}
          />
          <Bar dataKey="attendance" radius={[8, 8, 0, 0]} fill="#2563eb" maxBarSize={42} />
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
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b81f" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => valueFormatter(numericValue(value), "number")}
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#cbd5e1",
              boxShadow: "0 10px 28px -20px rgba(15,23,42,0.8)",
            }}
          />
          <Area type="monotone" dataKey="tickets" stroke="#06b6d4" fill="url(#sales-area)" />
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
        fill: palette[index % palette.length],
      })),
    [data],
  );

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            formatter={(value) => valueFormatter(numericValue(value), "number")}
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#cbd5e1",
              boxShadow: "0 10px 28px -20px rgba(15,23,42,0.8)",
            }}
          />
          <Legend />
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
}: {
  data: Array<{ label: string; tickets: number; revenue: number }>;
}) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b81f" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) =>
              name === "revenue"
                ? valueFormatter(numericValue(value), "currency")
                : valueFormatter(numericValue(value), "number")
            }
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#cbd5e1",
              boxShadow: "0 10px 28px -20px rgba(15,23,42,0.8)",
            }}
          />
          <Line type="monotone" dataKey="tickets" stroke="#2563eb" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2.5} dot={false} />
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
}: {
  data: Array<{ name: string; [key: string]: string | number }>;
  valueKey: string;
  color: string;
  formatMode?: "number" | "currency";
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b81f" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => valueFormatter(numericValue(value), formatMode)}
            contentStyle={{
              borderRadius: "0.75rem",
              borderColor: "#cbd5e1",
              boxShadow: "0 10px 28px -20px rgba(15,23,42,0.8)",
            }}
          />
          <Bar dataKey={valueKey} radius={[8, 8, 0, 0]} fill={color} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
