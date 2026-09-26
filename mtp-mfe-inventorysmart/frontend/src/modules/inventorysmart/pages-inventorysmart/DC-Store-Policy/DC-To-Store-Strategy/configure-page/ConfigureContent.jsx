import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { makeStyles } from '@mui/styles';
import HeaderBreadCrumbs from 'core/Utils/HeaderBreadCrumbs';
import { useLocation } from 'react-router-dom-v5-compat';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import { Button, Prompt, Switch } from 'impact-ui-v3';
import globalStyles from 'core/Styles/globalStyles';
import StoreDetailPanel from '../StoreDetailPanel';
import SortSelect from './SortSelect';
import ConfigurationTabs from './ConfigurationTabs';
import { addSnack } from 'core/actions/snackbarActions';
import Loader from 'core/Utils/Loader/loader';
import moment from 'moment';
import { isEmpty } from 'lodash';
import { displaySnackMessages } from '../../../inventorysmart-utility';
import { handleErrorMessage } from '../dCStoreStrategyTable';
import { saveDcStoreData, partialSaveDcStoreData } from 'modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy';

const useStyles = makeStyles({
  container: {
    padding: '0px 16px',
  },
  sourceToggle: {
    marginBottom: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  gridContainer: {
    marginBottom: '24px',
  },
  gridTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  panelLabelContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerCard: {
    display: 'flex',
    padding: '12px 16px',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: '12px',
    borderRadius: '8px',
    background: '#FFF',
    marginBottom: '12px',
  },
  headerLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0D152C',
  },
  panelLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#60697D',
  },
  divider: {
    width: '1px',
    height: '16px',
    backgroundColor: '#D9DDE7',
  },
  tabsContainer: {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: '#FFF',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: '#FFF',
    boxShadow: '0 0 18px 5px rgba(0, 0, 0, 0.06)',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  buttonContainerSpacer: {
    height: '72px',
  },
});

const ConfigurePage = (props) => {
  const classes = useStyles();
  const location = useLocation();
  const history = useHistory();
  const { ruleCode: locationRuleCode } = location.state || {};
  const { filterDependencies, ruleCode: propRuleCode, isSetAll, isPartialSetAll } = props;
  const ruleCode = propRuleCode || locationRuleCode || null;
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('store');
  const [preselectedItem, setPreselectedItem] = useState(null);
  const [toggleValue, setToggleValue] = useState(true);
  const [localStoreDetails, setLocalStoreDetails] = useState({});
  const source = localStoreDetails?.source || 'dc';
  const [showSourceChangeModal, setShowSourceChangeModal] = useState(false);
  const [pendingSource, setPendingSource] = useState(null);
  const agGridInstance = useRef(null);

  const loadTableInstance = useCallback((params) => {
    agGridInstance.current = params;
  }, []);
  const isSetAllMode = isSetAll || isPartialSetAll || location.state?.mode === "set_all";

  const configureData = isSetAllMode
    ? props.inventorySmartConfigurationService?.bulkConfigureData
    : props.inventorySmartConfigurationService?.configureData?.[ruleCode];

  const buildDefaultRow = useCallback((source, parentData) => {
    // Get default row configuration from screen config
    const defaultRowConfig = props.inventorysmartScreenConfig?.inventorysmart_configuration?.defaultSetAllRow || {};

    const newRow = {
      end_date: defaultRowConfig.end_date || null,
      start_date: defaultRowConfig.start_date || null,
      id: `${Date.now()}_${Math.random()}`,
      source,
      // Names - use configuration values
      store_store_groups_mapped: defaultRowConfig.store_store_groups_mapped || "0/0",
      product_profile: defaultRowConfig.product_profile || "-",
      dc_store_rule_name: defaultRowConfig.dc_store_rule_name || "-",
      auto_allocation_rule_name: defaultRowConfig.auto_allocation_rule_name || "-",
      auto_allocation_schedular_name: defaultRowConfig.auto_allocation_schedular_name || "-",
      // IDs - use configuration values
      default_store_groups: defaultRowConfig.default_store_groups || [],
      default_product_profile: defaultRowConfig.default_product_profile !== undefined ? defaultRowConfig.default_product_profile : null,
      dc_store_rule: defaultRowConfig.dc_store_rule !== undefined ? defaultRowConfig.dc_store_rule : null,
      auto_allocation_rule: defaultRowConfig.auto_allocation_rule !== undefined ? defaultRowConfig.auto_allocation_rule : null,
      auto_allocation_schedular: defaultRowConfig.auto_allocation_schedular !== undefined ? defaultRowConfig.auto_allocation_schedular : null,
    };

    if (parentData && !isEmpty(parentData)) {
      const {
        _default_auto_allocation_rule_code,
        _default_auto_allocation_rule_name,
        _default_auto_allocation_scheduler_code,
        _default_auto_allocation_scheduler_name,
        _default_dc_store_rule_rule_code,
        _default_dc_store_rule_rule_name,
        _default_store_groups_mapped,
        _store_groups_names,
        _store_group_ids,
        _default_product_profile_name,
        _default_product_profile_code,
      } = parentData;

      Object.assign(newRow, {
        // Names
        store_store_groups_mapped: _default_store_groups_mapped || "0/0",
        store_groups_names: _store_groups_names || [],
        product_profile: _default_product_profile_name || "-",
        dc_store_rule_name: _default_dc_store_rule_rule_name || "-",
        auto_allocation_rule_name: _default_auto_allocation_rule_name || "-",
        auto_allocation_schedular_name: _default_auto_allocation_scheduler_name || "-",
        // IDs
        default_store_groups: _store_group_ids || [],
        default_product_profile: _default_product_profile_code || null,
        dc_store_rule: _default_dc_store_rule_rule_code || null,
        auto_allocation_rule: _default_auto_allocation_rule_code || null,
        auto_allocation_schedular: _default_auto_allocation_scheduler_code || null,
      });
    }

    return newRow;
  }, [props.inventorysmartScreenConfig]);

  const handleSortChange = useCallback((selectedOption) => {
    // Show confirmation modal instead of directly changing source
    setPendingSource(selectedOption.value);
    setShowSourceChangeModal(true);
  }, []);

  const handleSourceChangeConfirm = useCallback(() => {
    // On source change, reset store_details to fresh default row(s).
    // dc_po → 2 rows (one dc, one po); otherwise → 1 row for the selected source.
    const parentData = configureData?.parentData || {};


    const newStoreDetails = pendingSource === 'dc_po'
      ? [
        buildDefaultRow('dc', parentData),
        buildDefaultRow('po', parentData),
      ]
      : [buildDefaultRow(pendingSource, parentData)];

    setLocalStoreDetails({
      ...parentData,
      source: pendingSource,
      store_details: newStoreDetails,
      isEdited: true,
    });
    setShowSourceChangeModal(false);
    setPendingSource(null);
    setToggleValue(true);
    setActiveTab('store');
    setPreselectedItem(null);
  }, [pendingSource, configureData?.parentData]);

  const handleSourceChangeCancel = useCallback(() => {
    setShowSourceChangeModal(false);
    setPendingSource(null);
  }, []);

  // Handle field click from StoreDetailPanel to switch tabs and preselect items
  const handleFieldClick = useCallback((fieldName, fieldValue, parentData) => {
    // Map field names to tabKey strings
    const fieldToTabMap = {
      'store_store_groups_mapped': 'store',
      'product': 'product',
      'product_profile': 'product',
      'dc_store_rule_name': 'strategy',
      'auto_allocation_rule_name': 'allocation',
      'auto_allocation_schedular_name': 'scheduler',
    };

    const normalizedFieldName = fieldName.toLowerCase().replace(/_/g, '');
    let tabKey = null;

    // Find matching tabKey based on field name
    for (const [key, tab] of Object.entries(fieldToTabMap)) {
      if (normalizedFieldName.includes(key.replace(/_/g, ''))) {
        tabKey = tab;
        break;
      }
    }
    if (tabKey) {
      setActiveTab(tabKey);
      setPreselectedItem({ fieldName, fieldValue, parentData });
    }
  }, []);

  // Handle selection changes from ConfigurableTab to update local state only
  const handleTabSelectionChange = useCallback((selectionData) => {
    const { attributeName, attributeType, selections, names, preselectedItem, tabType } = selectionData;
    // Update local state only (not Redux) - working with parentData structure
    setLocalStoreDetails(prevDetails => {
      const updatedStoreDetails = (prevDetails?.store_details || []).map(row => {
        if (row.id === preselectedItem.parentData.id && row[attributeName] !== "-") {
          return {
            ...row,
            [attributeName]: names,
            [attributeType]: selections,
            ...(tabType === "store" && {
              store_store_groups_mapped: selections,
              store_groups_names: names,
            }),
          };
        }
        return row;
      });
      return {
        ...prevDetails,
        store_details: updatedStoreDetails,
        isEdited: true
      };
    });
  }, []);

  // Handle adding a new row (from StoreDetailPanel)
  const handleAddRow = useCallback((source) => {
    setLocalStoreDetails((prevDetails) => {
      const newRow = buildDefaultRow(source === "po" ? "po" : "dc", prevDetails);
      return {
        ...prevDetails,
        store_details: [...(prevDetails?.store_details || []), newRow],
        isEdited: true,
      };
    });
  }, []);

  // Handle deleting a row (from StoreDetailPanel)
  const handleDeleteRow = useCallback((rowId) => {
    setLocalStoreDetails(prevDetails => {
      const updatedStoreDetails = (prevDetails?.store_details || []).filter(row => row.id !== rowId);
      return {
        ...prevDetails,
        store_details: updatedStoreDetails,
        isEdited: true
      };
    });
  }, []);

  // Handle cell value changes (from StoreDetailPanel)
  const handleCellValueChanged = useCallback((params) => {
    setLocalStoreDetails(prevDetails => {
      const updatedData = (prevDetails?.store_details || []).map(row => {
        if (row.id === params.data.id) {
          return { ...row, ...params.data };
        }
        return row;
      });
      return {
        ...prevDetails,
        store_details: updatedData,
        isEdited: true,
        hasConflict: params.hasConflict || false
      };
    });
  }, []);

  // Get data from Redux
  // Sync local state with Redux storeDetails when it changes
  useEffect(() => {
    setLocalStoreDetails(configureData?.parentData || {});
  }, [configureData?.parentData]);

  // Sync toggleValue with configureData
  useEffect(() => {
    setToggleValue(configureData?.parentData?.po_same_as_dc);
  }, [configureData?.parentData?.po_same_as_dc]);

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => {
    const allColumns = configureData?.columns || [];

    // Remove start and end date columns if isPartialSetAll is true
    if (isPartialSetAll) {
      return allColumns.filter(column => {
        const fieldName = column.field || column.column_name || column.colId || '';
        return !fieldName.toLowerCase().includes('start_date') &&
          !fieldName.toLowerCase().includes('end_date');
      });
    }

    return allColumns;
  }, [configureData?.columns, isPartialSetAll]);

  // Configuration array for StoreDetailPanel rendering
  const panelConfigs = useMemo(() => {
    if (source === 'dc_po' && !toggleValue) {
      return [
        { key: "dc-panel", filter: "dc", source: "dc" },
        { key: "po-panel", filter: "po", source: "po" }
      ];
    } else if (source === "po") {
      return [{ key: "po-pannel", filter: "po", source }];
    } else {
      return [{ key: "dc-pannel", filter: "dc", source }];
    }
  }, [source, toggleValue]);


  // Handle tab change
  const handleTabChange = useCallback((newVal) => {
    setActiveTab(newVal);
    return true;
  }, []);

  const handleUpdate = async () => {
    // Save configuration changes - similar to saveDataOnApply logic
    let allBodies = [];
    let allData = [];
    let allDatesPresent = true;
    let hasConflicts = false;
    // Collect edited rows from localStoreDetails
    // agGridInstance?.current?.api?.forEach((node) => {
    if (localStoreDetails?.isEdited) {
      // If source is dc_po and toggle is true, filter only DC source store_details
      if (source === 'dc_po' && toggleValue) {
        const filteredStoreDetails = localStoreDetails?.store_details?.filter(
          (detail) => detail.source === 'dc'
        ).map((detail) => ({
          ...detail,
          source: 'dc_po'  // Change source from 'dc' to 'dc_po'
        }));

        allData.push({
          ...localStoreDetails,
          store_details: filteredStoreDetails
        });
      } else {
        allData.push(localStoreDetails);
      }
    }
    console.log(localStoreDetails)
    if (localStoreDetails?.hasConflict) {
      hasConflicts = true;
    }
    // });

    if (hasConflicts) {
      displaySnackMessages(
        "Invalid Start and end dates or Conflicting Date ranges in a Rule",
        "error",
        props
      );
      return;
    }

    if (allData.length < 1) {
      displaySnackMessages("No change to save", "error", props);
      return;
    }
    // Process each edited row
    allData.forEach((thisData) => {
      let configuration = [];
      let row_update = [];
      if (isSetAllMode) {
        thisData.c_rule_code.forEach((ruleCode) => {
          row_update.push({
            rule_code: ruleCode,
          });
        });
      } else {
        row_update.push({
          rule_code: thisData.c_rule_code,
        });
      }

      if (isEmpty(thisData?.store_details)) {
        configuration.push([]);
      } else {
        thisData?.store_details?.forEach((thisStore) => {
          if (!thisStore.start_date || !thisStore.end_date) {
            allDatesPresent = false;
          }
          let row = [];
          let keys = isPartialSetAll
            ? ["default_store_groups"]
            : [
              "auto_allocation_rule",
              "dc_store_rule",
              "default_product_profile",
              "default_store_groups",
              "start_date",
              "end_date",
              "auto_allocation_schedular",
              "auto_allocation_schedular_store_level",
              "source",
            ];

          keys.forEach((thisKey) => {
            if (thisKey === "start_date" || thisKey === "end_date") {
              row.push({
                attribute_name: thisKey,
                attribute_value: moment(thisStore[thisKey]).format("YYYY-MM-DD"),
              });
            } else {
              if (thisStore?.store_scheduler_mapping && thisKey === "auto_allocation_schedular") {
                // Skip auto_allocation_schedular when store_scheduler_mapping exists
                return;
              }
              if (thisKey === "auto_allocation_schedular_store_level") {
                // Only for Vs-Intl
                if (thisStore?.store_scheduler_mapping) {
                  row.push({
                    attribute_name: thisKey,
                    attribute_value: thisStore?.store_scheduler_mapping,
                  });
                }
              } else {
                row.push({
                  attribute_name: thisKey,
                  attribute_value: thisStore[thisKey] !== undefined ? thisStore[thisKey] : null,
                });
              }
            }
          });
          configuration.push(row);
        });
      }

      // Create payload
      let body = {
        configuration,
        row_update,
        ...(props?.isManageRclFlow && { table_name: localStorage.getItem("rclCreatedTableName") }),
        filters: [],
        meta: {
          search: [],
          sort: [],
          range: [],
          limit: {
            limit: 10,
            page: 1,
          },
        },
      };
      if (!props?.isManageRclFlow) {
        body = { ...body, excluded_rows: [], is_all_records_selected: false };
      }
      console.log(body)
      allBodies.push(body);
    })
    if (!allDatesPresent && !isPartialSetAll) {
      displaySnackMessages(
        "Please provide start date and end date to save",
        "error",
        props
      );
      return;
    }
    setLoading(true);
    const promises = allBodies.map(
      async (editedRule) =>
        isPartialSetAll
          ? await partialSaveDcStoreData(editedRule)()
          : await saveDcStoreData(editedRule, props?.isManageRclFlow, null)()
    );
    try {
      const results = await Promise.all(promises);
      const tempResult = results.map((result) => result?.status);
      if (tempResult.includes(false)) {
        setLoading(false);
        handleErrorMessage({}, props);
        return false;
      }

      displaySnackMessages(
        "Configuration Updated Successfully",
        "success",
        props
      );

      setLoading(false);
      if (props?.isManageRclFlow) {
        props?.setShowConfigure(false);
        props?.setIsSetAll(false);
      } else {
        history.goBack();
      }
      return true;
    } catch (error) {
      setLoading(false);
      handleErrorMessage(error, props);
      return false;
    }
  };

  const handleCancel = () => {
    // Handle cancel logic - revert changes or navigate back
    if (props.setShowConfigure) {
      props.setShowConfigure(false);
      props?.setIsSetAll(false)
    }
    else {
      // Navigate back to the previous page
      history.goBack();
    }
  };


  return (
    <Loader loader={loading}>
      <div className={classes.container}>
        <div className={classes.headerCard}>
          <div className={classes.panelLabelContainer}>
            <span className={classes.headerLabel}>Update Mappings</span>
            {!isSetAll && !isPartialSetAll && (
              <div className={classes.divider} />
            )}
            {!isSetAll && !isPartialSetAll && (
              <span className={classes.panelLabel}>
                Rule ID : {localStoreDetails?.c_rule_code}
              </span>
            )}
          </div>
          {!isPartialSetAll && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {source === 'dc_po' && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span>PO same as DC</span>
                <Switch
                  checked={toggleValue}
                  id="configureToggleBtn"
                  onChange={(event) => setToggleValue(event.target.checked)}
                />
              </div>
            )}
            {<SortSelect onSortChange={handleSortChange} value={source} />}
          </div>
          )}
        </div>
        {panelConfigs.map(({ key, filter, source: sourceProp }) => (
          <div key={key} className={classes.gridContainer}>
            <StoreDetailPanel
              key={key}
              data={localStoreDetails?.store_details?.filter(data => data?.source === filter) || []}
              columns={columns}
              isConfigureMode={true}
              source={sourceProp}
              ruleCode={ruleCode}
              onFieldClick={handleFieldClick}
              parentData={localStoreDetails}
              addSnack={props.addSnack}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              loadTableInstance={loadTableInstance}
              onCellValueChanged={handleCellValueChanged}
              isManageRclFlow={props?.isManageRclFlow}
              isPartialSetAll={props?.isPartialSetAll}
            />
          </div>
        ))}

        {/* Tabs below the table */}

        {preselectedItem && (
          <div className={classes.tabsContainer}>
            <ConfigurationTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              ruleCode={ruleCode}
              filterDependencies={filterDependencies}
              preselectedItem={preselectedItem}
              onClose={() => setPreselectedItem(null)}
              onSelectionChange={handleTabSelectionChange}
              isManageRclFlow={props?.isManageRclFlow}
            />
          </div>
        )}
      </div>


      {/* Source Change Confirmation Prompt */}
      <Prompt
        isOpen={showSourceChangeModal}
        title="Confirm Source Change"
        variant="warning"
        children={<div>Changing the source will reset all your unsaved changes. Are you sure you want to continue?</div>}
        handleClose={handleSourceChangeCancel}
        primaryButtonLabel="Confirm"
        onPrimaryButtonClick={handleSourceChangeConfirm}
        secondaryButtonLabel="Cancel"
        onSecondaryButtonClick={handleSourceChangeCancel}
      />

      {/* Spacer to prevent content from hiding behind fixed button bar */}
      <div className={classes.buttonContainerSpacer} />

      {/* Update and Cancel buttons */}
      <div className={classes.buttonContainer}>
        <Button
          variant="tertiary"
          size="large"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="large"
          onClick={handleUpdate}
        >
          Update
        </Button>
      </div>
    </Loader>
  );
};

const mapStateToProps = (state) => {
  return {
    inventorySmartConfigurationService: state.inventorysmartReducer?.inventorySmartConfigurationService,
    filterDependencies: state.filterReducer,
    inventorysmartScreenConfig: state.inventorysmartReducer?.inventorySmartCommonService?.inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfigurePage);