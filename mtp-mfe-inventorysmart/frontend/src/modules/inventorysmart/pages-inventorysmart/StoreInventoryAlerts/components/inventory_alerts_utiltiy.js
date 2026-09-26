import { cloneDeep, isNil } from "lodash";
import moment from "moment";
import {
  fetchProductCode,
  fetchProductCodes,
  fetchStoreCodes,
} from "../../inventorysmart-utility";

const getcommonArticles = (p_articlesFromFilter, p_articlesFromTable) => {
  let l_arrayA = p_articlesFromFilter.split(",");
  let l_arrayB = p_articlesFromTable.split(",");
  let l_commonArray = l_arrayA.filter((element) => l_arrayB.includes(element));

  return l_commonArray.join(",");
};

export const updateCheckConfiguration = (
  p_checkConfiguration,
  p_articlesFilteredFromFilterSection
) => {
  let l_template = {
    article: {
      filterType: "text",
      type: "contains",
      filter: p_articlesFilteredFromFilterSection,
    },
  };
  let updatedArray = p_checkConfiguration.map((obj) => {
    if (obj.checkAll && p_articlesFilteredFromFilterSection) {
      return obj?.searchColumns?.article
        ? {
            ...obj,
            searchColumns: {
              ...(obj.searchColumns || {}),
              ...{
                article: {
                  filterType: "text",
                  type: "contains",
                  filter: getcommonArticles(
                    p_articlesFilteredFromFilterSection,
                    obj.searchColumns.article.filter
                  ),
                },
              },
            },
          }
        : {
            ...obj,
            searchColumns: {
              ...(obj.searchColumns || {}),
              ...l_template,
            },
          };
    }
    return obj;
  });
  return updatedArray;
};

// candidate keys used to resolve a human readable style-color description from an alert row
const STYLE_COLOR_DESCRIPTION_KEYS = [
  "style_color_description",
  "article_description",
  "product_description",
  "article_name",
  "description",
];

/**
 * @description Resolves a display description for a style-color alert row by
 * checking a set of commonly used description keys.
 * @param {Object} row - The alert row.
 * @returns {string} The resolved description or an empty string.
 */
export const getStyleColorDescription = (row) => {
  if (!row) return "";
  const key = STYLE_COLOR_DESCRIPTION_KEYS.find(
    (descKey) => row[descKey] !== undefined && row[descKey] !== null
  );
  return key ? row[key] : "";
};

/**
 * @description Analyses the current forecast-alert selection for potential
 * missing channels. Validation only applies when more than one distinct
 * channel is selected. For every selected article, a channel that is part of
 * the distinct selected set but not selected for that article is a "candidate"
 * missing channel. Candidates that already appear in the loaded rows are
 * confirmed immediately (no API needed); the rest are returned as `uncertain`
 * so the caller can confirm their existence via the backend.
 * @param {Array} selectedArticles - Rows currently selected by the user.
 * @param {Array} allRows - All loaded alert rows (used as a local availability cache).
 * @param {string} [styleColorKey="article"] - Field on a row identifying the article.
 * @returns {{
 *   needsValidation: boolean,
 *   distinctSelectedChannels: string[],
 *   confirmedMissingRows: Array,
 *   uncertainArticles: string[],
 *   uncertainChannels: string[],
 *   uncertainByArticle: Object,
 *   articleMeta: Object,
 * }}
 */
export const analyzeForecastChannelSelection = (
  selectedArticles = [],
  allRows = [],
  styleColorKey = "article"
) => {
  const empty = {
    needsValidation: false,
    distinctSelectedChannels: [],
    confirmedMissingRows: [],
    uncertainArticles: [],
    uncertainChannels: [],
    uncertainByArticle: {},
    articleMeta: {},
  };

  const distinctSelectedChannels = [
    ...new Set(selectedArticles.map((row) => row?.channel).filter(Boolean)),
  ];
  if (distinctSelectedChannels.length < 2) {
    return empty;
  }

  // Channels already present in the loaded rows per article (local cache).
  const availableChannelsByArticle = {};
  allRows.forEach((row) => {
    const id = row?.[styleColorKey];
    if (isNil(id) || !row?.channel) return;
    if (!availableChannelsByArticle[id]) {
      availableChannelsByArticle[id] = new Set();
    }
    availableChannelsByArticle[id].add(row.channel);
  });

  // Selected channels per article + representative row for description.
  const selectionByArticle = {};
  selectedArticles.forEach((row) => {
    const id = row?.[styleColorKey];
    if (isNil(id)) return;
    if (!selectionByArticle[id]) {
      selectionByArticle[id] = { channels: new Set(), row };
    }
    if (row?.channel) selectionByArticle[id].channels.add(row.channel);
  });

  const confirmedMissingRows = [];
  const uncertainByArticle = {};
  const uncertainChannelSet = new Set();
  const articleMeta = {};

  Object.keys(selectionByArticle).forEach((id) => {
    const { channels: selectedChannels, row } = selectionByArticle[id];
    const availableChannels = availableChannelsByArticle[id] || new Set();
    const selectedChannelLabel = [...selectedChannels].join(", ");
    articleMeta[id] = {
      description: getStyleColorDescription(row),
      selectedChannelLabel,
    };

    distinctSelectedChannels.forEach((channel) => {
      if (selectedChannels.has(channel)) return;
      if (availableChannels.has(channel)) {
        // Already known from loaded rows -> confirmed missing, no API needed.
        confirmedMissingRows.push({
          style_color_id: id,
          description: articleMeta[id].description,
          selected_channel: selectedChannelLabel,
          missing_channel: channel,
        });
      } else {
        // Not in loaded rows -> must confirm existence via the backend.
        if (!uncertainByArticle[id]) uncertainByArticle[id] = new Set();
        uncertainByArticle[id].add(channel);
        uncertainChannelSet.add(channel);
      }
    });
  });

  return {
    needsValidation: true,
    distinctSelectedChannels,
    confirmedMissingRows,
    uncertainArticles: Object.keys(uncertainByArticle),
    uncertainChannels: [...uncertainChannelSet],
    uncertainByArticle,
    articleMeta,
  };
};

/**
 * @description Builds missing-channel rows from the backend channel-map
 * response for the uncertain candidates. The response maps each article to the
 * channels that exist for it in the backend; a candidate channel that appears
 * there is a confirmed missing channel.
 * @param {Object} channelMap - Response `data`: { [article]: string[] }.
 * @param {Object} uncertainByArticle - article -> Set(candidate channels).
 * @param {Object} articleMeta - article -> { description, selectedChannelLabel }.
 * @returns {Array} Missing-channel rows.
 */
export const buildMissingRowsFromChannelMap = (
  channelMap = {},
  uncertainByArticle = {},
  articleMeta = {}
) => {
  const rows = [];
  Object.keys(uncertainByArticle).forEach((id) => {
    const availableChannels = new Set(
      Array.isArray(channelMap?.[id]) ? channelMap[id] : []
    );
    uncertainByArticle[id].forEach((channel) => {
      if (availableChannels.has(channel)) {
        rows.push({
          style_color_id: id,
          description: articleMeta?.[id]?.description || "",
          selected_channel: articleMeta?.[id]?.selectedChannelLabel || "",
          missing_channel: channel,
        });
      }
    });
  });
  return rows;
};

/**
 * @description Assigns a stable, unique row index used as the AG Grid row id.
 * @param {Array} rows - Missing-channel rows.
 * @returns {Array} Rows with an `index` field.
 */
export const indexMissingRows = (rows = []) =>
  rows.map((row, index) => ({ ...row, index }));

export const checkIfAllocationInEaches = (alertsData, selectedArticles) => {
  let allocationInEaches = false;

  /**
   * Checking if all the articles from a pack are selected or not
   */
  const articlesByPackName = {};
  const selectedArticlesByPackName = {};

  alertsData.forEach((article) => {
    if (!articlesByPackName[article.pack_id]) {
      articlesByPackName[article.pack_id] = [article];
    } else {
      articlesByPackName[article.pack_id].push(article);
    }
  });

  selectedArticles.forEach((article) => {
    if (!selectedArticlesByPackName[article.pack_id]) {
      selectedArticlesByPackName[article.pack_id] = [article];
    } else {
      selectedArticlesByPackName[article.pack_id].push(article);
    }
  });

  const selectedArticlePacks = Object.keys(selectedArticlesByPackName);
  for (let i = 0; i < selectedArticlePacks.length; i++) {
    const packName = selectedArticlePacks[i];
    if (
      selectedArticlesByPackName[packName].length !==
      articlesByPackName[packName].length
    ) {
      allocationInEaches = true;
      break;
    }
  }

  return allocationInEaches;
};

// this function is used to update the parent table with the sum of the updated model stock values of all rows
export const updateModelStockSum = (alertsData, reviewPrefix, index) => {
  let aggModelStock = 0;
  alertsData.forEach((row) => {
    aggModelStock += parseInt(row?.[`${reviewPrefix}_model_stock`]);
  });
  return {
    sum: aggModelStock,
    index,
    skuId: fetchProductCode(alertsData[0]),
  };
};

export const redirectToADA = async (
  selectedArticles,
  selectedFilters,
  screenName,
  uniqueKeyName,
  alertsUniqueIdNavigationKey,
  isRedirectFromCNA = false
) => {
  const selectedArticleIds = fetchProductCodes(
    selectedArticles,
    alertsUniqueIdNavigationKey
  );

  const storeCodes = [];
  selectedArticles.forEach((article) => {
    article?.store_data?.forEach((store) => storeCodes.push(store.store_code));
  });
  const dependencyData = cloneDeep(selectedFilters || []);
  if (selectedArticles?.some((article) => article?.channel)) {
    const selectedChannels = [
      ...new Set(
        selectedArticles
          .flatMap((article) => article.channel || [])
          .filter(Boolean)
      ),
    ];

    const existingChannelFilter = dependencyData.find(
      (filter) => filter.filter_id === "channel"
    );
    if (existingChannelFilter) {
      existingChannelFilter.values = [...selectedChannels];
    } else {
      let channelPayload = {
        attribute_name: "channel",
        filter_id: "channel",
        filter_type: "cascaded",
        values: selectedChannels,
        dimension: "store",
        display_type: "dropdown",
        display_order: null,
        operator: "in",
        startYear: null,
      };
      dependencyData.push(channelPayload);
    }
  }

  if (storeCodes?.length) {
    const existingStoreFilter = dependencyData.find(
      (filter) => filter.filter_id === "store_code"
    );

    if (existingStoreFilter) {
      existingStoreFilter.values = [...storeCodes];
    } else {
      let storePayload = {
        attribute_name: "store_code",
        filter_id: "store_code",
        filter_type: "cascaded",
        values: storeCodes,
        dimension: "store",
        display_type: "dropdown",
        display_order: null,
        operator: "in",
        startYear: null,
      };
      dependencyData.push(storePayload);
    }
  }

  const existingUniqueKeyFilter = dependencyData.find(
    (filter) => filter.filter_id === uniqueKeyName
  );

  if (existingUniqueKeyFilter) {
    existingUniqueKeyFilter.values = [...selectedArticleIds];
  } else {
    let uniqueFilterPayload = {
      attribute_name: uniqueKeyName,
      filter_id: uniqueKeyName,
      filter_name: uniqueKeyName,
      filter_type: "cascaded",
      values: selectedArticleIds,
      dimension: "product",
      display_type: "dropdown",
      display_order: null,
      operator: "in",
      startYear: null,
    };
    dependencyData.push(uniqueFilterPayload);
  }
  const adaPayload = {
    isRedirectedFromInventory: true,
    selectedDependency: cloneDeep(dependencyData),
    selectedHistoricValue: 1,
    timeline: {
      startDate: moment().format("YYYY/MM/DD"),
      endDate: moment().add(8, "weeks").format("YYYY/MM/DD"), //setting the default timeline as 8 weeks from the current date (temporary implementation)
    },
    uniqueKeyName: uniqueKeyName,
  };
  localStorage.setItem("adaPayloadFromInventory", JSON.stringify(adaPayload));
  let updatedScreenName = screenName + `&type=adaPayloadFromInventory`;

  window.open(`${updatedScreenName}`, "_blank", "noopener,noreferrer");
};

const FINALIZE_SELECTED_ARTICLES_KEY_PREFIX = "finalize_selected_articles_";

export const redirectToFinalizeScreen = (
  selectedArticles,
  screenName,
  planCode,
  alertsPopupTableDataCount
) => {
  const articleIds = selectedArticles?.length
    ? fetchProductCodes(selectedArticles, "article")
    : [];
  const storageKey = `${FINALIZE_SELECTED_ARTICLES_KEY_PREFIX}${planCode}`;
  if (articleIds?.length > 0) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(articleIds));
    } catch (e) {
      console.log(e, "error");
    }
  }
  window.open(
    `${screenName}?step=2&allocation_code=${planCode}`,
    "_blank",
    "noopener,noreferrer"
  );
};

export const redirectToScreen = (
  selectedArticles,
  selectedStoreCodes,
  selectedFilters,
  screenName,
  screenParams,
  allocationInEaches = false,
  setStoreCodes = false,
  setPoCode = false,
  filteredSelection,
  popupLink,
  alloc_type,
  articleKey,
  isStoreTransfer = false
) => {
  const selectedArticleIds = fetchProductCodes(selectedArticles, articleKey);
  const storeCodes = selectedStoreCodes?.length
    ? selectedStoreCodes
    : fetchStoreCodes(selectedArticles);
  const delay = allocationInEaches ? 1000 : 0;

  localStorage.setItem(
    "selectedFiltersDependency",
    JSON.stringify(selectedFilters || [])
  );
  localStorage.setItem(
    "selectedArticles",
    JSON.stringify(selectedArticleIds || [])
  );

  if (isStoreTransfer) {
    localStorage.setItem(
      "storeTransferSelectedArticles",
      JSON.stringify(selectedArticleIds || [])
    );
  }

  if (storeCodes?.length && setStoreCodes) {
    localStorage.setItem("storeCodes", JSON.stringify(storeCodes));
  }

  if (setPoCode) {
    localStorage.setItem(
      "po_code",
      JSON.stringify(selectedArticles[0]?.po_code || null)
    );
  }

  if (popupLink) {
    let l_alertType = popupLink?.split("/")?.pop();
    localStorage.setItem("popupLink", JSON.stringify(l_alertType || null));
  }
  if (alloc_type === "ns") {
    localStorage.setItem("newstore_alert", JSON.stringify(alloc_type || null));
  }
  if (alloc_type === "asn") {
    localStorage.setItem(
      "asn_id",
      JSON.stringify(selectedArticles[0]?.asn_id || null)
    );
  }
  if (alloc_type) {
    localStorage.setItem("alloc_type", JSON.stringify(alloc_type || null));
  }
  if (filteredSelection) {
    localStorage.setItem(
      "filtered_selection",
      JSON.stringify(filteredSelection || null)
    );
  }

  /**
   * Wait for 1 second if any toast message is to be displayed to the user and then redirect
   */
  setTimeout(() => {
    window.open(
      `${screenName}?${screenParams}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, delay);
};
