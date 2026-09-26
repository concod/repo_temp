import { useEffect, useRef } from "react";
import { Button, Input, Select } from "impact-ui-v3";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import {
  LOGISTICS_DISTANCE_ADD_RANGE_LABEL,
  LOGISTICS_DISTANCE_TO_EDIT_BLOCKED_MESSAGE,
  LOGISTICS_DISTANCE_TO_LESS_THAN_FROM_MESSAGE,
  LOGISTICS_METHOD_SELECT_LABEL,
} from "../logisticsConfigConstants";
import { useLogisticsConfigurationStyles } from "../logisticsConfigurationStyles";
import { findRankOption, getLogisticsIntegerInputValue } from "../logisticsConfigUtils";
import {
  canAddDistanceRange,
  canEditDistanceToValue,
  createDistanceRange,
  getNextDistanceFromValue,
  isDistanceFieldFilled,
  isDistanceToLessThanFrom,
  removeDistanceRangeAtIndex,
  updateDistanceRangeAtIndex,
} from "../logisticsDistanceUtils";

export const LogisticsDistanceTab = ({
  helperText,
  valueInputLabel,
  distanceRanges,
  defaultRuleValue,
  onDistanceRangesChange,
  onDefaultRuleValueChange,
  displaySnackMessages,
  isLeadTimeSection = false,
  isPrioritySection = false,
  usesNumericValueInput = false,
  rankOptions = [],
  openRankSelectKey = null,
  onOpenRankSelectKeyChange,
  onLeadTimeValueBlur,
}) => {
  const classes = useLogisticsConfigurationStyles();
  const lastValidToByRangeIdRef = useRef({});
  const canAddRange = canAddDistanceRange(distanceRanges);

  useEffect(() => {
    distanceRanges.forEach((range) => {
      if (
        isDistanceFieldFilled(range.to) &&
        !isDistanceToLessThanFrom(range.from, range.to)
      ) {
        lastValidToByRangeIdRef.current[range.id] = range.to;
      }
    });
  }, [distanceRanges]);

  const handleAddRange = () => {
    if (!canAddRange) {
      return;
    }

    onDistanceRangesChange([
      ...distanceRanges,
      createDistanceRange(getNextDistanceFromValue(distanceRanges)),
    ]);
  };

  const handleRangeFieldChange = (index, field, event) => {
    const nextValue = getLogisticsIntegerInputValue(
      event?.target?.value ?? "",
      { min: 0 }
    );
    const range = distanceRanges[index];

    if (field === "to") {
      if (!canEditDistanceToValue(distanceRanges, index)) {
        displaySnackMessages(
          LOGISTICS_DISTANCE_TO_EDIT_BLOCKED_MESSAGE,
          "error"
        );
        return;
      }
    }

    onDistanceRangesChange(
      updateDistanceRangeAtIndex(distanceRanges, index, field, nextValue)
    );

    if (
      field === "to" &&
      isDistanceFieldFilled(nextValue) &&
      !isDistanceToLessThanFrom(range.from, nextValue)
    ) {
      lastValidToByRangeIdRef.current[range.id] = nextValue;
    }
  };

  const handleToBlur = (index, event) => {
    const nextValue = getLogisticsIntegerInputValue(
      event?.target?.value ?? "",
      { min: 0 }
    );
    const range = distanceRanges[index];

    if (
      isDistanceFieldFilled(nextValue) &&
      isDistanceToLessThanFrom(range.from, nextValue)
    ) {
      displaySnackMessages(
        LOGISTICS_DISTANCE_TO_LESS_THAN_FROM_MESSAGE,
        "error"
      );
      const previousValue = lastValidToByRangeIdRef.current[range.id] ?? "";
      onDistanceRangesChange(
        updateDistanceRangeAtIndex(distanceRanges, index, "to", previousValue)
      );
    }
  };

  const handleDeleteRange = (index) => {
    onDistanceRangesChange(removeDistanceRangeAtIndex(distanceRanges, index));
  };

  const handleLeadTimeRuleValueBlur = (rawValue, onUpdate) => {
    if (!isLeadTimeSection || !onLeadTimeValueBlur) {
      return;
    }
    onLeadTimeValueBlur(rawValue, onUpdate);
  };

  const renderRankSelect = (selectKey, value, onValueChange) => (
    <div className={classes.panelRuleRowSelect}>
      <Select
        placeholder="Select Option"
        isClearable={true}
        isMulti={false}
        isOpen={openRankSelectKey === selectKey}
        setIsOpen={(isOpen) =>
          onOpenRankSelectKeyChange?.(isOpen ? selectKey : null)
        }
        currentOptions={rankOptions}
        initialOptions={rankOptions}
        selectedOptions={findRankOption(rankOptions, value)}
        setSelectedOptions={()=>{}}
        setCurrentOptions={() => {}}
        handleChange={(option) => {
          onValueChange(option?.value != null ? String(option.value) : "");
          onOpenRankSelectKeyChange?.(null);
        }}
        onClearAll={() => {
          onValueChange("");
          onOpenRankSelectKeyChange?.(null);
        }}
        minWidth="100px"
        width="100px"
        withPortal={true}
      />
    </div>
  );

  const renderRuleValueControl = (selectKey, value, onValueChange) => {
    if (isPrioritySection) {
      return renderRankSelect(selectKey, value, onValueChange);
    }

    return (
      <div className={classes.panelDistanceCompactInput}>
        <Input
          type="number"
          value={value}
          inputProps={{ min: 0, step: 1 }}
          onChange={(event) =>
            onValueChange(
              getLogisticsIntegerInputValue(event?.target?.value ?? "", {
                min: 0,
              })
            )
          }
          onBlur={
            isLeadTimeSection
              ? (event) =>
                  handleLeadTimeRuleValueBlur(
                    event?.target?.value ?? "",
                    onValueChange
                  )
              : (event) =>
                  onValueChange(
                    getLogisticsIntegerInputValue(event?.target?.value ?? "", {
                      min: 0,
                    })
                  )
          }
        />
      </div>
    );
  };

  const renderMilesInput = (index, field, value, isReadOnly = false) => (
    <div className={classes.panelDistanceCompactInput}>
      <Input
        placeholder={field === "from" ? "From" : "To"}
        type="number"
        value={value}
        inputProps={{ min: 0, step: 1 }}
        disabled={isReadOnly}
        onChange={(event) => handleRangeFieldChange(index, field, event)}
        onBlur={
          field === "to" ? (event) => handleToBlur(index, event) : undefined
        }
      />
    </div>
  );

  const renderDistanceRangeRow = (range, index) => (
    <div key={range.id} className={classes.panelRuleRow}>
      <div className={classes.panelDistanceRowLeft}>
        {/* <DragIndicatorIcon className={classes.ruleRowDrag} /> */}
        <div className={classes.panelDistanceInputs}>
          <p className={classes.panelRuleRowInputLabel}>
            {LOGISTICS_METHOD_SELECT_LABEL.distance}
          </p>
          {renderMilesInput(index, "from", range.from, true)}
          {renderMilesInput(index, "to", range.to)}
        </div>
      </div>
      <div className={classes.panelDistanceRowRight}>
        <div className={classes.panelRuleRowInputGroup}>
          <p className={classes.panelRuleRowInputLabel}>{valueInputLabel}</p>
          {renderRuleValueControl(
            range.id,
            range.value,
            (nextValue) =>
              onDistanceRangesChange(
                updateDistanceRangeAtIndex(
                  distanceRanges,
                  index,
                  "value",
                  nextValue
                )
              )
          )}
        </div>
        <DeleteActionButton
          onClick={() => handleDeleteRange(index)}
          size="large"
        />
      </div>
    </div>
  );

  const renderDefaultRow = () => (
    <div className={classes.panelRuleRow}>
      <div className={classes.panelRuleRowLeft}>
        {/* <DragIndicatorIcon className={classes.ruleRowDrag} /> */}
        <p className={classes.panelRuleRowLabel}>Default</p>
      </div>
      <div className={classes.panelRuleRowInputGroup}>
        <p className={classes.panelRuleRowInputLabel}>{valueInputLabel}</p>
        {renderRuleValueControl(
          "default",
          defaultRuleValue,
          onDefaultRuleValueChange
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={classes.panelDistanceHeader}>
        {helperText && (
          <p className={classes.panelDistanceHelperText}>{helperText}</p>
        )}
        <Button
          variant="secondary"
          onClick={handleAddRange}
          disabled={!canAddRange}
        >
          {LOGISTICS_DISTANCE_ADD_RANGE_LABEL}
        </Button>
      </div>

      <div className={classes.panelRulesList}>
        {distanceRanges.map((range, index) => renderDistanceRangeRow(range, index))}
        {distanceRanges.length > 0 && (
          <hr className={classes.sectionDivider} />
        )}
        {renderDefaultRow()}
      </div>
    </>
  );
};
