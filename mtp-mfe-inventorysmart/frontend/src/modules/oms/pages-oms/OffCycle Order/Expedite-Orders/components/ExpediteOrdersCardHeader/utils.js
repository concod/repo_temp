const PROGRESS_BAR_BG =
  "linear-gradient(90deg, rgba(246, 204, 204, 0.70) 0%, rgba(255, 177, 177, 0.80) 100%)";
const LOST_SALES_DOT_COLOR = "rgba(255, 177, 177, 0.80)";

export const formatCurrency = (value, showSign = true) => {
  if (!value && value !== 0) return "$0";
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "+";
  if (absValue >= 1000000) {
    return `${showSign ? sign : ""}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${showSign ? sign : ""}$${(absValue / 1000).toFixed(0)}K`;
  }
  return `${showSign ? sign : ""}$${absValue.toFixed(0)}`;
};

export const calculateProgressSegments = (cardData) => {
  const total = cardData?.total || 0;
  const value = cardData?.value || 0;
  const acceptedValue = cardData?.faster_shipment_value || 0;

  // If both value and faster_shipment_value are 0, show 100% red
  if (value === 0 && acceptedValue === 0 && total > 0) {
    return [
      {
        percentage: 0,
        color: "#31935F",
        dotColor: "#31935F",
        tooltip: `Recovered: ${formatCurrency(0)}`,
      },
      {
        percentage: 0,
        color: "#E5E5EA",
        dotColor: "#E5E5EA",
        tooltip: `Total Recoverable: ${formatCurrency(0)}`,
      },
      {
        percentage: 100,
        color: PROGRESS_BAR_BG,
        dotColor: LOST_SALES_DOT_COLOR,
        tooltip: `Lost Sales: ${formatCurrency(total)}`,
      },
    ];
  }

  if (total === 0) {
    return [
      {
        percentage: 0,
        color: "#31935F",
        dotColor: "#31935F",
        tooltip: `Recovered: ${formatCurrency(0)}`,
      },
      {
        percentage: 0,
        color: "#E5E5EA",
        dotColor: "#E5E5EA",
        tooltip: `Total Recoverable: ${formatCurrency(0)}`,
      },
      {
        percentage: 100,
        color: PROGRESS_BAR_BG,
        dotColor: LOST_SALES_DOT_COLOR,
        tooltip: `Lost Sales: ${formatCurrency(0)}`,
      },
    ];
  }

  // Calculate percentages based on total
  const valuePercentage = (value / total) * 100;
  const acceptedPercentage = (acceptedValue / total) * 100;

  // Grey segment is the difference between faster_shipment_value and value
  const greyValue = Math.max(0, acceptedValue - value);
  const greyPercentage = (greyValue / total) * 100;

  // Lost sales is what remains after faster_shipment_value
  const lostSalesValue = Math.max(0, total - acceptedValue);
  const lostSalesPercentage = (lostSalesValue / total) * 100;

  return [
    {
      percentage: Math.max(0, valuePercentage),
      color: "#31935F",
      dotColor: "#31935F",
      tooltip: `Recovered: ${formatCurrency(value)}`,
    },
    {
      percentage: Math.max(0, greyPercentage),
      color: "#E5E5EA",
      dotColor: "#E5E5EA",
      tooltip: `Total Recoverable: ${formatCurrency(acceptedValue)}`,
    },
    {
      percentage: Math.max(0, lostSalesPercentage),
      color: PROGRESS_BAR_BG,
      dotColor: LOST_SALES_DOT_COLOR,
      tooltip: `Lost Sales: ${formatCurrency(total)}`,
    },
  ];
};
