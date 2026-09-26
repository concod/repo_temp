import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
// import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  Button,
  ButtonGroup,
  Input,
  Panel,
  Prompt,
  Select,
  useTranslation,
} from "impact-ui-v3";
import { addSnack as addSnackAction } from "core/actions/snackbarActions";
import WarningIcon from "assets/IS_icons/IS_warning.svg";
import {
  getLogisticsPanelTitle,
  LOGISTICS_LEAD_TIME_MAX_EXCEEDED_MESSAGE,
  LOGISTICS_METHOD_HELPER_TEXT,
  LOGISTICS_STORE_GROUPS_OVERLAP_WARNING,
  LOGISTICS_METHOD_SELECT_LABEL,
  LOGISTICS_PANEL_METHOD_TABS,
  LOGISTICS_STORE_GROUP_PAYLOAD,
  LOGISTICS_TAB_SWITCH_PROMPT,
} from "../logisticsConfigConstants";
import { LOGISTICS_SECTION_ICONS } from "../logisticsConfigIcons";
import { useLogisticsConfigurationStyles } from "../logisticsConfigurationStyles";
import { LogisticsDistanceTab } from "./LogisticsDistanceTab";
import { buildDistanceRangesFromRules } from "../logisticsDistanceUtils";
import {
  buildGeographyStateFromRules,
  buildRankOptions,
  buildStoreGroupStateFromRules,
  findRankOption,
  getRuleDisplayLabel,
  mapStoreGroupPoolOptions,
  hasMethodTabData,
  clampLeadTimeDaysValue,
  getLogisticsIntegerInputValue,
  isLogisticsPanelSaveEnabled,
} from "../logisticsConfigUtils";
import { getLogisticPoolDropdownValues } from "../../../services-inventorysmart/Logistics-Configuration/logistics-configuration-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const VALUE_INPUT_LABEL = {
  lead_time: "Select days",
  priority: "Rank",
  min_transfer_qty: "Select Quantity",
};

const getInitialMethod = (sectionData) => {
  const activeMethod = sectionData?.active_method;
  if (
    activeMethod &&
    LOGISTICS_PANEL_METHOD_TABS.some((tab) => tab.value === activeMethod)
  ) {
    return activeMethod;
  }
  return LOGISTICS_PANEL_METHOD_TABS[0]?.value || "store_groups";
};

const getMethodRules = (sectionData, methodKey) => {
  const methodData = sectionData?.[methodKey];
  if (!methodData) {
    return { rules: [], default: null };
  }
  return {
    rules: methodData.rules || [],
    default: methodData.default || null,
  };
};

const getRuleLabel = (rule, methodKey) => getRuleDisplayLabel(rule, methodKey);

const getRuleValue = (rule, sectionId) => {
  if (sectionId === "lead_time") {
    return rule.lead_time_days ?? "";
  }
  if (sectionId === "priority") {
    return rule.priority ?? "";
  }
  return rule.min_transfer_qty ?? "";
};

const getDefaultValue = (defaultRule, sectionId) => {
  if (!defaultRule) {
    return "";
  }
  if (sectionId === "lead_time") {
    return defaultRule.lead_time_days ?? "";
  }
  if (sectionId === "priority") {
    return defaultRule.priority ?? "";
  }
  return defaultRule.min_transfer_qty ?? "";
};

export const LogisticsConfigurationPanel = ({
  open,
  sectionId,
  sectionData,
  geographyOptions = [],
  isSaving = false,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const classes = useLogisticsConfigurationStyles();
  // Parent remounts this panel with key=sectionId on each Edit, so sectionData is
  // available here on first paint (avoids stale activeMethod from a closed panel).
  const [activeMethod, setActiveMethod] = useState(() =>
    getInitialMethod(sectionData)
  );
  const [storeGroupSelectOpen, setStoreGroupSelectOpen] = useState(false);
  const [geographySelectOpen, setGeographySelectOpen] = useState(false);
  const [selectedStoreGroups, setSelectedStoreGroups] = useState([]);
  const [isStoreGroupSelectAll, setIsStoreGroupSelectAll] = useState(false);
  const [storeGroupOptions, setStoreGroupOptions] = useState([]);
  const [originalStoreGroupOptions, setOriginalStoreGroupOptions] = useState(
    []
  );
  const [storeGroupSelectKey, setStoreGroupSelectKey] = useState(0);
  const [storeGroupRuleValues, setStoreGroupRuleValues] = useState({});
  const [isStoreGroupLoading, setIsStoreGroupLoading] = useState(false);
  const storeGroupFetchInFlightRef = useRef(false);
  const shouldHydrateStoreGroupsFromApiRef = useRef(false);
  const [selectedGeography, setSelectedGeography] = useState([]);
  const [isGeographySelectAll, setIsGeographySelectAll] = useState(false);
  const [panelGeographyOptions, setPanelGeographyOptions] = useState([]);
  const [geographySelectKey, setGeographySelectKey] = useState(0);
  const [geographyRuleValues, setGeographyRuleValues] = useState({});
  const [openRankSelectKey, setOpenRankSelectKey] = useState(null);
  const [distanceRanges, setDistanceRanges] = useState([]);
  const [defaultRuleValue, setDefaultRuleValue] = useState("");
  const [showTabSwitchPrompt, setShowTabSwitchPrompt] = useState(false);
  const [pendingMethod, setPendingMethod] = useState(null);

  const geographySelectOptions = useMemo(
    () =>
      (geographyOptions || []).map((item) => ({
        id: item.attribute,
        label: item.label,
        value: item.attribute,
      })),
    [geographyOptions]
  );

  const isLeadTimeSection = sectionId === "lead_time";
  const isPrioritySection = sectionId === "priority";
  const isMinTransferQtySection = sectionId === "min_transfer_qty";
  const usesNumericValueInput = isLeadTimeSection || isMinTransferQtySection;

  const rankOptionsCount = useMemo(() => {
    if (!isPrioritySection) {
      return 0;
    }
    if (activeMethod === "store_groups") {
      return selectedStoreGroups.length;
    }
    if (activeMethod === "geography") {
      return selectedGeography.length;
    }
    if (activeMethod === "distance") {
      return distanceRanges.length;
    }
    return 0;
  }, [
    isPrioritySection,
    activeMethod,
    selectedStoreGroups.length,
    selectedGeography.length,
    distanceRanges.length,
  ]);

  const rankOptions = useMemo(() => {
    if (!isPrioritySection) {
      return [];
    }
    return buildRankOptions(rankOptionsCount);
  }, [isPrioritySection, rankOptionsCount]);

  const displaySnackMessages = useCallback(
    (message, variance) => {
      dispatch(
        addSnackAction({
          message,
          options: {
            variant: variance,
            disableOnClose: true,
          },
        })
      );
    },
    [dispatch]
  );

  const handleLeadTimeValueBlur = useCallback(
    (rawValue, onUpdate) => {
      if (!isLeadTimeSection || rawValue === "") {
        return;
      }

      const { value, exceeded } = clampLeadTimeDaysValue(rawValue);
      if (exceeded) {
        displaySnackMessages(LOGISTICS_LEAD_TIME_MAX_EXCEEDED_MESSAGE, "error");
        onUpdate(value);
      }
    },
    [displaySnackMessages, isLeadTimeSection]
  );

  const fetchStoreGroupOptions = useCallback(async () => {
    if (storeGroupFetchInFlightRef.current) {
      return;
    }

    storeGroupFetchInFlightRef.current = true;
    setIsStoreGroupLoading(true);

    try {
      const response = await dispatch(
        getLogisticPoolDropdownValues(LOGISTICS_STORE_GROUP_PAYLOAD)
      );

      if (response?.data?.status) {
        const options = mapStoreGroupPoolOptions(
          response?.data?.data?.values || []
        );
        setStoreGroupOptions(options);
        setOriginalStoreGroupOptions(options);
        return;
      }

      displaySnackMessages(response?.data?.message || ERROR_MESSAGE, "error");
    } catch (error) {
      const errObj = error?.response?.data;
      displaySnackMessages(
        errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        "error"
      );
    } finally {
      storeGroupFetchInFlightRef.current = false;
      setIsStoreGroupLoading(false);
    }
  }, [dispatch, displaySnackMessages]);

  const hydrateMethodTabStateFromApi = useCallback(
    (methodKey) => {
      const methodRules = getMethodRules(sectionData, methodKey);

      if (methodKey === "distance") {
        setDistanceRanges(
          buildDistanceRangesFromRules(methodRules.rules, (rule) =>
            getRuleValue(rule, sectionId)
          )
        );
        setSelectedStoreGroups([]);
        setStoreGroupRuleValues({});
        setSelectedGeography([]);
        setGeographyRuleValues({});
      } else if (methodKey === "geography") {
        setDistanceRanges([]);
        setSelectedStoreGroups([]);
        setStoreGroupRuleValues({});
        const {
          selectedGeography: selected,
          geographyRuleValues: ruleValues,
        } = buildGeographyStateFromRules(
          methodRules.rules,
          geographySelectOptions,
          (rule) => getRuleValue(rule, sectionId)
        );
        setSelectedGeography(selected);
        setGeographyRuleValues(ruleValues);
      } else if (methodKey === "store_groups") {
        setDistanceRanges([]);
        setSelectedGeography([]);
        setGeographyRuleValues({});
        const storeGroupOptionSource =
          originalStoreGroupOptions.length > 0
            ? originalStoreGroupOptions
            : storeGroupOptions;
        const {
          selectedStoreGroups: selected,
          storeGroupRuleValues: ruleValues,
        } = buildStoreGroupStateFromRules(
          methodRules.rules,
          storeGroupOptionSource,
          (rule) => getRuleValue(rule, sectionId)
        );
        setSelectedStoreGroups(selected);
        setStoreGroupRuleValues(ruleValues);
      }

      setDefaultRuleValue(
        methodRules.default
          ? String(getDefaultValue(methodRules.default, sectionId))
          : ""
      );
    },
    [
      sectionData,
      sectionId,
      geographySelectOptions,
      originalStoreGroupOptions,
      storeGroupOptions,
    ]
  );

  useEffect(() => {
    if (!open || !sectionId) {
      return;
    }

    setActiveMethod(getInitialMethod(sectionData));
    setStoreGroupSelectOpen(false);
    setGeographySelectOpen(false);
    setIsStoreGroupSelectAll(false);
    setStoreGroupOptions([]);
    setOriginalStoreGroupOptions([]);
    setStoreGroupSelectKey((prev) => prev + 1);
    storeGroupFetchInFlightRef.current = false;
    setIsGeographySelectAll(false);
    setPanelGeographyOptions(geographySelectOptions);
    setGeographySelectKey((prev) => prev + 1);
    setOpenRankSelectKey(null);
    setShowTabSwitchPrompt(false);
    setPendingMethod(null);

    const initialMethod = getInitialMethod(sectionData);
    const initialStoreGroupRules = getMethodRules(sectionData, "store_groups");
    shouldHydrateStoreGroupsFromApiRef.current =
      initialMethod === "store_groups" &&
      (initialStoreGroupRules.rules?.length ?? 0) > 0;
    hydrateMethodTabStateFromApi(initialMethod);

    if (shouldHydrateStoreGroupsFromApiRef.current) {
      fetchStoreGroupOptions();
    }
    // Parent remounts on section open; only re-run for open/sectionId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sectionId]);

  useEffect(() => {
    if (
      !open ||
      !shouldHydrateStoreGroupsFromApiRef.current ||
      originalStoreGroupOptions.length === 0
    ) {
      return;
    }

    const methodRules = getMethodRules(sectionData, "store_groups");
    if (!methodRules.rules?.length) {
      shouldHydrateStoreGroupsFromApiRef.current = false;
      return;
    }

    const {
      selectedStoreGroups: selected,
      storeGroupRuleValues: ruleValues,
    } = buildStoreGroupStateFromRules(
      methodRules.rules,
      originalStoreGroupOptions,
      (rule) => getRuleValue(rule, sectionId)
    );

    setSelectedStoreGroups(selected);
    setStoreGroupRuleValues(ruleValues);
    shouldHydrateStoreGroupsFromApiRef.current = false;
  }, [open, originalStoreGroupOptions, sectionData, sectionId]);

  useEffect(() => {
    if (activeMethod !== "store_groups" || selectedStoreGroups.length === 0) {
      // Skip while selection is empty so mount/open hydration isn't wiped before
      // selectedStoreGroups is populated in the open effect.
      return;
    }

    const maxRank =
      sectionId === "priority" ? selectedStoreGroups.length + 1 : null;

    setStoreGroupRuleValues((prev) => {
      const next = {};
      selectedStoreGroups.forEach((option) => {
        const previousValue = prev[option.value] ?? "";
        if (maxRank && previousValue && Number(previousValue) > maxRank) {
          next[option.value] = "";
        } else {
          next[option.value] = previousValue;
        }
      });
      return next;
    });

    if (maxRank) {
      setDefaultRuleValue((prev) =>
        prev && Number(prev) > maxRank ? "" : prev
      );
    }
  }, [selectedStoreGroups, activeMethod, sectionId]);

  useEffect(() => {
    if (selectedStoreGroups.length === 0) {
      setIsStoreGroupSelectAll(false);
      return;
    }

    if (
      originalStoreGroupOptions.length > 0 &&
      selectedStoreGroups.length === originalStoreGroupOptions.length
    ) {
      setIsStoreGroupSelectAll(true);
    } else {
      setIsStoreGroupSelectAll(false);
    }
  }, [selectedStoreGroups, originalStoreGroupOptions]);

  useEffect(() => {
    if (activeMethod !== "geography" || selectedGeography.length === 0) {
      // Same as store-groups: avoid clearing hydrated values on an empty first paint.
      return;
    }

    const maxRank =
      sectionId === "priority" ? selectedGeography.length + 1 : null;

    setGeographyRuleValues((prev) => {
      const next = {};
      selectedGeography.forEach((option) => {
        const previousValue = prev[option.value] ?? "";
        if (maxRank && previousValue && Number(previousValue) > maxRank) {
          next[option.value] = "";
        } else {
          next[option.value] = previousValue;
        }
      });
      return next;
    });

    if (maxRank) {
      setDefaultRuleValue((prev) =>
        prev && Number(prev) > maxRank ? "" : prev
      );
    }
  }, [selectedGeography, activeMethod, sectionId]);

  useEffect(() => {
    if (activeMethod !== "distance" || sectionId !== "priority") {
      return;
    }

    const maxRank = distanceRanges.length + 1;

    setDistanceRanges((prev) => {
      let hasChanges = false;
      const next = prev.map((range) => {
        if (range.value && Number(range.value) > maxRank) {
          hasChanges = true;
          return { ...range, value: "" };
        }
        return range;
      });
      return hasChanges ? next : prev;
    });

    setDefaultRuleValue((prev) => (prev && Number(prev) > maxRank ? "" : prev));
  }, [distanceRanges.length, activeMethod, sectionId]);

  useEffect(() => {
    if (selectedGeography.length === 0) {
      setIsGeographySelectAll(false);
      return;
    }

    if (
      panelGeographyOptions.length > 0 &&
      selectedGeography.length === panelGeographyOptions.length
    ) {
      setIsGeographySelectAll(true);
    } else {
      setIsGeographySelectAll(false);
    }
  }, [selectedGeography, panelGeographyOptions]);

  const handleGeographyChange = (options) => {
    setSelectedGeography(options || []);
  };

  const handleStoreGroupChange = (options) => {
    setSelectedStoreGroups(options || []);
  };

  const handleStoreGroupSearch = (searchTerm) => {
    const searchValue = searchTerm?.target?.value ?? "";

    if (searchValue.trim()) {
      const lowerCaseSearchTerm = searchValue.toLowerCase();
      setStoreGroupOptions(
        originalStoreGroupOptions.filter(
          (option) =>
            option.label.toLowerCase().includes(lowerCaseSearchTerm) ||
            String(option.rawName || "")
              .toLowerCase()
              .includes(lowerCaseSearchTerm)
        )
      );
      return;
    }

    setStoreGroupOptions(originalStoreGroupOptions);
  };

  const handleStoreGroupOpen = () => {
    setStoreGroupSelectOpen(true);

    if (originalStoreGroupOptions.length === 0 && !isStoreGroupLoading) {
      fetchStoreGroupOptions();
    }
  };

  const { rules, default: defaultRule } = getMethodRules(
    sectionData,
    activeMethod
  );
  const hasExistingRules = rules.length > 0 || Boolean(defaultRule);
  const helperText =
    LOGISTICS_METHOD_HELPER_TEXT[sectionId]?.[activeMethod] || "";
  const valueInputLabel = VALUE_INPUT_LABEL[sectionId] || "Value";
  const storeGroupsOverlapWarning =
    LOGISTICS_STORE_GROUPS_OVERLAP_WARNING[sectionId];
  const showStoreGroupsOverlapWarning =
    activeMethod === "store_groups" &&
    selectedStoreGroups.length > 0 &&
    Boolean(storeGroupsOverlapWarning);

  const getCurrentTabDataSnapshot = useCallback(
    () => ({
      sectionId,
      activeMethod,
      selectedStoreGroups,
      storeGroupRuleValues,
      selectedGeography,
      geographyRuleValues,
      distanceRanges,
      defaultRuleValue,
    }),
    [
      sectionId,
      activeMethod,
      selectedStoreGroups,
      storeGroupRuleValues,
      selectedGeography,
      geographyRuleValues,
      distanceRanges,
      defaultRuleValue,
    ]
  );

  const hasUnsavedTabData = useCallback(
    () =>
      hasMethodTabData({
        method: activeMethod,
        selectedStoreGroups,
        storeGroupRuleValues,
        selectedGeography,
        geographyRuleValues,
        distanceRanges,
        defaultRuleValue,
      }),
    [
      activeMethod,
      selectedStoreGroups,
      storeGroupRuleValues,
      selectedGeography,
      geographyRuleValues,
      distanceRanges,
      defaultRuleValue,
    ]
  );

  const isSaveEnabled = useMemo(
    () =>
      isLogisticsPanelSaveEnabled({
        activeMethod,
        selectedStoreGroups,
        storeGroupRuleValues,
        selectedGeography,
        geographyRuleValues,
        distanceRanges,
        defaultRuleValue,
      }),
    [
      activeMethod,
      selectedStoreGroups,
      storeGroupRuleValues,
      selectedGeography,
      geographyRuleValues,
      distanceRanges,
      defaultRuleValue,
    ]
  );

  const clearMethodTabStateForSwitch = useCallback(() => {
    setSelectedStoreGroups([]);
    setIsStoreGroupSelectAll(false);
    setStoreGroupRuleValues({});
    setStoreGroupSelectKey((prev) => prev + 1);
    setSelectedGeography([]);
    setIsGeographySelectAll(false);
    setGeographyRuleValues({});
    setGeographySelectKey((prev) => prev + 1);
    setDistanceRanges([]);
    setDefaultRuleValue("");
    setOpenRankSelectKey(null);
  }, []);

  const applyMethodSwitch = useCallback(
    (selectedValue, { saveCurrent = false } = {}) => {
      if (!selectedValue || selectedValue === activeMethod) {
        return;
      }

      if (saveCurrent) {
        onSave?.(getCurrentTabDataSnapshot());
      }

      shouldHydrateStoreGroupsFromApiRef.current = false;
      setActiveMethod(selectedValue);
      clearMethodTabStateForSwitch();
      setStoreGroupSelectOpen(false);
      setGeographySelectOpen(false);
    },
    [
      activeMethod,
      clearMethodTabStateForSwitch,
      getCurrentTabDataSnapshot,
      onSave,
    ]
  );

  const closeTabSwitchPrompt = useCallback(() => {
    setShowTabSwitchPrompt(false);
    setPendingMethod(null);
  }, []);

  const handleMethodChange = (_, selectedValue) => {
    if (!selectedValue || selectedValue === activeMethod) {
      return;
    }

    if (hasUnsavedTabData()) {
      setPendingMethod(selectedValue);
      setShowTabSwitchPrompt(true);
      return;
    }

    applyMethodSwitch(selectedValue);
  };

  const handleDiscardTabSwitch = () => {
    if (pendingMethod) {
      applyMethodSwitch(pendingMethod);
    }
    closeTabSwitchPrompt();
  };

  const handleSave = async () => {
    if (!isSaveEnabled || isSaving) {
      return;
    }

    await onSave?.(getCurrentTabDataSnapshot());
  };

  const renderSelectField = () => (
    <>
      <div
        className={`${classes.panelSelectField} ${
          activeMethod !== "store_groups" ? classes.panelSelectFieldHidden : ""
        }`}
      >
        <p className={classes.panelSelectLabel}>
          {LOGISTICS_METHOD_SELECT_LABEL.store_groups}
        </p>
        <div className={classes.panelSelectControl}>
          <Select
            key={`store-group-select-${sectionId}-${storeGroupSelectKey}`}
            placeholder={t("inventorysmart.selectOption")}
            isClearable={true}
            isMulti={true}
            isWithSearch={true}
            onSearch={handleStoreGroupSearch}
            isCloseWhenClickOutside={true}
            isOpen={storeGroupSelectOpen}
            setIsOpen={setStoreGroupSelectOpen}
            onDropdownOpen={handleStoreGroupOpen}
            isLoading={isStoreGroupLoading}
            withPortal={true}
            currentOptions={storeGroupOptions}
            initialOptions={originalStoreGroupOptions}
            selectedOptions={selectedStoreGroups}
            setSelectedOptions={setSelectedStoreGroups}
            handleChange={handleStoreGroupChange}
            isSelectAll={isStoreGroupSelectAll}
            setIsSelectAll={setIsStoreGroupSelectAll}
            toggleSelectAll={true}
            minWidth="182px"
            width="100%"
          />
        </div>
      </div>

      <div
        className={`${classes.panelSelectField} ${
          activeMethod !== "geography" ? classes.panelSelectFieldHidden : ""
        }`}
      >
        <p className={classes.panelSelectLabel}>
          {LOGISTICS_METHOD_SELECT_LABEL.geography}
        </p>
        <div className={classes.panelSelectControl}>
          <Select
            key={`geography-select-${sectionId}-${geographySelectKey}`}
            placeholder="Select Option"
            isClearable={true}
            isMulti={true}
            isOpen={geographySelectOpen}
            setIsOpen={setGeographySelectOpen}
            currentOptions={panelGeographyOptions}
            initialOptions={panelGeographyOptions}
            selectedOptions={selectedGeography}
            setSelectedOptions={setSelectedGeography}
            handleChange={handleGeographyChange}
            isSelectAll={isGeographySelectAll}
            setIsSelectAll={setIsGeographySelectAll}
            toggleSelectAll={true}
            withPortal={true}
            minWidth="182px"
            width="100%"
          />
        </div>
      </div>
    </>
  );

  const renderRankSelect = (selectKey, value, onValueChange) => (
    <div className={classes.panelRuleRowSelect}>
      <Select
        placeholder={t("inventorysmart.selectOption")}
        isClearable={true}
        isMulti={false}
        isOpen={openRankSelectKey === selectKey}
        setIsOpen={(isOpen) => setOpenRankSelectKey(isOpen ? selectKey : null)}
        currentOptions={rankOptions}
        initialOptions={rankOptions}
        selectedOptions={findRankOption(rankOptions, value)}
        setSelectedOptions={() => {}}
        setCurrentOptions={() => {}}
        handleChange={(option) => {
          onValueChange(option?.value != null ? String(option.value) : "");
          setOpenRankSelectKey(null);
        }}
        onClearAll={() => {
          onValueChange("");
          setOpenRankSelectKey(null);
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
          value={value}
          type="number"
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
                  handleLeadTimeValueBlur(
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

  const renderDefaultRuleRow = (
    value,
    onValueChange,
    selectKey = "default"
  ) => (
    <div className={classes.panelRuleRow}>
      <div className={classes.panelRuleRowLeft}>
        {/* <DragIndicatorIcon className={classes.ruleRowDrag} /> */}
        <p className={classes.panelRuleRowLabel}>
          {" "}
          {t("inventorysmart.default")}
        </p>
      </div>
      <div className={classes.panelRuleRowInputGroup}>
        <p className={classes.panelRuleRowInputLabel}>{valueInputLabel}</p>
        {renderRuleValueControl(selectKey, value, onValueChange)}
      </div>
    </div>
  );

  const renderGeographySelectedRow = (option) => (
    <div key={option.value} className={classes.panelRuleRow}>
      <div className={classes.panelRuleRowLeft}>
        {/* <DragIndicatorIcon className={classes.ruleRowDrag} /> */}
        <p className={classes.panelRuleRowLabel}>{option.label}</p>
      </div>
      <div className={classes.panelRuleRowInputGroup}>
        <p className={classes.panelRuleRowInputLabel}>{valueInputLabel}</p>
        {renderRuleValueControl(
          option.value,
          geographyRuleValues[option.value] ?? "",
          (nextValue) => {
            setGeographyRuleValues((prev) => ({
              ...prev,
              [option.value]: nextValue,
            }));
          }
        )}
      </div>
    </div>
  );

  const renderGeographyRulesList = () => (
    <div className={classes.panelRulesList}>
      {selectedGeography.map((option) => renderGeographySelectedRow(option))}
      {selectedGeography.length > 0 && (
        <hr className={classes.sectionDivider} />
      )}
      {renderDefaultRuleRow(defaultRuleValue, setDefaultRuleValue)}
    </div>
  );

  const renderStoreGroupSelectedRow = (option) => (
    <div key={option.value} className={classes.panelRuleRow}>
      <div className={classes.panelRuleRowLeft}>
        {/* <DragIndicatorIcon className={classes.ruleRowDrag} /> */}
        <p className={classes.panelRuleRowLabel}>{option.label}</p>
      </div>
      <div className={classes.panelRuleRowInputGroup}>
        <p className={classes.panelRuleRowInputLabel}>{valueInputLabel}</p>
        {renderRuleValueControl(
          option.value,
          storeGroupRuleValues[option.value] ?? "",
          (nextValue) => {
            setStoreGroupRuleValues((prev) => ({
              ...prev,
              [option.value]: nextValue,
            }));
          }
        )}
      </div>
    </div>
  );

  const renderStoreGroupRulesList = () => (
    <div className={classes.panelRulesList}>
      {selectedStoreGroups.map((option) => renderStoreGroupSelectedRow(option))}
      {selectedStoreGroups.length > 0 && (
        <hr className={classes.sectionDivider} />
      )}
      {renderDefaultRuleRow(defaultRuleValue, setDefaultRuleValue)}
    </div>
  );

  const renderRuleRow = (rule, index, isDefault = false) => (
    <div
      key={isDefault ? "default-rule" : `panel-rule-${index}`}
      className={classes.panelRuleRow}
    >
      <div className={classes.panelRuleRowLeft}>
        {/* <DragIndicatorIcon className={classes.ruleRowDrag} /> */}
        <div>
          <p className={classes.panelRuleRowLabel}>
            {isDefault
              ? t("inventorysmart.default")
              : getRuleLabel(rule, activeMethod)}
          </p>
          {!isDefault && rule.store_count != null && (
            <p className={classes.panelRuleRowSubLabel}>
              {rule.store_count} {t("inventorysmart.stores")}
            </p>
          )}
        </div>
      </div>
      <div className={classes.panelRuleRowInputGroup}>
        <p className={classes.panelRuleRowInputLabel}>{valueInputLabel}</p>
        <div className={classes.panelDistanceCompactInput}>
          <Input
            type="number"
            inputProps={{ min: 0, step: 1 }}
            value={
              isDefault
                ? String(getDefaultValue(defaultRule, sectionId))
                : String(getRuleValue(rule, sectionId))
            }
            onChange={() => {}}
          />
        </div>
      </div>
    </div>
  );

  const showRulesList =
    activeMethod === "store_groups" ||
    activeMethod === "geography" ||
    activeMethod === "distance" ||
    hasExistingRules;

  if (!sectionId) {
    return null;
  }

  const PanelTitleIcon = LOGISTICS_SECTION_ICONS[sectionId];
  const panelTitle = (
    <div className={classes.panelTitle}>
      {PanelTitleIcon && <PanelTitleIcon className={classes.sectionIcon} />}
      <p className={classes.panelTitleText}>
        {getLogisticsPanelTitle(sectionId)}
      </p>
    </div>
  );

  return (
    <>
      <Panel
        key={sectionId}
        className={classes.logisticsConfigPanel}
        title={panelTitle}
        size="large"
        anchor="right"
        width={840}
        open={open}
        onClose={onClose}
        primaryButtonLabel={t("inventorysmart.save")}
        onPrimaryButtonClick={handleSave}
        primaryButtonProps={{ disabled: !isSaveEnabled || isSaving }}
        customFooterContent={
          <Button variant="text" onClick={onClose}>
            {t("inventorysmart.cancel")}
          </Button>
        }
      >
        <div className={classes.logisticsConfigPanelLayout}>
          <div className={classes.panelBody}>
            <div className={classes.panelTabsRow}>
              <ButtonGroup
                options={LOGISTICS_PANEL_METHOD_TABS}
                selectedOption={activeMethod}
                onChange={handleMethodChange}
              />
            </div>

            <hr className={classes.sectionDivider} />

            <div className={classes.panelContentArea}>
              {activeMethod !== "distance" && (
                <div className={classes.panelSelectRow}>
                  {renderSelectField()}
                  {helperText && (
                    <p className={classes.panelHelperText}>{helperText}</p>
                  )}
                </div>
              )}

              {activeMethod === "distance" ? (
                <LogisticsDistanceTab
                  helperText={helperText}
                  valueInputLabel={valueInputLabel}
                  distanceRanges={distanceRanges}
                  defaultRuleValue={defaultRuleValue}
                  onDistanceRangesChange={setDistanceRanges}
                  onDefaultRuleValueChange={setDefaultRuleValue}
                  displaySnackMessages={displaySnackMessages}
                  isLeadTimeSection={isLeadTimeSection}
                  isPrioritySection={isPrioritySection}
                  usesNumericValueInput={usesNumericValueInput}
                  rankOptions={rankOptions}
                  openRankSelectKey={openRankSelectKey}
                  onOpenRankSelectKeyChange={setOpenRankSelectKey}
                  onLeadTimeValueBlur={handleLeadTimeValueBlur}
                />
              ) : (
                showRulesList &&
                (activeMethod === "geography" ? (
                  renderGeographyRulesList()
                ) : activeMethod === "store_groups" ? (
                  renderStoreGroupRulesList()
                ) : (
                  <div className={classes.panelRulesList}>
                    {rules.map((rule, index) => renderRuleRow(rule, index))}
                    {defaultRule && (
                      <>
                        <hr className={classes.sectionDivider} />
                        {renderRuleRow(null, -1, true)}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          {showStoreGroupsOverlapWarning && (
            <div className={classes.panelWarningBanner}>
              <span className={classes.panelWarningIcon} aria-hidden="true">
                <WarningIcon />
              </span>
              <p className={classes.panelWarningText}>
                {storeGroupsOverlapWarning}
              </p>
            </div>
          )}
        </div>
      </Panel>

      <Prompt
        isOpen={showTabSwitchPrompt}
        title={LOGISTICS_TAB_SWITCH_PROMPT.title}
        variant="warning"
        primaryButtonLabel={LOGISTICS_TAB_SWITCH_PROMPT.primaryButtonLabel}
        secondaryButtonLabel={LOGISTICS_TAB_SWITCH_PROMPT.secondaryButtonLabel}
        onPrimaryButtonClick={closeTabSwitchPrompt}
        onSecondaryButtonClick={handleDiscardTabSwitch}
        handleClose={closeTabSwitchPrompt}
      >
        {LOGISTICS_TAB_SWITCH_PROMPT.description}
      </Prompt>
    </>
  );
};
