import React, { useState, useEffect, useRef,useMemo } from "react";
import { connect } from "react-redux";
import { BottomSheet, Button } from "impact-ui-v3";
import {
  getBottomSheetGridProps,
  getBottomSheetModalHeight,
  BottomSheetFooter,
  bottomSheetGridContentStyle,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
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
import { cloneDeep, isEmpty } from "lodash";

import {
  GET_SUPERSESSION_PRIORITY_CHOICE_EDIT_TABLE_CONFIG,
  GET_SUPERSESSION_PRIORITY_CHOICE_VIEW_TABLE_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { getStore } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import theme from "core/Styles/theme";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const EditDatesAndPriorityPopup = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

const CHOICE_TYPE = useMemo(() => {
    const configChoiceType = props?.productSupersessionModuleConfig?.choice_type;
    return {
      column_name: PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE.column_name,
      sub: configChoiceType?.sub || PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE.sub,
      main: configChoiceType?.main || PRODUCT_SUPERSESSION_PRIORITY_CHOICE_TYPE.main,
    };
  }, [props.productSupersessionModuleConfig]);

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
      // Right-align the Priority column values
      formattedColumns = formattedColumns.map((col) => {
        if ((col.field || col.column_name || "").toLowerCase() === "priority") {
          if (typeof col.cellStyle === "function") {
            const prevStyle = col.cellStyle;
            return {
              ...col,
              cellStyle: (params) => ({
                ...prevStyle(params),
                textAlign: "right",
              }),
            };
          }
          return {
            ...col,
            cellStyle: { ...col.cellStyle, textAlign: "right" },
          };
        }
        return col;
      });
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
    if (props?.isSelectStoreDisplayed) {
      if (!props?.isVersion3) {
        getStoreData();
      } else {
        getBandData();
      }
    }
  }, [props?.isVersion3, props.isSelectStoreDisplayed]);

  useEffect(() => {
    if (props.active) {
      fetchProductMappingPopupTableConfig();
    } else {
      resetProductMappingPopupData();
    }
  }, [props.active]);

  const formatProductMappingData = () => {
    try {
      if (props?.priorityMappingData !== false) {
        if (props?.priorityMappingData?.priority?.length) {
          let priorityData = [];
          props?.priorityMappingData?.old_article.forEach((item, index) => {
            let subChoiceData = {
              choice_type: CHOICE_TYPE.sub,
              priority: props?.priorityMappingData?.priority[index],
              old_article: item,
            };
            if (props?.priorityMappingData?.old_style_colour_ids) {
              subChoiceData.old_style_colour_ids = props.priorityMappingData.old_style_colour_ids[index];
            } else if (props?.priorityMappingData?.old_style_color_ids) {
              subChoiceData.old_style_colour_ids = props.priorityMappingData.old_style_color_ids[index];
            }
            if (props?.priorityMappingData?.new_style_colour_ids) {
              subChoiceData.new_style_colour_ids = props.priorityMappingData.new_style_colour_ids[index];
            } else if (props?.priorityMappingData?.new_style_color_ids) {
              subChoiceData.new_style_colour_ids = props.priorityMappingData.new_style_color_ids[index];
            }
            if (props?.priorityMappingData?.new_articles) {
              subChoiceData.new_articles = props.priorityMappingData.new_articles[index];
            }
            priorityData.push(subChoiceData);
          });
          let maxPriority = Math.max(
            ...props?.priorityMappingData?.priority.map(Number)
          );
          let mainChoiceData = {
            choice_type: CHOICE_TYPE.main,
            priority: maxPriority + 1,
            old_article: props?.priorityMappingData?.new_articles[0],
          };
          if (props?.priorityMappingData?.new_style_colour_ids) {
            mainChoiceData.new_style_colour_ids = props.priorityMappingData.new_style_colour_ids[0];
            mainChoiceData.old_style_colour_ids = props.priorityMappingData.new_style_colour_ids[0];
          } else if (props?.priorityMappingData?.new_style_color_ids) {
            mainChoiceData.new_style_colour_ids = props.priorityMappingData.new_style_color_ids[0];
            mainChoiceData.old_style_colour_ids = props.priorityMappingData.new_style_color_ids[0];
          }
          if (props?.priorityMappingData?.new_articles) {
            mainChoiceData.new_articles = props.priorityMappingData.new_articles[0];
          }
          if (props?.isEditAllowed) {
            mainChoiceData.checkbox_disabled = true;
          }
          priorityData.push(mainChoiceData);
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
    let storeResponse = await props.getStore(postBody);
    let storeData = cloneDeep(PRODUCT_SUPERSESSION_SELECT_STORE);
    storeData["options"] = storeResponse?.data?.data?.map((item) => {
      return {
        id: item.store_code,
        label: item.store_code,
        description: item.store_description,
        value: item.store_code,
        channel: item.channel,
        s1_name: item.s1_name,
        labelOrientation: "left",
      };
    });
    setFormFields([storeData]);
  };

  const getBandData = async () => {
    let body = {
      attributes: [
        {
          attribute_name: "psa_name",
          dimension: "product_store",
          filter_type: "cascaded",
        },
      ],
      filter_type: "cascaded",
      filters: [],
      is_urm_filter: true,
      screen_name: "Report Lost Sales",
      application_code: 1,
    };
    const response = await getCombinedCrossDimensionFiltersData(body)();
    let band_list = [];
    if (response?.data?.data?.psa_name.length > 0) {
      response?.data?.data?.psa_name.map((thisVal) => {
        if (!props.existingStoreExceptions.includes(thisVal)) {
          band_list.push({
            label: thisVal,
            value: thisVal,
            id: thisVal,
          });
        }
      });
    }
    const PriorityTableSelectDropdownLabel= props?.productSupersessionModuleConfig?.editPriorityTableLabel
    let bandFields = [
      {
        label: PriorityTableSelectDropdownLabel || "Band",
        field_type: "list",
        options: band_list,
        required: false,
        accessor: "select_store_options",
        is_clearable: true,
        filter_type: "cascaded",
        labelOrientation: "left",
        placeholder: `Select ${PriorityTableSelectDropdownLabel ? PriorityTableSelectDropdownLabel : "Band"}`,
      },
    ];
    setFormFields(bandFields);
  };

  const handleStoreChange = (data) => {
    setFormData(data);
  };

  const onCellFocused = (_e) => {
    let selectedCol = _e.column.colId;
    if (selectedCol !== "priority") {
      return;
    }
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
      let maxPriority = props?.priorityMappingData?.priority?.length;
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
            data.choice_type !== CHOICE_TYPE.main
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
    if (!props?.isVersion3) {
      formData?.select_store_options?.map((store) => {
        storeNames.push(store.value);
      });
    } else {
      if (!isEmpty(formData)) {
        storeNames.push(formData?.select_store_options);
      }
    }

    if (props?.isSelectStoreDisplayed && storeNames.length === 0) {
      displaySnackMessages("Please select a Store before saving", "info");
    } else {
      if (productsPriorityReviewPopupData?.length > 0) {
        let updated_old_articles = [];
        let updated_new_articles = [];
        let updated_priority = [];
        agGridInstance.current.api.forEachNode((node) => {
          if (
            CHOICE_TYPE.sub ===
            node?.data?.choice_type
          ) {
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
            ...(props?.priorityMappingData?.old_style_colour_ids && {
              old_style_colour_ids: props.priorityMappingData.old_style_colour_ids,
            }),
            ...(props?.priorityMappingData?.new_style_colour_ids && {
              new_style_colour_ids: props.priorityMappingData.new_style_colour_ids,
            }),
            ...(props?.priorityMappingData?.old_style_color_ids && {
              old_style_color_ids: props.priorityMappingData.old_style_color_ids,
            }),
            ...(props?.priorityMappingData?.new_style_color_ids && {
              new_style_color_ids: props.priorityMappingData.new_style_color_ids,
            }),
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

  function getTableHeader() {
    if (!props?.hideSelectedStoreName) {
      const editPriorityTableLabel = props?.productSupersessionModuleConfig?.editPriorityTableLabel || "Store Name";
      // Check for both 'store' and 'channel' fields since different data sources may use different field names
      const storeName = props?.priorityMappingData?.store || props?.priorityMappingData?.channel;
      // Decode special characters like __ia_char_13 (represents & or other special chars)
      return `${editPriorityTableLabel} : ${storeName ? replaceSpecialCharacter(storeName) : ''}`;
    } else {
      const headerKey = props?.productSupersessionModuleConfig?.priority_popup_header_key;
      const headerValue = headerKey && props?.clickedPriorityData?.[0]?.[headerKey]
        ? props.clickedPriorityData[0][headerKey]
        : mainChoiceId;
      return `${itemLabel} ${headerValue}`;
    }
  }
  const itemLabel = props?.productSupersessionModuleConfig?.priority_popup_table_label || (props?.isVersion3 ? "New SKU ID :" : "Main Style ID :");
  const priorityRowCount = productsPriorityReviewPopupData?.length;
  const prioritySheetHeight = getBottomSheetModalHeight(priorityRowCount);

  return props.active ? (
    <BottomSheet
      open={props.active}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        props.closeModal();
      }}
      title={props?.dialogTitle}
      withExpandIcon={false}
      maxHeight="calc(100vh - 64px)"
      {...(prioritySheetHeight ? { height: prioritySheetHeight } : {})}
      footerOptions={
        <BottomSheetFooter
          onCancel={() => props.closeModal()}
          primaryButton={
            props?.isEditAllowed ? (
              <Button variant="primary" onClick={saveExceptions}>
                Save
              </Button>
            ) : null
          }
        />
      }
    >
      <div style={bottomSheetGridContentStyle}>
        <Loader
          loader={
            props.inventorysmartCreateMappingPopupDataLoader ||
            props.inventorysmartCreateMappingPopupTableLoader
          }
          minHeight="0"
        >
          {render && (
            <AgGridComponent
              tableHeader={getTableHeader()}
              columns={productMappingPopupTableColumns}
              uniqueRowId={"old_article"}
              rowdata={productsPriorityReviewPopupData}
              onCellFocused={onCellFocused}
              onBlur={onBlur}
              pagination={false}
              loadTableInstance={loadAlertsTableInstance}
              cardContainer={false}
              hideTableSetting
              {...getBottomSheetGridProps(priorityRowCount)}
              getRowStyle={(params) => {
                if (params?.data?.checkbox_disabled) {
                  return {
                    pointerEvents: "none",
                    background: theme.palette.colours.disabledBackground,
                  };
                }
              }}
              topRightOptions={
                props?.isSelectStoreDisplayed && (
                  <div>
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
                )
              }
            />
          )}
        </Loader>
      </div>
    </BottomSheet>
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
    productSupersessionModuleConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .productSupersessionModuleConfig,
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
  getStore: (payload) => dispatch(getStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditDatesAndPriorityPopup);
