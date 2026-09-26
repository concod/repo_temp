import React from "react";
import Typography from "@mui/material/Typography";
import SkuCategorisationKpiCard from "./SkuCategorisationKpiCard";
import {
  SKU_CATEGORISATION_CARDS,
  SKU_CATEGORISATION_EMPTY_COUNT_MESSAGE,
  SKU_CATEGORISATION_STOCKOUT_RISK_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { useSkuCategorisationStyles } from "./skuCategorisationStyles";

const isZeroCount = (count) => {
  const value = Number(count);
  return !Number.isNaN(value) && value === 0;
};

export const SkuCategorisationHeader = ({
  selectedKpiTitle,
  stylesSelectedCount = 0,
}) => {
  const classes = useSkuCategorisationStyles();
  const stylesLabel =
    stylesSelectedCount === 1
      ? "1 Style Selected"
      : `${stylesSelectedCount} Styles Selected`;

  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      <Typography component="span" className={classes.headerTitle}>
        {selectedKpiTitle}
      </Typography>
      {stylesSelectedCount > 0 ? (
        <Typography component="span" className={classes.headerSubtitle}>
          {stylesLabel}
        </Typography>
      ) : null}
    </div>
  );
};

const SkuCategorisationKpiPanel = ({
  kpiData = {},
  cards = SKU_CATEGORISATION_CARDS,
  selectedKpiKey = "total_skus",
  onKpiSelect,
  onEmptyCountClick,
}) => {
  const classes = useSkuCategorisationStyles();

  return (
    <div className={classes.cardsRow}>
      {cards.map((card) => {
        const cardData = kpiData?.[card.key] || {};
        const subtitle = card.subtitle ?? cardData?.subtitle;
        const isComingSoon = Boolean(card.comingSoon);
        const isEmptyCount = !isComingSoon && isZeroCount(cardData?.count);

        return (
          <SkuCategorisationKpiCard
            key={card.key}
            title={card.title}
            type={card.type}
            data={cardData}
            subtitle={subtitle}
            info={card.info}
            comingSoon={isComingSoon}
            isEmptyCount={isEmptyCount}
            isSelected={
              selectedKpiKey === card.key && !isComingSoon && !isEmptyCount
            }
            onSelect={() => onKpiSelect?.(card.key)}
            onEmptyCountClick={onEmptyCountClick}
          />
        );
      })}
    </div>
  );
};

export default SkuCategorisationKpiPanel;
