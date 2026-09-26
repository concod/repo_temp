import { useCallback, useEffect, useMemo, useState } from "react";
import { cloneDeep } from "lodash";
import { getRulesSummaryData } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import {
  DEFAULT_RULES_SUMMARY_CARDS,
  mapRulesSummaryResponse,
  SUMMARY_FETCH_LIMIT,
} from "./kpiCardConstants";

const rulesSummaryRequestByKey = new Map();

const getRulesSummaryRequestKey = (filterReqBody) => {
  if (!filterReqBody?.filters?.length) {
    return null;
  }
  return JSON.stringify(filterReqBody);
};

const buildRulesSummaryRequestBody = (filterReqBody) => ({
  ...filterReqBody,
  meta: {
    ...(filterReqBody?.meta || {}),
    limit: {
      limit: SUMMARY_FETCH_LIMIT,
      page: 1,
    },
  },
});

const fetchRulesSummary = (filterReqBody) => {
  const requestKey = getRulesSummaryRequestKey(filterReqBody);
  if (!requestKey) {
    return Promise.resolve(null);
  }

  if (rulesSummaryRequestByKey.has(requestKey)) {
    return rulesSummaryRequestByKey.get(requestKey);
  }

  const requestPromise = getRulesSummaryData(
    buildRulesSummaryRequestBody(cloneDeep(filterReqBody))
  ).finally(
    () => {
      rulesSummaryRequestByKey.delete(requestKey);
    }
  );

  rulesSummaryRequestByKey.set(requestKey, requestPromise);
  return requestPromise;
};

export const useRulesSummary = ({ filterReqBody, isTabActive, onError }) => {
  const [summaryCards, setSummaryCards] = useState(DEFAULT_RULES_SUMMARY_CARDS);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshSummary = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const summaryRequestKey = useMemo(
    () => getRulesSummaryRequestKey(filterReqBody),
    [filterReqBody]
  );

  useEffect(() => {
    if (!isTabActive) {
      return;
    }

    let cancelled = false;

    const loadRulesSummary = async () => {
      if (!summaryRequestKey) {
        setSummaryCards(DEFAULT_RULES_SUMMARY_CARDS);
        return;
      }

      setSummaryLoading(true);
      try {
        const response = await fetchRulesSummary(filterReqBody);
        if (cancelled || !response) {
          return;
        }
        setSummaryCards(mapRulesSummaryResponse(response));
      } catch (err) {
        if (!cancelled) {
          onError?.(err);
          setSummaryCards(DEFAULT_RULES_SUMMARY_CARDS);
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    loadRulesSummary();

    return () => {
      cancelled = true;
      setSummaryLoading(false);
    };
  }, [summaryRequestKey, isTabActive, onError, refreshToken, filterReqBody]);

  return { summaryCards, summaryLoading, refreshSummary };
};
