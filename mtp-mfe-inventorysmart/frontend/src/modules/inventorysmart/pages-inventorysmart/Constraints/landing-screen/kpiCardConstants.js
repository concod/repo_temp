export const RULES_SUMMARY_CARD_IDS = {
  ALL_RULES: "all_rules",
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  EXPIRING_SOON: "expiring_soon",
};

export const DEFAULT_RULES_LIST_STATUS = "all";

export const SUMMARY_FETCH_LIMIT = 2000;

export const KPI_CARD_ID_TO_RULES_LIST_STATUS = {
  [RULES_SUMMARY_CARD_IDS.ALL_RULES]: "all",
  [RULES_SUMMARY_CARD_IDS.ACTIVE]: "active",
  [RULES_SUMMARY_CARD_IDS.SCHEDULED]: "scheduled",
  [RULES_SUMMARY_CARD_IDS.EXPIRING_SOON]: "expiring_soon",
};

export function mapKpiCardIdToRulesListStatus(cardId) {
  return KPI_CARD_ID_TO_RULES_LIST_STATUS[cardId] ?? DEFAULT_RULES_LIST_STATUS;
}

/** UI card layout; `responseKey` matches summary API `data` keys. */
export const RULES_SUMMARY_CARD_CONFIG = [
  {
    id: RULES_SUMMARY_CARD_IDS.ALL_RULES,
    label: "All Rules",
    iconType: "all_rules",
    responseKey: "All",
  },
  {
    id: RULES_SUMMARY_CARD_IDS.ACTIVE,
    label: "Active",
    iconType: "active",
    responseKey: "Active",
  },
  {
    id: RULES_SUMMARY_CARD_IDS.SCHEDULED,
    label: "Scheduled",
    iconType: "scheduled",
    responseKey: "Scheduled",
  },
  {
    id: RULES_SUMMARY_CARD_IDS.EXPIRING_SOON,
    label: "Expiring soon",
    iconType: "expiring_soon",
    responseKey: "Expiring Soon",
  },
];

export const DEFAULT_RULES_SUMMARY_CARDS = RULES_SUMMARY_CARD_CONFIG.map(
  ({ id, label, iconType }) => ({
    id,
    label,
    iconType,
    count: 0,
  })
);

export function mapRulesSummaryResponse(response) {
  const payload = response?.data?.data ?? response?.data ?? {};
  return RULES_SUMMARY_CARD_CONFIG.map(({ id, label, iconType, responseKey }) => ({
    id,
    label,
    iconType,
    count: Number(payload[responseKey]) || 0,
  }));
}
