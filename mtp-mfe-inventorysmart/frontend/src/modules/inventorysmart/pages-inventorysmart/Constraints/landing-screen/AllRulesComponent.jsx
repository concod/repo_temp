import { useCallback, useEffect, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import AllRulesTable from "./AllRulesTable";
import CreateRuleGroup from "../Rule-Group-Constraints/CreateRuleGroup";
import { KPICardComponent } from "./KPICardComponent";
import { useKpiCardStyles } from "./kpiCardStyles";
import {
  RULES_SUMMARY_CARD_IDS,
  mapKpiCardIdToRulesListStatus,
} from "./kpiCardConstants";
import { useRulesSummary } from "./useRulesSummary";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import globalStyles from "core/Styles/globalStyles";

export const AllRulesComponent = ({
  rulesTableLoader,
  onFilterReqBody,
  isTabActive,
  history,
  module,
  screenName,
  callRulesSaveOnBlur,
  setConstraintRulesPayload,
  constraintRulesPayload,
  downloadStoreConstraints,
  onApply,
  rulesConstraintColumnsFromParent,
  showNewConstraintFlow,
  onCreateNewRule,
  onAddExceptions,
  onRuleGroupCreated,
  isUploadPending,
  addSnack,
  isNewConstraintsFlow,
  selectedRules
}) => {
  const globalClasses = globalStyles();
  const kpiClasses = useKpiCardStyles();
  const [selectedKpiCardId, setSelectedKpiCardId] = useState(
    RULES_SUMMARY_CARD_IDS.ALL_RULES
  );
  const [showCreateRuleGroup, setShowCreateRuleGroup] = useState(false);
  // Surfaces the success banner above the rules table right after a rule group
  // is created. AllRulesTable owns the auto-dismiss animation.
  const [showRuleGroupBanner, setShowRuleGroupBanner] = useState(false);

  const handleOpenCreateRuleGroup = () => {
    setShowCreateRuleGroup(true);
  };

  const handleCloseCreateRuleGroup = () => {
    setShowCreateRuleGroup(false);
  };

  const handleSummaryError = useCallback(
    (err) => {
      handleErrorMessage(err, { addSnack });
    },
    [addSnack]
  );

  const { summaryCards, summaryLoading, refreshSummary } = useRulesSummary({
    filterReqBody: onFilterReqBody,
    isTabActive,
    onError: handleSummaryError,
  });

  useEffect(() => {
    setSelectedKpiCardId(RULES_SUMMARY_CARD_IDS.ALL_RULES);
  }, [onFilterReqBody]);

  if (showCreateRuleGroup) {
    return (
      <CreateRuleGroup
        key="create-rule-group"
        onCancel={handleCloseCreateRuleGroup}
        onSave={() => {
          handleCloseCreateRuleGroup();
          onRuleGroupCreated && onRuleGroupCreated();
          setShowRuleGroupBanner(true);
        }}
        selectedRules={selectedRules}
        addSnack={addSnack}
      />
    );
  }

  return (
    <div className={globalClasses.marginTop_8}>
      <Loader loader={summaryLoading}>
        <KPICardComponent
          summaryData={summaryCards}
          selectedCardId={selectedKpiCardId}
          onCardSelect={setSelectedKpiCardId}
        />
      </Loader>
      <div className={kpiClasses.detailsSection}>
        <Loader loader={rulesTableLoader}>
          <AllRulesTable
            selectedDependencyValue={onFilterReqBody}
            rulesListStatus={mapKpiCardIdToRulesListStatus(selectedKpiCardId)}
            history={history}
            module={module}
            screenName={screenName}
            callRulesSaveOnBlur={callRulesSaveOnBlur}
            setConstraintRulesPayload={setConstraintRulesPayload}
            constraintRulesPayload={constraintRulesPayload}
            downloadStoreConstraints={downloadStoreConstraints}
            isNewConstraintsFlow={isNewConstraintsFlow}
            onApply={onApply}
            rulesConstraintColumnsFromParent={rulesConstraintColumnsFromParent}
            showNewConstraintFlow={showNewConstraintFlow}
            onCreateNewRule={onCreateNewRule}
            onAddExceptions={onAddExceptions}
            onCreateRuleGroup={handleOpenCreateRuleGroup}
            showRuleGroupBanner={showRuleGroupBanner}
            onCloseRuleGroupBanner={() => setShowRuleGroupBanner(false)}
            isUploadPending={isUploadPending}
            onRefreshRulesSummary={refreshSummary}
          />
        </Loader>
      </div>
    </div>
  );
};
