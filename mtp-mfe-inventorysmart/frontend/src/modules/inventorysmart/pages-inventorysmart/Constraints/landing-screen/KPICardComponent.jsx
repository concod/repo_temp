import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import IS_allRuleBook from "assets/IS_icons/IS_allRuleBook.svg";
import IS_active from "assets/IS_icons/IS_active.svg";
import IS_calendar3D from "assets/IS_icons/IS_calendar3D.svg";
import IS_sandClock from "assets/IS_icons/IS_sandClock.svg";
import { useKpiCardStyles } from "./kpiCardStyles";
import {
  RULES_SUMMARY_CARD_IDS,
  DEFAULT_RULES_SUMMARY_CARDS,
} from "./kpiCardConstants";

const SUMMARY_CARD_ICONS = {
  all_rules: <IS_allRuleBook />,
  active: <IS_active />,
  scheduled: <IS_calendar3D />,
  expiring_soon: <IS_sandClock />,
};

export const KPICardComponent = ({
  summaryData = DEFAULT_RULES_SUMMARY_CARDS,
  selectedCardId: controlledSelectedId,
  onCardSelect,
  title = "Summary",
}) => {
  const classes = useKpiCardStyles();
  const [internalSelectedId, setInternalSelectedId] = useState(
    RULES_SUMMARY_CARD_IDS.ALL_RULES
  );

  useEffect(() => {
    if (controlledSelectedId !== undefined && controlledSelectedId !== internalSelectedId) {
      setInternalSelectedId(controlledSelectedId);
    }
  }, [controlledSelectedId]);

  const selectedCardId = internalSelectedId;

  const handleCardClick = (cardId) => {
    setInternalSelectedId(cardId);
    onCardSelect?.(cardId);
  };

  return (
    <div className={classes.summaryContainer}>
      <p className={classes.summaryTitle}>{title}</p>
      <div className={classes.cardsRow}>
        {summaryData.map((card) => {
          const isSelected = selectedCardId === card.id;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              className={`${classes.cardOuter} ${
                isSelected ? classes.cardOuterSelected : classes.cardOuterDefault
              }`}
              onClick={() => handleCardClick(card.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCardClick(card.id);
                }
              }}
            >
              <div
                className={`${classes.cardInner} ${
                  isSelected
                    ? classes.cardInnerSelected
                    : classes.cardInnerDefault
                }`}
              >
                <div className={classes.cardLabelGroup}>
                  <span className={classes.cardIcon}>
                    {SUMMARY_CARD_ICONS[card.iconType]}
                  </span>
                  <span className={classes.cardLabel}>{card.label}</span>
                </div>
                <span className={classes.cardCount}>
                  {card.count?.toLocaleString?.() ?? card.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

KPICardComponent.propTypes = {
  summaryData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number,
      iconType: PropTypes.string,
    })
  ),
  selectedCardId: PropTypes.string,
  onCardSelect: PropTypes.func,
  title: PropTypes.string,
};
