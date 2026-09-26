import React, { useEffect, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import { EmptyState } from "impact-ui-v3";
import { KPICardComponent } from "./KPICardComponent";
import { useKpiCardStyles } from "./kpiCardStyles";
import {
  RULES_SUMMARY_CARD_IDS,
  DEFAULT_RULES_SUMMARY_CARDS,
  mapKpiCardIdToRulesListStatus,
  mapRulesSummaryResponse,
} from "./kpiCardConstants";
import { RULE_GROUPS_EMPTY_STATE } from "./landingScreenConstants";
import { getRuleGroupsSummary } from "../../../services-inventorysmart/Rule-Group-Constraints/rule-group-services";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import RuleGroupsTable from "../Rule-Group-Constraints/RuleGroupsTable";
import globalStyles from "core/Styles/globalStyles";

export const RuleGroupsComponent = ({
  onFilterReqBody,
  isTabActive,
  history,
  module,
  screenName,
  addSnack,
}) => {
  const globalClasses = globalStyles();
  const kpiClasses = useKpiCardStyles();
  const [selectedKpiCardId, setSelectedKpiCardId] = useState(
    RULES_SUMMARY_CARD_IDS.ALL_RULES
  );

  const [summaryCards, setSummaryCards] = useState(DEFAULT_RULES_SUMMARY_CARDS);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);

  const fetchSummary = async () => {
    if (!onFilterReqBody?.filters?.length) {
      setSummaryCards(DEFAULT_RULES_SUMMARY_CARDS);
      setSummaryReady(false);
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    setSummaryReady(false);
    try {
      const response = await getRuleGroupsSummary(onFilterReqBody);
      if (response) {
        setSummaryCards(mapRulesSummaryResponse(response));
        setSummaryReady(true);
      } else {
        setSummaryCards(DEFAULT_RULES_SUMMARY_CARDS);
        setSummaryReady(false);
      }
    } catch (err) {
      handleErrorMessage(err, { addSnack });
      setSummaryCards(DEFAULT_RULES_SUMMARY_CARDS);
      setSummaryReady(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (isTabActive) {
      fetchSummary();
    }
  }, [isTabActive, onFilterReqBody]);

  useEffect(() => {
    setSelectedKpiCardId(RULES_SUMMARY_CARD_IDS.ALL_RULES);
  }, [onFilterReqBody]);

  const allRulesCount =
    summaryCards.find((card) => card.id === RULES_SUMMARY_CARD_IDS.ALL_RULES)
      ?.count ?? 0;
  const showEmptyState = summaryReady && allRulesCount === 0;
  const showContent = summaryReady && allRulesCount > 0;

  return (
    <div className={showEmptyState ? undefined : globalClasses.marginTop_8}>
      <Loader
        loader={summaryLoading}
        minHeight={summaryLoading ? "calc(100vh - 15rem)" : "400px"}
      >
        {showEmptyState && (
          <div
            className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
          >
            <div className={kpiClasses.emptyStateContainer}>
              <EmptyState
                description={
                  <div className={kpiClasses.emptyStateDescriptionBlock}>
                    <p className={kpiClasses.emptyStateHeading}>
                      {RULE_GROUPS_EMPTY_STATE.heading}
                    </p>
                    <p className={kpiClasses.emptyStateDescriptionLine}>
                      Go to{" "}
                      <span className={kpiClasses.emptyStateDescriptionEmphasis}>
                        All rules &gt; Select Rule(s) &gt; &ldquo;Create New Group&rdquo;
                      </span>
                    </p>
                    <p className={kpiClasses.emptyStateDescriptionLine}>
                      to create your first group.
                    </p>
                  </div>
                }
              />
            </div>
          </div>
        )}
        {showContent && (
          <>
            <KPICardComponent
              summaryData={summaryCards}
              selectedCardId={selectedKpiCardId}
              onCardSelect={setSelectedKpiCardId}
            />
            <div className={kpiClasses.detailsSection}>
              <RuleGroupsTable
                selectedDependencyValue={onFilterReqBody}
                rulesListStatus={mapKpiCardIdToRulesListStatus(
                  selectedKpiCardId
                )}
                history={history}
                module={module}
                screenName={screenName}
                addSnack={addSnack}
                refreshSummary={fetchSummary}
              />
            </div>
          </>
        )}
      </Loader>
    </div>
  );
};
