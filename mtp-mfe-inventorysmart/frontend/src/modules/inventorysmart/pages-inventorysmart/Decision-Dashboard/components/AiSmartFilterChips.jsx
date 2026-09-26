import React from "react";
import { Chips } from "impact-ui-v3";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

// Renders the AI Smart Filter "applied_filter" reference chips beside a table
// header (via the grid's `topLeftOptions` slot). Chip state is owned by the
// shared `useAiSmartFilterChips` hook; clicking a chip re-applies its filter.
const AiSmartFilterChips = ({ chips = [], onChipClick, onChipRemove }) => {
  const classes = useStyles();
  if (!chips.length) return null;
  return (
    <div className={classes.aiFilterChipsContainer}>
      {chips.map((chip) => (
        <Chips
          key={chip.id}
          label={chip.label}
          onClick={() => onChipClick?.(chip)}
          {...(onChipRemove
            ? { onDelete: () => onChipRemove(chip) }
            : {})}
          className={`${classes.aiFilterChip} ${
            chip.active ? classes.aiFilterChipActive : ""
          }`}
        />
      ))}
    </div>
  );
};

export default AiSmartFilterChips;
