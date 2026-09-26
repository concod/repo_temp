import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import classnames from "classnames";
import { Dialog, DialogContent, Typography } from "@mui/material";
import { Button } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import {
  getProductMappingData,
  setInventorysmartCreateMappingPopupDataLoader,
  setInventorysmartCreateMappingPopupTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import Form from "core/Utils/form";
import {
  PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE,
  PRODUCT_SUPERSESSION_SELECT_STORE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cloneDeep } from "lodash";
import {
  GET_SUPERSESSION_PRIORITY_CHOICE_EDIT_TABLE_CONFIG,
  GET_SUPERSESSION_PRIORITY_CHOICE_VIEW_TABLE_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { getAllStores } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import theme from "core/Styles/theme";
import styles from "../index.module.scss";

const EditDatesAndPriorityPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const { choiceLabels, hideStoreException, mainChoicePriorityEditable } =
    props.inventorysmartScreenConfig?.inventorysmart_configuration
      ?.supersession || {};
  const mainChoiceLabel = choiceLabels?.main ?? PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE.main;
  const subChoiceLabel = choiceLabels?.sub ?? PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE.sub;

  const agGridInstance = useRef(null);
  const [render, setRender] = useState(false);
  const [mainChoiceId, setMainChoiceId] = useState("");
  const [formFields, setFormFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [
    productsPriorityReviewPopupData,
    setProductsPriorityReviewPopupData,
  ] = useState([]);
  const [
    productMappingPopupTableColumns,
    setProductMappingPopupTableColumns,
  ] = useState([]);
  const updatedMappings = useRef([]);
  const focusedTableCellValue = useRef(null);

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const fetchProductMappingPopupTableConfig = async () => {
    try {
      props.setInventorysmartCreateMappingPopupTableLoader(true);

      const payload = {
        tableConfigName: props?.isEditAllowed
          ? GET_SUPERSESSION_PRIORITY_CHOICE_EDIT_TABLE_CONFIG
          : GET_SUPERSESSION_PRIORITY_CHOICE_VIEW_TABLE_CONFIG,
      };

      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );
      let formattedColumns = agGridColumnFormatter(response?.data?.data);

      setProductMappingPopupTableColumns(formattedColumns);
      formatProductMappingData();
    } catch (error) {
      console.log("Error while fetching Table Config", error);
    } finally {
      props.setInventorysmartCreateMappingPopupTableLoader(false);
    }
  };

  const resetProductMappingPopupData = () => {
    setProductMappingPopupTableColumns([]);
    setProductsPriorityReviewPopupData([]);
    setFormData({});
    setRender(false);
  };

  useEffect(() => {
    getStoreData();
  }, []);

  useEffect(() => {
    if (props.active && !hideStoreException) {
      fetchProductMappingPopupTableConfig();
    } else {
      resetProductMappingPopupData();
    }
  }, [props.active, hideStoreException]);

  useEffect(() => {
    if(props.priorityMappingData && hideStoreException) {
      fetchProductMappingPopupTableConfig();
    }
  }, [props.priorityMappingData, hideStoreException]);

  const formatProductMappingData = () => {
    try {
      if (props?.priorityMappingData !== false) {
        if (props?.priorityMappingData?.priority?.length) {
          let priorityData = [];

          props?.priorityMappingData?.old_article.forEach((item, index) => {
            let subChoiceData = {
              choice_type: subChoiceLabel,
              priority: props?.priorityMappingData?.priority[index],
              old_article: item,
            };

            // To display main choice where its priority is editable
            if(mainChoicePriorityEditable && !props.isEditAllowed && !item) {
              subChoiceData.choice_type = mainChoiceLabel;
              subChoiceData.old_article = props?.priorityMappingData?.new_articles[0];
            }

            priorityData.push(subChoiceData);
          });

          let mainChoicePriority = priorityData.length + 1;

          if(mainChoicePriorityEditable) {
            const prioritySorted = cloneDeep(props?.priorityMappingData?.priority).sort((a, b) => a -b);
            let currentPriority = 1;

            for (const priority of prioritySorted) {
              if (currentPriority < priority) {
                break;
              }

              currentPriority++;
            }

            mainChoicePriority = currentPriority;
          }

          let mainChoiceData = {
            choice_type: mainChoiceLabel,
            priority: mainChoicePriority,
            old_article: props?.priorityMappingData?.new_articles[0],
          };

          // To disable main choice priority edit
          if (props?.isEditAllowed && !mainChoicePriorityEditable) {
            mainChoiceData.checkbox_disabled = true;
          }

          // To display main choice if it is not editable or if the table is read-only
          if(!mainChoicePriorityEditable || (props?.isEditAllowed && mainChoicePriorityEditable)) {
            priorityData.push(mainChoiceData);
          }

          setMainChoiceId(props?.priorityMappingData?.new_articles[0]);

          priorityData.map((data) => {
            updatedMappings.current.push(data);
          });

          setProductsPriorityReviewPopupData(priorityData);
        }
      } else {
        setProductsPriorityReviewPopupData([]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setRender(true);
    }
  };

  const getStoreData = async () => {
    let postBody = {
      filters: [],
      meta: {
        search: [],
        range: [],
        sort: [],
      },
    };
    let storeResponse = await props.getAllStores(postBody);
    let storeData = cloneDeep(PRODUCT_SUPERSESSION_SELECT_STORE);

    storeData["options"] = storeResponse?.data?.data?.map((item) => {
      return {
        id: item.store_code,
        label: item.store_code,
        description: item.store_description,
        value: item.store_code,
        channel: item.channel,
        s1_name: item.s1_name,
      };
    });

    setFormFields([storeData]);
  };

  const handleStoreChange = (data) => {
    setFormData(data);
  };

  const onCellFocused = (_e) => {
    let selectedCol = _e.column.colId;
    let selectedVal = null;
    let selectedRowIndex = _e.rowIndex;

    agGridInstance.current.api.forEachNode((node, index) => {
      if (index === selectedRowIndex) {
        selectedVal = node.data[selectedCol];
        focusedTableCellValue.current = selectedVal;
      }
    });
  };

  const onBlur = (_e, data, column, isChanged, value, _initialValue) => {
    if (isChanged) {
      let maxPriority = props?.priorityMappingData?.priority?.length + (mainChoicePriorityEditable ? 1 : 0);

      if (value === "" || value <= 0 || value > maxPriority) {
        agGridInstance.current.api.forEachNode((node) => {
          if (data.old_article === node.data?.old_article) {
            node.data.priority = focusedTableCellValue.current;

            agGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
            });
          }
        });
      } else {
        agGridInstance.current.api.forEachNode((node) => {
          if (
            data.old_article !== node.data?.old_article &&
            data.priority === node.data?.priority &&
            (mainChoicePriorityEditable || data.choice_type !== mainChoiceLabel)
          ) {
            node.data.priority = focusedTableCellValue.current;

            agGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
            });
          }
        });
      }
    }
  };

  const saveExceptions = () => {
    let storeNames = [];

    formData?.select_store_options?.map((store) => {
      storeNames.push(store.value);
    });

    if (props?.isSelectStoreDisplayed && storeNames.length === 0) {
      displaySnackMessages("Please select a Store before saving", "info");
    } else {
      if (productsPriorityReviewPopupData?.length > 0) {
        let updated_old_articles = [];
        let updated_new_articles = [];
        let updated_priority = [];

        agGridInstance.current.api.forEachNode((node) => {
          if (subChoiceLabel === node?.data?.choice_type) {
            updated_priority.push(node?.data?.priority);
            updated_old_articles.push(node?.data?.old_article);
          } else updated_new_articles.push(node?.data?.old_article);
        });

        let updated_products = [
          {
            old_article: updated_old_articles,
            new_articles: updated_new_articles,
            priority: updated_priority,
            store: props?.priorityMappingData?.store,
          },
        ];

        if (props?.isSelectStoreDisplayed)
          props.updatePriorityExceptions(updated_products, true, storeNames);
        else props.updatePriorityExceptions(updated_products, false);
      }
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return props.active ? (
    <Dialog
      id="storeInventoryDialog"
      aria-labelledby="store-invenotry-dialog"
      open={props.active}
      maxWidth="md"
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }

        props.closeModal();
      }}
      classes={{
        paperFullWidth: classes.paperFullWidth,
      }}
    >
      <DialogContent
        dividers
        classes={{
          root: classnames(
            classes.dialogContentRoot,
            globalClasses.flexRow,
            globalClasses.layoutAlignBetweenCenter,
            globalClasses.overflowHidden
          ),
        }}
      >
        <Typography classes={{ root: globalClasses.moduleTitle }}>
          {props?.dialogTitle}
        </Typography>
        <IconButton color="primary" onClick={props.closeModal} size="large">
          <CloseIcon fontSize="medium" />
        </IconButton>
      </DialogContent>
      <DialogContent
        classes={{
          root: classnames(
            globalClasses.dialogContentBody,
            globalClasses.paddingHorizontal
          ),
        }}
        className={classnames(styles["pt-1rem"], styles["mb-0"])}
      >
        <Loader
          loader={
            props.inventorysmartCreateMappingPopupDataLoader ||
            props.inventorysmartCreateMappingPopupTableLoader
          }
          minHeight={"350px"}
        >
          {render && (
            <div>
              <div className={globalClasses.marginBottom}>
                <Typography
                  classes={{ root: globalClasses.dialogTitle }}
                  className={styles["pt-0"]}
                >
                  {!props?.hideSelectedStoreName && !props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.supersession?.hideStoreException && (
                    <span className={styles["mr-3rem"]}>
                      Store Name : {props?.priorityMappingData?.store}
                    </span>
                  )}
                  {props?.isEditAllowed && (
                    <span> {mainChoiceLabel} : {mainChoiceId} </span>
                  )}
                </Typography>
              </div>
              {props?.isSelectStoreDisplayed && (
                <div className={globalClasses.marginBottom}>
                  {formFields.length > 0 && (
                    <Form
                      maxFieldsInRow={3}
                      layout={"vertical"}
                      handleChange={handleStoreChange}
                      fields={formFields}
                      updateDefaultValue={true}
                      defaultValues={{}}
                    ></Form>
                  )}
                </div>
              )}
              <AgGridComponent
                columns={productMappingPopupTableColumns}
                uniqueRowId={"old_article"}
                rowdata={productsPriorityReviewPopupData}
                onCellFocused={onCellFocused}
                onBlur={onBlur}
                pagination={false}
                loadTableInstance={loadAlertsTableInstance}
                getRowStyle={(params) => {
                  if (params?.data?.checkbox_disabled) {
                    return {
                      pointerEvents: "none",
                      background: theme.palette.colours.disabledBackground,
                    };
                  }
                }}
              />
              <div
                className={classnames(
                  classes.buttonGroupWrapper,
                  globalClasses.marginAround
                )}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  className={classes.button}
                  onClick={() => props.closeModal()}
                >
                  Cancel
                </Button>
                {props?.isEditAllowed && (
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    onClick={saveExceptions}
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
          )}
        </Loader>
      </DialogContent>
    </Dialog>
  ) : null;
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .selectedFilters,
    inventorysmartCreateMappingPopupTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateMappingPopupTableLoader,
    inventorysmartCreateMappingPopupDataLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionCreateMappingService
        .inventorysmartCreateMappingPopupDataLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  getProductMappingData: (payload) => dispatch(getProductMappingData(payload)),
  setInventorysmartCreateMappingPopupTableLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingPopupTableLoader(payload)),
  setInventorysmartCreateMappingPopupDataLoader: (payload) =>
    dispatch(setInventorysmartCreateMappingPopupDataLoader(payload)),
  getAllStores: (payload) => dispatch(getAllStores(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditDatesAndPriorityPopup);
