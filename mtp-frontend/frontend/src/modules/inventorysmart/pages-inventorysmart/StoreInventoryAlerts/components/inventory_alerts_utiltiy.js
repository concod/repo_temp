import { cloneDeep } from "lodash";
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
  screenName
) => {
  const selectedArticleIds = fetchProductCodes(selectedArticles);

  const storeCodes = [];
  selectedArticles.forEach((article) => {
    article?.store_data?.forEach((store) => storeCodes.push(store.store_code));
  });
  const adaPayload = {
    isRedirectedFromInventory: true,
    payload: {
      product_code: selectedArticleIds,
      store_code: storeCodes,
    },
    selectedDependency: cloneDeep(selectedFilters),
    selectedHistoricValue: 1,
    timeline: {
      startDate: moment().format("YYYY/MM/DD"),
      endDate: moment().add(8, "weeks").format("YYYY/MM/DD"), //setting the default timeline as 8 weeks from the current date (temporary implementation)
    },
  };

  localStorage.setItem("adaPayload", JSON.stringify(adaPayload));
  window.open(`${screenName}?type=alerts`, "_blank", "noopener,noreferrer");
};

export const redirectToFinalizeScreen = (
  selectedArticles,
  screenName,
  planCode,
  alertsPopupTableDataCount
) => {
  let l_selectedArticles = "";
  // if (alertsPopupTableDataCount !== selectedArticles?.length) {
  selectedArticles?.forEach(
    (row) => (l_selectedArticles += `&article=${fetchProductCode(row)}`)
  );
  // }
  window.open(
    `${screenName}?step=1&allocation_code=${planCode}${l_selectedArticles}`,
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
  poName
) => {
  const selectedArticleIds = fetchProductCodes(selectedArticles);
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

  if (storeCodes?.length && setStoreCodes) {
    localStorage.setItem("storeCodes", JSON.stringify(storeCodes));
  }

  if (setPoCode) {
    localStorage.setItem(
      "po_code",
      JSON.stringify(selectedArticles[0]?.po_code || null)
    );
    localStorage.setItem(
      "po_name",
      JSON.stringify(poName || null)
    );
  }

  if (popupLink) {
    let l_alertType = popupLink?.split("/")?.pop();
    localStorage.setItem("popupLink", JSON.stringify(l_alertType || null));
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
