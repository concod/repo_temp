import React from "react";
import { Tag } from "impact-ui-v3";
import {
  FULFILLMENT_TYPE_TAG_MAP,
  FULFILLMENT_TYPE_TAG_SX,
} from "../constants";

const getFulfillmentTypeValue = (cellProps) => {
  const data = cellProps?.data || {};
  return (
    data.fulfillment_type ??
    data.fulfilment_type ??
    cellProps?.value ??
    ""
  );
};

const getFulfillmentTypeTagConfig = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  const directMatch = FULFILLMENT_TYPE_TAG_MAP[normalized];
  if (directMatch) {
    return directMatch;
  }

  const lowerMatch = FULFILLMENT_TYPE_TAG_MAP[normalized.toLowerCase()];
  if (lowerMatch) {
    return lowerMatch;
  }

  return { label: normalized.replace(/_/g, " ") };
};

const FulfillmentTypeBadgeCell = ({ cellProps }) => {
  const value = getFulfillmentTypeValue(cellProps);
  const tagConfig = getFulfillmentTypeTagConfig(value);

  if (!tagConfig?.label) {
    return <span>-</span>;
  }

  return (
    <Tag
      label={tagConfig.label}
      size="small"
      variant="solid"
      sx={FULFILLMENT_TYPE_TAG_SX}
    />
  );
};

export default FulfillmentTypeBadgeCell;
