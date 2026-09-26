export const EXCEPTION_SUMMARY_CARD_IDS = {
  ALL_RULES: "all_rules",
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  EXPIRING_SOON: "expiring_soon",
};

export const CARD_ID_TO_STATUS = {
  [EXCEPTION_SUMMARY_CARD_IDS.ALL_RULES]: "all",
  [EXCEPTION_SUMMARY_CARD_IDS.ACTIVE]: "active",
  [EXCEPTION_SUMMARY_CARD_IDS.SCHEDULED]: "scheduled",
  [EXCEPTION_SUMMARY_CARD_IDS.EXPIRING_SOON]: "expiring_soon",
};

const EXCEPTION_SUMMARY_CARD_CONFIG = [
  { id: EXCEPTION_SUMMARY_CARD_IDS.ALL_RULES, label: "All Rules", iconType: "all_rules" },
  { id: EXCEPTION_SUMMARY_CARD_IDS.ACTIVE, label: "Active", iconType: "active" },
  { id: EXCEPTION_SUMMARY_CARD_IDS.SCHEDULED, label: "Scheduled", iconType: "scheduled" },
  { id: EXCEPTION_SUMMARY_CARD_IDS.EXPIRING_SOON, label: "Expiring soon", iconType: "expiring_soon" },
];

/** Dummy summary metrics for exceptions — replace with API response when available. */
export const EXCEPTION_SUMMARY_DUMMY_DATA = EXCEPTION_SUMMARY_CARD_CONFIG.map(
  (card) => ({ ...card, count: 0 })
);

/**
 * Maps the API response object to the array format expected by KPICardComponent.
 * API response: { "All": 100, "Active": 75, "Scheduled": 25, "Expiring Soon": 0 }
 */
const API_KEY_TO_CARD_ID = {
  All: EXCEPTION_SUMMARY_CARD_IDS.ALL_RULES,
  Active: EXCEPTION_SUMMARY_CARD_IDS.ACTIVE,
  Scheduled: EXCEPTION_SUMMARY_CARD_IDS.SCHEDULED,
  "Expiring Soon": EXCEPTION_SUMMARY_CARD_IDS.EXPIRING_SOON,
};

export const mapExceptionSummaryResponse = (apiData) => {
  if (!apiData || typeof apiData !== "object") return EXCEPTION_SUMMARY_DUMMY_DATA;
  const countById = {};
  Object.entries(apiData).forEach(([key, value]) => {
    const cardId = API_KEY_TO_CARD_ID[key];
    if (cardId) countById[cardId] = value;
  });
  return EXCEPTION_SUMMARY_CARD_CONFIG.map((card) => ({
    ...card,
    count: countById[card.id] ?? 0,
  }));
};
