// filterPlansModal.constants.js

export const QUESTIONS = [
  "Filter plans with products which has >10$ price.",
  "Show allocation plans featuring products where more than 15 stores are having stockout.",
  "Show allocation plans featuring products among the highest-earning 5% by revenue.",
  "List plans with more than 5 products",
];

export const COLUMN_MAP = {
  allocation_plan_name: "allocationPlan",
  allocation_id: "allocationId",
  created_by: "createdBy",
  created_at: "createdAt",
  product_count: "productCount",
};

export const TABLE_HEADERS = [
  "Allocation Plan Name",
  "Allocation ID",
  "Created By",
  "Created At",
  "Product Count",
];

export const LOADING_STEPS = [
  "Processing",
  "Working on it",
  "Almost there, hang tight",
  "Taking longer than usual, speeding things up",
];

export const UI_TEXT = {
  TITLE: "Hi",
  SUBTITLE: "I am Iris, how can I help you today?",
  HEADER_NAME: "Prioritise Allocation Plans",
  NO_DATA_MESSAGE: "No valid data found. Please try again with a different query.",
  ALAN_DISCLAIMER: "Iris can make mistakes.",
  LEARN_MORE: "learn more",
};
