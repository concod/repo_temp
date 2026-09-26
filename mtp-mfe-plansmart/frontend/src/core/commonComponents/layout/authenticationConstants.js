const WORKFLOW_INPUT_CENTER_URLS = [
  "/product-mapping",
  "/product-grouping",
  "/product-unit-definition",
  "/product-status",
  "/store-status",
  "/store-grouping",
  "/store-mapping",
  "/store-grading",
  "/dc-status",
  "/dc-mapping",
  "/vendor-status",
  "/vendor-product",
];

export const APPLICATION_URLS = [
  {
    application_name: "ADA",
    application_url: "/ada",
  },
  {
    application_name: "AssortSmart",
    application_url: "/assort-smart",
  },
  {
    application_name: "ClusterSmart",
    application_url: "/cluster-smart",
  },
  {
    application_name: "InventorySmart",
    application_url: ["/inventory-smart", ...WORKFLOW_INPUT_CENTER_URLS],
  },
  {
    application_name: "MarkSmart",
    application_url: "/mark-smart",
  },
  {
    application_name: "PlanSmart",
    application_url: "/plan-smart",
  },
  {
    application_name: "MondaySmart",
    application_url: "/monday-smart",
  },
  // Configurations
  {
    application_name: "Module Configurator",
    application_url: "/configurator",
  },
  {
    application_name: "Tenant Management",
    application_url: "/tenantconfig/applicationconfig",
  },
  {
    application_name: "Application Access Management",
    application_url: "/user-management",
  },
  {
    application_name: "ADAConfigurator",
    application_url: "/adaconfigurator",
  },
  {
    application_name: "Workflow Input Center",
    application_url: [
      "/product-mapping",
      "/product-grouping",
      "/product-unit-definition",
      "/product-status",
      "/store-status",
      "/store-grouping",
      "/store-mapping",
      "/store-grading",
      "/dc-status",
      "/dc-mapping",
      "/vendor-status",
      "/vendor-product",
    ],
  },
  {
    application_name: "PriceSmart Markdown",
    application_url: "/pricesmart-markdown",
  },
  {
    application_name: "PriceSmart Promo",
    application_url: "/pricesmart-promo",
  },
];

export const WHITE_LISTED_URLS = [
  "/home",
  "/keyboard-shortcuts",
  "/ticketing-system",
  "/release-notes",
  "/pivot-test"
];