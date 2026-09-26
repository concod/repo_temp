import { create } from "zustand";
import { pspStoreHubService } from "../services/PspStoreHubService";

export type RangeType = "week" | "month" | "quarter";

interface DateRangeState {
  startDate: Date | null;
  endDate: Date | null;
  rangeType: RangeType;
  minDate: Date | null;
  maxDate: Date | null;
  loading: boolean;
  error: string | null;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setRangeType: (type: RangeType) => void;
  fetchDateRangeLimits: () => Promise<void>;
}

export const useDateRangeStore = create<DateRangeState>((set, get) => ({
  startDate: null,
  endDate: null,
  rangeType: "month",
  minDate: null,
  maxDate: null,
  loading: false,
  error: null,

  setStartDate: (date: Date) => {
    const { rangeType, maxDate } = get();
    let calculatedEndDate: Date;

    switch (rangeType) {
      case "week": {
        calculatedEndDate = new Date(date);
        calculatedEndDate.setDate(calculatedEndDate.getDate() + 6);
        break;
      }
      case "month": {
        calculatedEndDate = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate() - 1
        );
        break;
      }
      case "quarter": {
        calculatedEndDate = new Date(
          date.getFullYear(),
          date.getMonth() + 3,
          date.getDate() - 1
        );
        break;
      }
      default: {
        calculatedEndDate = new Date(date);
        calculatedEndDate.setDate(calculatedEndDate.getDate() + 6);
      }
    }

    const newEndDate =
      maxDate && calculatedEndDate > maxDate ? maxDate : calculatedEndDate;
    set({ startDate: date, endDate: newEndDate });
  },

  setEndDate: (date: Date) => {
    const { rangeType, minDate } = get();
    let calculatedStartDate: Date;

    switch (rangeType) {
      case "week": {
        calculatedStartDate = new Date(date);
        calculatedStartDate.setDate(calculatedStartDate.getDate() - 6);
        break;
      }
      case "month": {
        calculatedStartDate = new Date(
          date.getFullYear(),
          date.getMonth() - 1,
          date.getDate() + 1
        );
        break;
      }
      case "quarter": {
        calculatedStartDate = new Date(
          date.getFullYear(),
          date.getMonth() - 3,
          date.getDate() + 1
        );
        break;
      }
      default: {
        calculatedStartDate = new Date(date);
        calculatedStartDate.setDate(calculatedStartDate.getDate() - 6);
      }
    }

    const newStartDate =
      minDate && calculatedStartDate < minDate ? minDate : calculatedStartDate;
    set({ startDate: newStartDate, endDate: date });
  },

  setRangeType: (type: RangeType) => {
    const { maxDate, minDate } = get();
    if (!maxDate) return;

    const newEndDate = maxDate;
    let calculatedStartDate: Date;

    switch (type) {
      case "week": {
        calculatedStartDate = new Date(maxDate);
        calculatedStartDate.setDate(calculatedStartDate.getDate() - 6);
        break;
      }
      case "month": {
        calculatedStartDate = new Date(maxDate);
        calculatedStartDate.setMonth(calculatedStartDate.getMonth() - 1);
        break;
      }
      case "quarter": {
        calculatedStartDate = new Date(maxDate);
        calculatedStartDate.setMonth(calculatedStartDate.getMonth() - 3);
        break;
      }
      default: {
        calculatedStartDate = new Date(maxDate);
        calculatedStartDate.setDate(calculatedStartDate.getDate() - 6);
      }
    }

    const newStartDate =
      minDate && calculatedStartDate < minDate ? minDate : calculatedStartDate;
    set({ rangeType: type, startDate: newStartDate, endDate: newEndDate });
  },

  fetchDateRangeLimits: async () => {
    set({ loading: true, error: null });
    try {
      const response = await pspStoreHubService.getDateRange();
      const minDate = new Date(response.start_date);
      const maxDate = new Date(response.end_date);
      const initialStartDate = new Date(
        maxDate.getFullYear(),
        maxDate.getMonth(),
        1
      );
      const initialEndDate = maxDate;
      set({
        minDate,
        maxDate,
        startDate: initialStartDate,
        endDate: initialEndDate,
        loading: false,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch date range limits";
      set({ error: errorMessage, loading: false });
    }
  },
}));
