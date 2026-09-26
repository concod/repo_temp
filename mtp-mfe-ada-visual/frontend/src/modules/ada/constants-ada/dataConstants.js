export let driverForecastRowData = [
  {
    row: "promo_type",
    is_cal: "",
    drivers: "ada.common.promoType",
    overall_value: {
      label: "ada.common.percentOff",
      value: "promo_percentage",
    },
  },
  {
    row: "value",
    is_cal: false,
    drivers: "ada.common.discountValue",
    promo_type: "fiscal_week",
    overall_value: null,
  },
  {
    row: "promo_percentage",
    is_cal: true,
    drivers: "ada.common.effectiveDiscountPercentage",
    db_column: "promo_percentage",
    empty_obj: "product_count",
    promo_type: "fiscal_week",
    product_count: {},
    overall_value: null,
  },
];

export function getForecastMultiplierRowData(
  mfp,
  isScenarioTab,
  customAdjustedIALabel,
  customMFPLabel,
  showDistinctStoreCount,
  showMFPForForecastTable
) {
  const baseRows = [
    {
      row: "forecast",
      forecast_multiplier: `${
        isScenarioTab ? "Scenario 1" : "Adjusted"
      } IA Forecast`,
    },
    {
      row: "multiplier",
      forecast_multiplier: "Multiplier",
    },
    {
      row: "adjusted_forecast",
      forecast_multiplier: isScenarioTab
        ? `Scenario 1 ${customAdjustedIALabel || "User Forecast"}`
        : customAdjustedIALabel || "Adjusted User Forecast",
    },
  ];
  if (showMFPForForecastTable) {
    return [
      ...baseRows,
      {
        row: "client_forecast",
        forecast_multiplier: customMFPLabel ? customMFPLabel : "MFP",
      },
      ...(showDistinctStoreCount
        ? [
            {
              row: "distinct_store_count",
              forecast_multiplier: "Eligible Store Count",
            },
          ]
        : []),
    ];
  }

  if (mfp) {
    return [
      ...baseRows,
      {
        row: "client_forecast",
        forecast_multiplier: customMFPLabel ? customMFPLabel : "MFP",
      },
      {
        row: "final_forecast",
        forecast_multiplier: "Final Forecast",
      },
      ...(showDistinctStoreCount
        ? [
            {
              row: "distinct_store_count",
              forecast_multiplier: "Eligible Store Count",
            },
          ]
        : []),
    ];
  }

  return baseRows;
}
