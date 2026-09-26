/** KPI Details & In-App Glossary from MTP-155612. Passed into InfoPanel. */
export const FINALIZE_ALLOCATION_GLOSSARY = [
  {
    id: "product-details",
    title: "Product Details",
    items: [
      { term: "Style-Color ID", definition: "Unique identifier for a style-color" },
      {
        term: "Style-Color Description",
        definition: "Short descriptive name of the style-color",
      },
      {
        term: "Subclass / Class / Department",
        definition: "Merchandise hierarchy levels, from narrow to broad",
      },
      {
        term: "Product Status",
        definition: "Lifecycle stage, e.g. New Launch or Replenishment",
      },
      { term: "Launch Date", definition: "Scheduled ship/availability date" },
    ],
  },
  {
    id: "store-details",
    title: "Store Details",
    items: [
      { term: "Store Code", definition: "Unique identifier for a store" },
      { term: "Store Name", definition: "Short descriptive name of the store" },
      {
        term: "Store Format",
        definition: "Classification of a store based on its retail format or type.",
      },
      {
        term: "Store Tier",
        definition:
          "Classification of a store based on its assigned tier or performance level.",
      },
      { term: "Ship Date", definition: "Date inventory is expected to ship to a store" },
    ],
  },
  {
    id: "store-coverage",
    title: "Store/Style-Color Coverage",
    items: [
      {
        term: "# Eligible Stores",
        definition: "Stores that qualify to carry the Style-Color ID",
      },
      {
        term: "# Allocated Stores",
        definition: "Eligible stores that actually received allocation",
      },
      {
        term: "# Allocated Style-Colors",
        definition: "Count of distinct Style-Color IDs allocated to a store",
      },
    ],
  },
  {
    id: "performance",
    title: "Performance",
    items: [
      { term: "LW Sales Units", definition: "Units sold during the previous week" },
      {
        term: "LW Margin $",
        definition: "Gross margin generated during the previous week",
      },
    ],
  },
  {
    id: "demand-targets",
    title: "Demand & Targets",
    items: [
      { term: "Demand Type", definition: "Method used to calculate demand" },
      {
        term: "Forward ROS",
        definition:
          "Forward Rate of Sale — Forecasted units expected to sell per week during target WOS",
      },
      {
        term: "Aggregated Demand (For Target WOS)",
        definition: "Total units needed to sustain the target weeks-of-supply",
      },
      {
        term: "Aggregated Min / Aggregated Max",
        definition: "Minimum/Maximum allocation quantity threshold",
      },
      { term: "Average WOS", definition: "Average weeks of supply target" },
      {
        term: "Target Inventory",
        definition:
          "Aggregated demand for the target WOS, capped to the applicable Min and Max thresholds.",
      },
    ],
  },
  {
    id: "inventory-position-pre",
    title: "Inventory Position (Pre-allocation)",
    items: [
      {
        term: "Store OH / OO / IT",
        definition: "On-Hand / On-Order / In-Transit inventory at the store",
      },
      {
        term: "Store OH+OO+IT",
        definition:
          "Total inventory at the store, including On-Hand (OH), On-Order (OO), and In-Transit (IT) units.",
      },
      {
        term: "Intraday Allocations",
        definition:
          "Allocations committed since the last refresh that are not yet reflected in store's inventory.",
      },
      {
        term: "Lead Time Demand",
        definition:
          "Units expected to sell during the time between placing a replenishment order and it actually arriving in store",
      },
      {
        term: "Projected Store Inventory (Pre-allocation)",
        definition:
          "The store's expected inventory position on allocation arrival date, before the allocation is applied.\nStore OH + OO + IT + Intraday Allocations − Lead Time Demand.",
      },
      {
        term: "Pre-allocation In-stock %",
        definition:
          "The percentage of eligible SKU × Store combinations where the pre-allocation inventory position is > 0",
      },
    ],
  },
  {
    id: "allocation-need",
    title: "Need",
    items: [
      {
        term: "Need to Meet Mins",
        definition:
          "Quantity required to fulfil the minimum demand, after accounting for projected store inventory.",
      },
      {
        term: "Need to Meet Demand (Above Mins)",
        definition:
          "Quantity required to fulfil the remaining demand after the minimum demand has been met, and after accounting for projected store inventory.",
      },
      {
        term: "Total Need",
        definition:
          "Quantity required to fulfil total demand, after accounting for projected store inventory",
      }
    ],
  },
  {
    id: "allocation-recommendation",
    title: "Allocation Recommendation",
    items: [
      {
        term: "Allocated to Meet Mins",
        definition:
          "Quantity actually allocated to fulfil the minimum demand, based on units available in DC",
      },
      {
        term: "Allocated to Meet Demand (Above Mins)",
        definition:
          "Quantity actually allocated to fulfil the remaining demand after the minimum demand has been met, based on units available in DC",
      },
      {
        term: "Total Allocated Quantity",
        definition:
          "Quantity allocated to fulfil total demand, based on units available in DC",
      },
      {
        term: "Allocation Retail Value ($)",
        definition: "Retail value of Total Allocated Quantity",
      }
    ],
  },
  {
    id: "inventory-position-post",
    title: "Inventory Position (Post allocation)",
    items: [
      {
        term: "Projected Store Inventory (Post-allocation)",
        definition:
          "The store’s expected inventory position after the allocation is applied.",
      },
      {
        term: "Post-allocation In-stock %",
        definition:
          "The percentage of eligible SKU–Store combinations where the post-allocation inventory position is > 0",
      },
    ],
  },
  {
    id: "dc-pack-breakdown",
    title: "Eaches & Pack Breakdown",
    items: [
      {
        term: "Eaches (Units)",
        definition: "Units allocated as individual pieces outside any pack",
      },
      { term: "Pack Count", definition: "Number of packs allocated" },
      { term: "Pack (Units)", definition: "Pack Count × Units per Pack" },
      { term: "Total (Units)", definition: "Eaches (Units) + Pack (Units)" }
    ],
  },
  {
    id: "size-distribution",
    title: "Size Distribution",
    items: [
      {
        term: "Product Profile %",
        definition: "Expected size mix for the product, based on historical trends",
      },
      {
        term: "Post-Allocation Size Distribution %",
        definition:
          "Percentage share of projected store inventory after allocation by size",
      },
    ],
  },
  {
    id: "dc-inventory-overview",
    title: "DC Inventory",
    items: [
      {
        term: "Opening Inventory",
        definition: "Inventory available at the DC before allocation",
      },
      {
        term: "Allocated Quantity",
        definition: "Quantity from the DC committed to stores",
      },
      {
        term: "Available Quantity/ATA",
        definition:
          "Units still available to allocate at the DC after this allocation run\nOpening Inventory − Allocated Quantity",
      },
    ],
  }
];
