export const STYLE_OPTIONS = [
  { label: "Same minimum for all style-color IDS", value: "same_min" },
  { label: "Equally distribute", value: "equal_distribute" },
  { label: "Demand profile", value: "demand_profile" },
  { label: "Atleast X per style-color ID", value: "x_units_per_article" },
];

export const SIZE_OPTIONS = [
  { label: "Same minimum for all sizes", value: "same_min" },
  { label: "Equally distribute", value: "equal_distribute" },
  { label: "Product profile", value: "product_profile" },
  { label: "Atleast X per size", value: "x_units_per_size" },
];

export const STYLE_HELP_TEXT = {
  same_min: "Applies the same minimum quantity to all Style-Color IDs.",
  equal_distribute:
    "Distributes the total minimum quantity equally across all Style-Color IDs. If the total cannot be divided evenly, the remaining units are allocated to Style-Color IDs with higher demand profiles.",
  demand_profile:
    "Calculates total demand for each Style-Color ID by aggregating IA forecast across eligible stores for the target WOS. Minimum quantity is distributed proportionally. New rules inherit target WOS from IA default.",
  x_units_per_article:
    "Ensures that each Style-Color ID receives the specified minimum quantity. Any remaining units are distributed based on the Demand Profile.",
};

export const SIZE_HELP_TEXT = {
  same_min: "Applies the same minimum quantity across all active sizes.",
  equal_distribute:
    "Distributes the total minimum quantity equally across all active sizes. If the total cannot be divided evenly, the remaining units are allocated to sizes with higher product profile contributions for the corresponding store.",
  product_profile:
    "Distributes the minimum quantity based on the product profile. For each Style-Color ID, the allocation across sizes is determined by each size’s contribution within the corresponding store.",
  x_units_per_size:
    "Ensures that selected sizes receive the specified minimum quantity. Any remaining units are distributed based on the Product Profile.",
};
