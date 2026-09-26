import { useState } from "react";

// Shared state + handlers for AI Smart Filter "applied_filter" reference chips.
// The AiSmartFilterButton emits `onAppliedFilterChange` / `onAppliedFilterCleared`;
// this hook captures those and exposes the chip list plus a click handler so any
// table can render <AiSmartFilterChips /> in its grid's `topLeftOptions` slot.
// Each chip: { id, label, task, columnName, values, active }.
const useAiSmartFilterChips = () => {
  const [chips, setChips] = useState([]);

  // Only one filter chip is shown at a time: each newly applied filter
  // replaces the current chip(s) with the latest applied_filter reference.
  const onAppliedFilterChange = ({ appliedFilter, columnName, values }) => {
    const entries = Object.entries(appliedFilter || {});
    if (entries.length === 0) return;
    const newChips = entries.map(([label, task]) => ({
      id: `${label}__${columnName}`,
      label,
      task,
      columnName,
      values,
      active: true,
    }));
    setChips(newChips);
  };

  const onAppliedFilterCleared = () => {
    setChips([]);
  };

  // Re-apply the chip's resolved column/values via the table's own apply fn
  // (floating-filter vs setFilterModel differs per table), then mark it active.
  const handleChipClick = (chip, onReapply) => {
    onReapply?.(chip.columnName, chip.values);
    setChips((prev) => prev.map((c) => ({ ...c, active: c.id === chip.id })));
  };

  // Remove a single chip and clear its column filter (empty values → the
  // table's apply fn clears that column).
  const handleChipRemove = (chip, onClear) => {
    onClear?.(chip.columnName, []);
    setChips((prev) => prev.filter((c) => c.id !== chip.id));
  };

  return {
    chips,
    onAppliedFilterChange,
    onAppliedFilterCleared,
    handleChipClick,
    handleChipRemove,
  };
};

export default useAiSmartFilterChips;
