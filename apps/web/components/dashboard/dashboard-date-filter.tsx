"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Fev" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Abr" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Ago" },
  { value: "09", label: "Set" },
  { value: "10", label: "Out" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dez" },
];

function buildYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let y = currentYear + 2; y >= currentYear - 5; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

const YEAR_OPTIONS = buildYearOptions();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateFilterValue {
  fromMonth: string; // "01"–"12"
  fromYear: string;  // "2024"
  toMonth: string;
  toYear: string;
}

interface DashboardDateFilterProps {
  value: DateFilterValue | null;
  onChange: (value: DateFilterValue) => void;
  onReset: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function splitYYYYMM(yyyymm: string): { month: string; year: string } {
  const [year, month] = yyyymm.split("-");
  return { month, year };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardDateFilter({
  value,
  onChange,
  onReset,
}: DashboardDateFilterProps) {
  const now = new Date();
  const defaultYear = String(now.getFullYear());
  const defaultMonth = String(now.getMonth() + 1).padStart(2, "0");

  const fromMonth = value?.fromMonth ?? defaultMonth;
  const fromYear = value?.fromYear ?? defaultYear;
  const toMonth = value?.toMonth ?? defaultMonth;
  const toYear = value?.toYear ?? defaultYear;

  function handleFromMonth(m: string) {
    onChange({ fromMonth: m, fromYear, toMonth, toYear });
  }
  function handleFromYear(y: string) {
    onChange({ fromMonth, fromYear: y, toMonth, toYear });
  }
  function handleToMonth(m: string) {
    onChange({ fromMonth, fromYear, toMonth: m, toYear });
  }
  function handleToYear(y: string) {
    onChange({ fromMonth, fromYear, toMonth, toYear: y });
  }

  const isActive = value !== null;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* De */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">De</Label>
        <div className="flex items-center gap-1">
          <Select value={fromMonth} onValueChange={handleFromMonth}>
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fromYear} onValueChange={handleFromYear}>
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y.value} value={y.value} className="text-xs">
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <span className="text-muted-foreground text-xs pb-1.5">até</span>

      {/* Até */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Até</Label>
        <div className="flex items-center gap-1">
          <Select value={toMonth} onValueChange={handleToMonth}>
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toYear} onValueChange={handleToYear}>
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y.value} value={y.value} className="text-xs">
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Limpar */}
      {isActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground pb-0"
          onClick={onReset}
        >
          Limpar
        </Button>
      )}
    </div>
  );
}

// ─── Utility: convert DateFilterValue → YYYY-MM strings ──────────────────────

export function filterValueToParams(
  value: DateFilterValue | null,
): { from?: string; to?: string } {
  if (!value) return {};
  return {
    from: `${value.fromYear}-${value.fromMonth}`,
    to: `${value.toYear}-${value.toMonth}`,
  };
}
