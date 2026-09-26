export function getRandomColor() {
  let letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
export const generateIcon = () => {
  let icons = [
    "query_stats",
    "price_change",
    "insights",
    "account_balance_wallet",
    "donut_small",
    "credit_card",
    "account_balance",
    "receipt_long",
    "calculate",
    "redeem",
    "domain",
    "track_changes",
    "data_exploration",
    "stacked_bar_chart",
    "area_chart",
    "room_preferences",
    "domain_disabled",
    "shop_two",
    "grouped_bar_chart",
  ];

  const random = Math.floor(Math.random() * icons.length);
  return icons[random];
};
