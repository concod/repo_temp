import React from "react";
import TimeclockIcon from "assets/IS_icons/TM1.svg";
import ApprovedIcon from "assets/IS_icons/Approved3D.svg";
import { useFulfilmentTypeCardStyles } from "./useFulfilmentTypeCardStyles";

export const FULFILMENT_TYPE_ICON_MAP = {
  NEED_BASED: TimeclockIcon,
  FIXED_PUSH: ApprovedIcon,
};

const FulfilmentTypeCard = ({
  option,
  isSelected,
  onSelect,
  isDisabled = false,
  disabledMode = "readOnly",
}) => {
  const classes = useFulfilmentTypeCardStyles();
  const Icon = FULFILMENT_TYPE_ICON_MAP[option.value];
  const isBlockedDisabled = isDisabled && disabledMode === "blocked";

  return (
    <button
      type="button"
      className={`${classes.fulfilmentCard} ${
        isSelected ? classes.fulfilmentCardSelected : ""
      } ${
        isDisabled
          ? disabledMode === "blocked"
            ? classes.fulfilmentCardBlocked
            : classes.fulfilmentCardReadOnly
          : ""
      }`}
      onClick={() => {
        if (!isDisabled) {
          onSelect(option.value);
        }
      }}
      disabled={isBlockedDisabled}
    >
      {isSelected && (
        <span className={classes.fulfilmentCardGlow} aria-hidden="true" />
      )}
      {Icon && (
        <span className={classes.fulfilmentIconWrap}>
          <Icon className={classes.fulfilmentIcon} />
        </span>
      )}
      <div className={classes.fulfilmentCardContent}>
        <span className={classes.fulfilmentCardTitle}>{option.label}</span>
        <span className={classes.fulfilmentCardDescription}>
          {option.description}
        </span>
      </div>
    </button>
  );
};

export const FulfilmentTypeCardsRow = ({
  options = [],
  selectedValue,
  onSelect,
  isDisabled = false,
  disabledMode = "readOnly",
}) => {
  const classes = useFulfilmentTypeCardStyles();

  return (
    <div className={classes.fulfilmentCardsRow}>
      {options.map((option) => (
        <FulfilmentTypeCard
          key={option.value}
          option={option}
          isSelected={selectedValue === option.value}
          onSelect={onSelect}
          isDisabled={isDisabled}
          disabledMode={disabledMode}
        />
      ))}
    </div>
  );
};

export default FulfilmentTypeCardsRow;
