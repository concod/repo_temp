import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Button, Tooltip } from "impact-ui-v3";
import { Grid } from "@mui/material";
import { makeStyles } from "@mui/styles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isNumber } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { createStoreTransferRule } from "../../../services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import { ERROR_MESSAGE, INVENTORY_SUBMODULES_NAMES } from "../../../constants-inventorysmart/stringConstants";
import { previewStoreTransferRule, viewPreviewStoreTransferRule } from "../../../services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import ModeEditIcon from '@mui/icons-material/ModeEdit';

const useStyles = makeStyles((theme) => ({
  detailsCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 26px',
    borderRadius: '12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    marginBottom: '24px',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    alignSelf: 'stretch',
    position: 'relative',
    flexWrap: 'wrap'
  },
  editButtonContainer: {
    position: 'absolute',
    top: '24px',
    right: '16px',
  },
  detailItem: {
    flex: '1 1 0',
    minWidth: '150px',
    maxWidth: '250px',
    margin: '8px 0'
  },
  detailLabel: {
    fontSize: '16px', 
    fontWeight: '500',
    lineHeight: '20px'
  },
  detailValue: {
    fontSize: '16px', 
    fontWeight: '800',
    lineHeight: '24px'
  },
  tooltipValue: {
    fontSize: '16px', 
    fontWeight: '800',
    lineHeight: '24px', 
    cursor: 'pointer'
  },
  container: {
    width: '100%',
  },
  labelText: {
    color: '#666',
    marginBottom: '4px',
    fontSize: '14px',
  },
  boldText: {
    fontWeight: 'bold',
    fontSize: '16px',
  },
}));

const RULE_VALIDATION_MESSAGE ="Rule name already exists.";

const RuleReviewScreen = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [isLoading, setIsLoading] = useState(true); 
  const [previewColumns, setPreviewColumns] = useState([]);
  const [detailsReady, setDetailsReady] = useState(false);
  const [tempTableName, setTempTableName] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]); 
  const [deselectedRows, setDeselectedRows] = useState([]); 
  const [isAllSelected, setIsAllSelected] = useState(false); 
  const previewTableRef = useRef(null);
  
  const canTakeActionOnModules = (subModuleName, action) => {
    const permissions = props.inventorysmartModulesPermission;  
    const result = isActionAllowedOnSubModule(
      permissions,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
    
    return result;
  }; 

  useEffect(() => {
    if (props.isVisible) {
      fetchPreviewData();
    }
  }, [props.isVisible]);

  const fetchPreviewData = async () => {
    setIsLoading(true);
    setDetailsReady(false); 
    setTempTableName(null);
    
    try {
      let cols = [];
      cols = await getColumnsAg("table_name=Store_mapping_preview")();   
      setPreviewColumns(cloneDeep(cols));
      
      const payload = {};
      
      if (props.formData) {
        Object.entries(props.formData).forEach(([label, data]) => {
          if (data && data?.key && data?.key !== 'rule_name') {
            payload[data.key] = data.raw_value !== undefined ? data.raw_value : data.value;
          }
          if (data && data?.key && data?.key === 'rule_name') {
            payload[data.key] = data.value;
          }
        });
      }
      
      const response = await props.previewStoreTransferRule(payload);
      
      const errorMessage = response?.data?.message;
      if ((errorMessage || "").trim() === RULE_VALIDATION_MESSAGE) {
        displaySnackMessages(errorMessage, "error");
        setIsLoading(false);
        handleGoBack();
        return;
      }
      
      if (response?.data?.data?.table_name) {
        setTempTableName(response.data.data.table_name);
      }
      
      setTimeout(() => {
        setDetailsReady(true);
        setIsLoading(false);
      }, 300);
    } catch (error) {
      handleErrorMessage(error);
      setTimeout(() => {
        setDetailsReady(true);
        setIsLoading(false);
      }, 300);
    }
  };
  
  const handlePreviewTableDataFetch = async (body, pageIndex, params) => {
    try {
      setIsLoading(true);

      if (!tempTableName) {
        setIsLoading(false);
        return {
          data: [],
          totalCount: 0
        };
      }
      
      const requestBody = {
        meta: {
          ...body,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        table_name: tempTableName
      };
      
      const response = await props.viewPreviewStoreTransferRule(requestBody);
      
      if (response?.data?.data) {
        setIsLoading(false);
        return {
          data: response.data.data,
          totalCount: response.data.total
        };
      } else {
        setIsLoading(false);
        return {
          data: [],
          totalCount: 0
        };
      }
    } catch (error) {
      handleErrorMessage(error);
      setIsLoading(false);
      return {
        data: [],
        totalCount: 0
      };
    }
  };

  const handleErrorMessage = (e, defaultError = ERROR_MESSAGE) => {
    const errObj = e?.response?.data;
    let message = defaultError;
    if (errObj?.message) {
      message = errObj.message;
    } else if (errObj?.error) {
      message = errObj.error;
    } else if (e?.message) {
      message = e.message;
    }
    props.addSnack({
      message: message,
      options: {
        variant: "error",
      },
    });
  };

  const displaySnackMessages = (message, variant) => {
    props.addSnack({
      message: message,
      options: {
        variant: variant,
      },
    });
  };

  const handleGoBack = () => {
    setTempTableName(null);
    props.onClose();
  };

  const handleSubmit = async () => {
    if (!isAllSelected && selectedRows.length === 0) {
      displaySnackMessages("Please select at least one rule to save", "warning");
      return;
    }
    
    setIsLoading(true);
    setDetailsReady(false); 
    
    try {
      const ruleName = props.formData["Rule name"]?.value || "";
      const transferWithin = props.formData["Transfer type"]?.raw_value || "";
      const linkage_cluster = props.formData["Linkage cluster"]?.raw_value || "";
      const store_group_names = props.formData["Store group"]?.raw_value || ""; 
      
      const apiPayload = {
        rule_name: ruleName,
        transfer_within: transferWithin,
        linkage_cluster: linkage_cluster,
        store_group_names: store_group_names,
        table_name: tempTableName,
        meta: {
          search: [],
          range: [],
          sort: [],
          limit: { limit: 10, page: 1 }
        },
        is_all_records_selected: isAllSelected
      };
      
      if (isAllSelected) {
        apiPayload.excluded_rows = deselectedRows.map(row => row?.preview_rule_id);
        
        apiPayload.included_rows = selectedRows.map(row => {
          return {
            preview_rule_id: row?.preview_rule_id,
            priority: row?.priority,
            product_level_min_qty: row?.product_level_min_qty,
            overall_min_qty: row?.overall_min_qty
          };
        });
      } else {
        apiPayload.excluded_rows = [];
        apiPayload.included_rows = selectedRows.map(row => {
          return {
            preview_rule_id: row?.preview_rule_id,
            priority: row?.priority,
            product_level_min_qty: row?.product_level_min_qty,
            overall_min_qty: row?.overall_min_qty
          };
        });
      }
      
      const response = await props.createStoreTransferRule(apiPayload);
      
      if (response?.data?.status) {
        displaySnackMessages(response?.data?.message || "Store Transfer Rule created successfully", "success");
        props.onSuccess(); 
      } else {
        displaySnackMessages(response?.data?.message || "Failed to create Store Transfer Rule", "error");
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsLoading(false);
      setDetailsReady(true); 
    }
  };

  const getFormattedDetails = () => {
    const details = [];
    
    if (props.formData) {
      Object.entries(props.formData).forEach(([label, data]) => {
        if (data && data?.value !== null) {
          if (label === "Store group" && data.raw_value && Array.isArray(data.raw_value) && data.raw_value.length > 1) {
            const storeGroups = data.value.split(", ");
            const firstGroup = storeGroups[0];
            const remainingCount = storeGroups.length - 1;
            
            details.push({
              title: label,
              value: `${firstGroup} +${remainingCount}`,
              tooltip: data.value, 
              isStoreGroup: true
            });
          } else {
            details.push({
              title: label, 
              value: data.value
            });
          }
        }
      });
    }
    
    return details;
  };

  const handlePreviewTableCellValueChanged = (params) => {
    const { colDef, newValue, oldValue, node } = params;
    
    // Handle quantity fields validation (must be non-negative numbers)
    if (colDef.field === 'product_level_min_qty' || colDef.field === 'overall_min_qty') {
      const numValue = parseFloat(newValue);
      
      // Reject invalid or negative values
      if (isNaN(numValue) || numValue < 0) {
        displaySnackMessages(`${colDef.headerName} cannot be less than 0`, "error");
        
        // Stop editing and revert to old value
        setTimeout(() => {
          node.setDataValue(colDef.field, oldValue);
        }, 0);
        
        return;
      }
    }
    
    // Handle priority field validation (must be a positive integer)
    if (colDef.field === 'priority') {
      // Check if value is from dropdown (array with value property)
      if (Array.isArray(newValue) && newValue.length > 0) {
        const priorityValue = newValue[0].value;
        const numValue = parseInt(priorityValue, 10);
        
        // Reject non-integers or non-positive values
        if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
          displaySnackMessages(`${colDef.headerName} must be a positive integer`, "error");
          
          // Stop editing and revert to old value
          setTimeout(() => {
            node.setDataValue(colDef.field, oldValue);
          }, 0);
          
          return;
        }
      }
    }
  };

  const handlePreviewTableSelectionChanged = (params) => {
    const selectedNodes = params.api.getSelectedNodes();
    const selectedData = selectedNodes.map(node => node.data);
    setSelectedRows(selectedData);
    
    const checkConfiguration = previewTableRef.current?.api?.checkConfiguration;
    const isAllSelected = checkConfiguration && 
      checkConfiguration.length > 0 && 
      checkConfiguration[checkConfiguration.length - 1]?.checkAll;
    
    setIsAllSelected(isAllSelected);
    
    if (isAllSelected) {
      const deselectedNodes = params.api.getRenderedNodes()
        .filter(node => !node.selected);
      
      const deselectedData = deselectedNodes.map(node => ({
        preview_rule_id: node.data.preview_rule_id,
        src_store_id: node.data.src_store_id,
        dst_store_id: node.data.dst_store_id
      }));
      
      setDeselectedRows(deselectedData);
    } else {
      setDeselectedRows([]);
    }
  };


  const isSaveButtonDisabled = () => {
    if (isLoading) return true;
    
    const hasCreatePermission = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_RULE,
      "create"
    );

    return !hasCreatePermission;
  }

  return (
    <Loader loader={isLoading}>
      <div className={classes.container} style={{ minHeight: '600px' }}>        
        <div className={`${globalClasses.marginVertical}`} >
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {detailsReady && (
                <div className={classes.detailsCard}>
                  <div className={classes.editButtonContainer}>
                    <Button
                      variant="tertiary"
                      onClick={() => handleGoBack()}
                      icon={<ModeEditIcon />}
                    />
                  </div>
                  {getFormattedDetails().map((detail, index) => (
                    <div 
                      key={index} 
                      className={classes.detailItem}
                    >
                      <div className={`${classes.labelText} ${classes.detailLabel}`}>
                        {detail.title}
                      </div>
                      {detail.isStoreGroup ? (
                        <Tooltip title={detail.tooltip} placement="bottom" variant="tertiary">
                          <div className={`${classes.boldText} ${classes.tooltipValue}`}>
                            {detail.value || '-'}
                          </div>
                        </Tooltip>
                      ) : (
                        <div className={`${classes.boldText} ${classes.detailValue}`}>
                          {detail.value || '-'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Grid>
          </Grid>
        </div>
        
        {detailsReady && (
          <div className={globalClasses.marginVertical}>
            {previewColumns.length > 0 && (
              <AgGridComponent
                columns={previewColumns}
                manualCallBack={handlePreviewTableDataFetch}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                tableHeader="Review Store Mapping"
                rowSelection={"multiple"}
                selectAllHeaderComponent={true}
                onCellValueChanged={handlePreviewTableCellValueChanged}
                onSelectionChanged={handlePreviewTableSelectionChanged}
                loadTableInstance={(params) => { previewTableRef.current = params; }}
                uniqueRowId={"preview_rule_id"} 
              />
            )}
          </div>
        )}
        <div className={globalClasses.stickyFooter}>
          <Button
            variant="outlined"
            onClick={handleGoBack}
          >
            {"< Back to basic details"}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSaveButtonDisabled()}
          >
            Save store transfer rule
          </Button>
        </div>
      </div>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    createStoreTransferRule: (data) => dispatch(createStoreTransferRule(data)),
    previewStoreTransferRule: (data) => dispatch(previewStoreTransferRule(data)),
    viewPreviewStoreTransferRule: (data) => dispatch(viewPreviewStoreTransferRule(data)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(RuleReviewScreen);
