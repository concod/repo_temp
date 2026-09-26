import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import classnames from "classnames";
import Select from "core/commonComponents/filters/Select/Select";
import { Switch, FormGroup, FormControlLabel, Grid } from "@mui/material";
import {
  NO_UPDATE,
  common,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import { getProductSupersessionSummaryTableConfig } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-summary-service";
import {
  getProductMappingReviewData,
  saveProductMappingReviewData,
  setInventorysmartReviewMappingDataLoader,
  setInventorysmartReviewMappingTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-review-mapping-service";
import ReviewSKULevelSizeMappingPopup from "./ReviewSKULevelSizeMappingPopup";
import ReviewSKULevelMappingViewPopup from "./ReviewSKULevelMappingViewPopup";
import {
  CONFIRM_REVIEW_SUPERSESSION_MAPPING,
  GO_BACK_MESSAGE_SUPERSESSION,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  CONFIGURATION,
  CREATE_NEW_PRODUCT_MAPPING,
} from "../../../../constants-inventorysmart/routesConstants";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt, Button } from "impact-ui-v3";
import ProductPriorityPopup from "./ProductPriorityPopup";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";

const ReviewSKULevelMapping = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);
  const [renderSKULevelMappingTable, setRenderSKULevelMappingTable] = useState(
    false
  );
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [selectedBand, setSelectedBands] = useState([]);
  const [bandList, setBandList] = useState([]);
  const [priorityCheck, setPriority] = useState(false);
  const [
    showReviewConfirmationDialog,
    setshowReviewConfirmationDialog,
  ] = useState(false);
  const [
    productsMappingReviewColumnConfig,
    setProductsMappingReviewColumnConfig,
  ] = useState([]);
  const [productsMappingReviewData, setProductsMappingReviewData] = useState(
    []
  );
  const [defaultPriorityMap, setDefaultPriorityMap] = useState([]);
  const [
    openProductMappingViewOnlyDialog,
    setOpenProductMappingViewOnlyDialog,
  ] = useState(false);
  const [openProductMappingDialog, setOpenProductMappingDialog] = useState(
    false
  );
  const [sizeMappingData, setSizeMappingData] = useState(null);
  const [
    priorityOrderCountByArticle,
    setPriorityOrderCountByArticle,
  ] = useState(null);

  const [clickedPriorityData, setClickedPriorityData] = useState(false);
  const [
    isPriorityMappingDialogActive,
    setIsPriorityMappingDialogActive,
  ] = useState(false);

  const openPriorityMappingViewOnlyPopUp = () => {
    setIsPriorityMappingDialogActive(true);
  };

  const closePriorityMappingViewOnlyPopUp = () => {
    setIsPriorityMappingDialogActive(false);
  };

  const editPriorityMapping = () => {
    closePriorityMappingViewOnlyPopUp();
  };

  const openProductMappingViewOnlyPopUp = () => {
    setOpenProductMappingViewOnlyDialog(true);
  };

  const closeProductMappingViewOnlyPopUp = () => {
    setSizeMappingData(null);
    setOpenProductMappingViewOnlyDialog(false);
  };

  const openProductMappingPopUp = () => {
    setOpenProductMappingDialog(true);
  };

  const closeProductMappingPopUp = () => {
    setSizeMappingData(null);
    setOpenProductMappingDialog(false);
  };

  const toggleReviewSKULevelMappingPopup = (data) => {
    setSizeMappingData(data);
    openProductMappingViewOnlyPopUp();
  };

  const editSKULevelMapping = () => {
    setOpenProductMappingViewOnlyDialog(false);
    openProductMappingPopUp();
  };

  const reviewSKULevelMappingActionMap = {
    mapped_sizes: toggleReviewSKULevelMappingPopup,
  };

  const saveProductMapping = async () => {
    try {
      let isSomePriorityEmpty = false;
      props.setInventorysmartReviewMappingDataLoader(true);

      let effectiveDate = new Date();
      const data = productsMappingReviewData
        ?.filter((mapping) => {
          return (
            (mapping?.new_size?.length && mapping?.old_size?.length) ||
            props?.inventorysmart_product_supersession_v3
          );
        })
        .map((mapping, index) => {
          const formattedMapping = {
            new_article: mapping.new_article,
            old_article: mapping.old_article,
            new_product_code: mapping.new_product_code,
            old_product_code: mapping.old_product_code,
            priority: mapping?.priority?.[0]?.value,
            old_l0_name: mapping.old_l0_name,
            old_l1_name: mapping.old_l1_name,
            old_l2_name: mapping.old_l2_name,
            old_l3_name: mapping.old_l3_name,
            old_l4_name: mapping.old_l4_name,
            old_style_color_id: mapping.old_style_color_id,
            old_product_description: mapping.old_product_description,
            old_size: mapping.old_size,
          };

          if (mapping.effective_date) {
            effectiveDate = mapping.effective_date;
          }
          if (props?.inventorysmart_product_supersession_v3) {
            formattedMapping.start_date = mapping.start_date;
            formattedMapping.end_date = mapping.end_date;

            if (mapping.priority) {
              if (Array.isArray(mapping?.priority))
                formattedMapping.priority = mapping.priority?.[0]?.value;
              else formattedMapping.priority = mapping.priority;
            }

            if (mapping?.has_store_exception) {
              formattedMapping.store = mapping.store;
              formattedMapping.store_priority = mapping.store_priority;
              formattedMapping.has_store_exception = true;
            } else {
              formattedMapping.has_store_exception = false;
              formattedMapping.store = [];
              formattedMapping.store_priority = [];
            }
          } else {
            formattedMapping.old_size_name = mapping.old_size_name;
          }
          return formattedMapping;
        });

      data.forEach((mapping) => {
        if (!mapping.priority) {
          if (!isSomePriorityEmpty) {
            isSomePriorityEmpty = true;
          }
        }
      });
      if (isSomePriorityEmpty) {
        displaySnackMessages("Mapping Priority Order Is Missing", "error");
        return;
      }

      let updatedData = [];
      if (props?.inventorysmart_product_supersession_v3) {
        updatedData = data.filter(
          (mapping) =>
            mapping.new_product_code.length > 0 ||
            mapping.old_product_code.length > 0
        );
      }

      const payload = {
        mappings: props?.inventorysmart_product_supersession_v3
          ? updatedData
          : data,
        effective_date: !props?.inventorysmart_product_supersession_v3
          ? effectiveDate
          : undefined,
      };

      if (props?.inventorysmart_product_supersession_v3) {
        payload.mappings.forEach((thisData) => {
          thisData.old_size = undefined;
        });
        if (priorityCheck && selectedBand) {
          payload.mappings.forEach((thisMap) => {
            thisMap.store = [selectedBand[0].value];
            thisMap.store_priority = [thisMap.priority];
            console.log(defaultPriorityMap[thisMap.old_article]);
            thisMap.priority = defaultPriorityMap[thisMap.old_article];
            thisMap.has_store_exception = true;
          });
        }
      }
      if (payload?.mappings?.length) {
        let response = await props.saveProductMappingReviewData(payload);

        if (response.data?.status) {
          displaySnackMessages(
            "Mapping has been updated successfully",
            "success"
          );
          setTimeout(() => {
            props.history.push({
              pathname: CONFIGURATION,
              state: CREATE_NEW_PRODUCT_MAPPING,
            });
          }, 1000);
        }
      } else {
        displaySnackMessages(NO_UPDATE, "info");
      }
    } catch (err) {
      props.handleErrorMessage(err);
    } finally {
      setshowReviewConfirmationDialog(false);
      props.setInventorysmartReviewMappingDataLoader(false);
    }
  };

  const formatProductMappingData = (data, selections) => {
    const orderCountByNewArticle = {};

    const formattedData = data?.map((mapping, index) => {
      const sizesLength = mapping?.new_size?.length;
      mapping.index = index;

      const mappedSelection = selections.find(
        (mappedProduct) => mappedProduct.new_article === mapping.new_article
      );

      mapping.mapped_sizes = sizesLength;
      if (mapping.new_product_code_all && mapping.new_size_name_all) {
        let l_new_size_name = [];

        for (let i = 0; i < mapping.new_product_code?.length; i++) {
          let index = mapping.new_product_code_all.indexOf(
            mapping.new_product_code[i]
          );

          l_new_size_name.push(mapping.new_size_name_all[index]);
        }

        mapping.new_size_name = [...l_new_size_name];
      }

      if (mappedSelection) {
        mapping.effective_date = mappedSelection.effective_date;
      }

      if (orderCountByNewArticle?.[mapping?.new_article]) {
        mapping.priority = [
          {
            label: orderCountByNewArticle?.[mapping?.new_article] + 1,
            value: orderCountByNewArticle?.[mapping?.new_article] + 1,
          },
        ];

        orderCountByNewArticle[mapping?.new_article] =
          orderCountByNewArticle[mapping?.new_article] + 1;
      } else {
        mapping.priority = [
          {
            label: 1,
            value: 1,
          },
        ];

        orderCountByNewArticle[mapping?.new_article] = 1;
      }

      mapping.priority_order_options =
        priorityOrderCountByArticle?.[mapping?.new_article] || mapping.priority;
      return mapping;
    });

    return formattedData;
  };

  const fetchProductMappingReviewTableConfig = async () => {
    try {
      props.setInventorysmartReviewMappingTableLoader(true);
      const payload = {
        tableConfigName: "product-supersession-sku-view-summary",
      };
      let response = await props.getProductSupersessionSummaryTableConfig(
        payload
      );

      const columns = response?.data?.data?.map((column) => {
        if (column.type === "dynamic-list") {
          column.extra.onChangeCustomFunction = true;
        }
        return column;
      });

      let formattedColumns = agGridColumnFormatter(
        columns,
        null,
        reviewSKULevelMappingActionMap
      );
      setProductsMappingReviewColumnConfig(formattedColumns);
    } catch (error) {
      console.log("Something went wrong", error);
    } finally {
      props.setInventorysmartReviewMappingTableLoader(false);
    }
  };

  const fetchProductMappingReviewData = async () => {
    try {
      props.setInventorysmartReviewMappingDataLoader(true);

      let mappings = props?.modifiedProductMapping?.map((productMapping) => {
        return {
          new_article: productMapping.new_article,
          old_article: productMapping.article,
          start_date: productMapping?.start_date,
          end_date: productMapping?.end_date,
        };
      });

      let body = {
        mappings,
      };

      let response = await props.getProductMappingReviewData(body);
      let mappedProductData = formatProductMappingData(
        response?.data?.data,
        props?.modifiedProductMapping
      );

      if (props?.inventorysmart_product_supersession_v3 && mappings) {
        for (let i = 0; i < mappedProductData.length; i++) {
          let index = mappings?.findIndex(
            (obj) =>
              obj.new_article === mappedProductData[i].new_article &&
              obj.old_article === mappedProductData[i].old_article
          );
          if (index !== -1) {
            mappedProductData[i].start_date = mappings[index].start_date;
            mappedProductData[i].end_date = mappings[index].end_date;
            mappedProductData[i].priority_action = "Add Priority";
          }
        }
      }

      setProductsMappingReviewData(mappedProductData);
      let clonedDefaultData = mappedProductData;
      let priorityMapper = {};
      clonedDefaultData.forEach((thisMap) => {
        priorityMapper[thisMap.old_article] = thisMap.priority[0].value;
      });
      setDefaultPriorityMap(priorityMapper);
    } finally {
      setRenderSKULevelMappingTable(true);
      props.setInventorysmartReviewMappingDataLoader(false);
    }
  };

  const updatePriorityOptionsOnSelectionChangeHandler = async (
    cellNode,
    _colId,
    _p_colType,
    e
  ) => {
    const newArticleId = cellNode?.data?.new_article;
    const oldArticleId = cellNode?.data?.old_article;
    const newPriorityOrder = e?.value;
    const selectedPriorityOrders = [];

    agGridInstance.current.api.forEachNode((item) => {
      const rowData = item.data;
      if (
        rowData?.new_article === newArticleId &&
        rowData?.old_article !== oldArticleId &&
        rowData?.priority?.length > 0 &&
        rowData?.priority?.[0]?.value
      ) {
        selectedPriorityOrders.push(rowData?.priority?.[0]?.value);
      }
    });

    if (e?.value && selectedPriorityOrders.indexOf(e?.value) === -1) {
      selectedPriorityOrders.push(e?.value);
    }

    const rowsToUpdate = [];
    agGridInstance.current.api.forEachNode((item) => {
      const rowData = item.data;

      if (rowData?.new_article === newArticleId) {
        const currentOrder =
          rowData?.old_article === oldArticleId
            ? newPriorityOrder
            : rowData?.priority?.[0]?.value;

        rowData.priority_order_options = priorityOrderCountByArticle?.[
          newArticleId
        ].filter((order) => {
          return (
            selectedPriorityOrders.indexOf(order?.value) === -1 ||
            order?.value === currentOrder
          );
        });
        rowsToUpdate.push(rowData);
      }
    });

    await agGridInstance?.current?.api?.refreshCells({ update: rowsToUpdate });
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const generatePriorityOrderOptionsByArticles = (articles) => {
    const priorityOptions = {};

    articles.forEach((article) => {
      if (!priorityOptions?.[article.new_article]) {
        priorityOptions[article.new_article] = 1;
      } else {
        priorityOptions[article.new_article] += 1;
      }
    });

    Object.keys(priorityOptions)?.forEach((key) => {
      priorityOptions[key] = [...Array(priorityOptions?.[key])].map(
        (elem, index) => {
          return {
            label: index + 1,
            value: index + 1,
          };
        }
      );
    });

    setPriorityOrderCountByArticle(priorityOptions);
  };

  useEffect(() => {
    if (!isEmpty(priorityOrderCountByArticle)) {
      fetchProductMappingReviewTableConfig();
      fetchProductMappingReviewData();
    }
  }, [priorityOrderCountByArticle]);

  useEffect(() => {
    const onLoad = async () => {
      if (props?.inventorysmart_product_supersession_v3) {
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
        let band_list;
        if (response?.data?.data?.psa_name.length > 0) {
          band_list = response?.data?.data?.psa_name.map((thisVal) => {
            return {
              label: thisVal,
              value: thisVal,
              id: thisVal,
            };
          });
          setBandList(band_list);
        }
      }
    };
    onLoad();
  }, [props.inventorysmart_product_supersession_v3]);

  useEffect(() => {
    if (!isEmpty(props.modifiedProductMapping)) {
      generatePriorityOrderOptionsByArticles(props.modifiedProductMapping);
    }
  }, [props.modifiedProductMapping]);

  const onClickColumn = async (data, column) => {
    let clickedData = data;
    let clickedDataArray = [];
    if (column.column_name === "priority_action") {
      clickedData.action = "Add Priority";
      clickedDataArray.push(clickedData);
      openPriorityMappingViewOnlyPopUp();
    } else {
      clickedData.action = "Mapped Sizes";
      openProductMappingViewOnlyPopUp();
    }
    setClickedPriorityData(clickedDataArray);
    setSizeMappingData(clickedData);
  };

  const updatePriorityMapping = (updatedPriority) => {
    let updatedProductsMappingReviewData = [...productsMappingReviewData];
    updatedProductsMappingReviewData?.map((data) => {
      let index = updatedPriority.findIndex(
        (article) => article.articleName === data.old_article
      );
      data.priority = updatedPriority[index].defaultPriority;
      if (updatedPriority[index]?.has_store_exception) {
        data.store = updatedPriority[index].stores;
        data.store_priority = updatedPriority[index].storesPriority;
        data.has_store_exception = updatedPriority[index].has_store_exception;
      }
    });
    setProductsMappingReviewData(updatedProductsMappingReviewData);
  };

  const handleSelectBand = (val, options) => {
    setSelectedBands(options);
  };
  return (
    <div className={globalClasses.marginVertical1rem}>
      {props?.inventorysmart_product_supersession_v3 &&
        !props.disablePriorityToggle && (
          <Grid container style={{ marginBottom: "20px" }}>
            <Grid item sx={2.5} md={2.5} lg={2.5}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={priorityCheck}
                      onChange={() => {
                        setPriority(!priorityCheck);
                      }}
                    />
                  }
                  label="Set Priority for Store Bands"
                />
              </FormGroup>
            </Grid>
            {priorityCheck && (
              <Grid item sx={2} md={2} lg={2}>
                <Select
                  id="bands"
                  initialData={bandList}
                  selectedOptions={selectedBand}
                  isSearchable={true}
                  dependency={[]}
                  updateDependency={(e, options) =>
                    handleSelectBand(e, options)
                  }
                  isDisabled={false}
                  is_multiple_selection={false}
                />
              </Grid>
            )}
          </Grid>
        )}

      <>
        <Loader
          loader={
            props.inventorysmartReviewMappingTableLoader ||
            props.inventorysmartReviewMappingDataLoader
          }
          minHeight={"188px"}
        >
          {renderSKULevelMappingTable && (
            <AgGridComponent
              tableHeader="Details"
              columns={productsMappingReviewColumnConfig}
              rowdata={productsMappingReviewData}
              uniqueRowId={"index"}
              callBackOnChangeCustomFunction={
                updatePriorityOptionsOnSelectionChangeHandler
              }
              loadTableInstance={loadAlertsTableInstance}
              pagination={true}
            />
          )}
        </Loader>

        <ReviewSKULevelSizeMappingPopup
          active={openProductMappingDialog}
          openModal={openProductMappingPopUp}
          closeModal={closeProductMappingPopUp}
          sizeMappingData={sizeMappingData}
          agGridInstance={agGridInstance}
        />

        <ReviewSKULevelMappingViewPopup
          active={openProductMappingViewOnlyDialog}
          openModal={openProductMappingViewOnlyPopUp}
          closeModal={closeProductMappingViewOnlyPopUp}
          sizeMappingData={sizeMappingData}
          editSKULevelMapping={editSKULevelMapping}
          agGridInstance={agGridInstance}
          isEditAllowed={true}
        />

        <ProductPriorityPopup
          active={
            clickedPriorityData.length > 0
              ? isPriorityMappingDialogActive
              : false
          }
          openModal={openPriorityMappingViewOnlyPopUp}
          closeModal={closePriorityMappingViewOnlyPopUp}
          editSKULevelMapping={editPriorityMapping}
          clickedPriorityData={clickedPriorityData}
          updatePriorityMapping={updatePriorityMapping}
          isEditAllowed={true}
          parentAgGridInstance={agGridInstance}
        />

        <Grid gap={2} className={`${globalClasses.stickyFooter}`}>
          <Button
            variant="tertiary"
            onClick={() => setShowGoBackDialog(true)}
            sx={{ marginRight: "8px" }}
          >
            {" < Back to select products"}
          </Button>
          <Button
            variant="primary"
            onClick={() => setshowReviewConfirmationDialog(true)}
          >
            Save Mapping
          </Button>
        </Grid>
        <Prompt
          isOpen={showGoBackDialog}
          title="Go back"
          variant="warning"
          primaryButtonLabel={common.__ConfirmBtnText}
          secondaryButtonLabel={common.__RejectBtnText}
          onPrimaryButtonClick={() => props.goBackToStep1()}
          onSecondaryButtonClick={() => {
            setShowGoBackDialog(false);
          }}
        >
          {GO_BACK_MESSAGE_SUPERSESSION}
        </Prompt>
        <Prompt
          isOpen={showReviewConfirmationDialog}
          title="Review Mappings"
          variant="warning"
          primaryButtonLabel={common.__ConfirmBtnText}
          secondaryButtonLabel={common.__RejectBtnText}
          onPrimaryButtonClick={() => saveProductMapping()}
          onSecondaryButtonClick={() => setshowReviewConfirmationDialog(false)}
        >
          {CONFIRM_REVIEW_SUPERSESSION_MAPPING}
        </Prompt>
      </>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartReviewMappingTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionReviewMappingService
        .inventorysmartReviewMappingTableLoader,
    inventorysmartReviewMappingDataLoader:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionReviewMappingService
        .inventorysmartReviewMappingDataLoader,
    modifiedProductMapping:
      store.inventorysmartReducer
        .inventorySmartProductSupersessionReviewMappingService
        .modifiedProductMapping,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    inventorysmart_product_supersession_v3:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        ?.productSupersessionModuleConfig
        ?.inventorysmart_product_supersession_v3,
    productSupersessionModuleConfig:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .productSupersessionModuleConfig,
    disablePriorityToggle:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        ?.productSupersessionModuleConfig?.disablePriorityToggle,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartReviewMappingTableLoader: (payload) =>
    dispatch(setInventorysmartReviewMappingTableLoader(payload)),
  setInventorysmartReviewMappingDataLoader: (payload) =>
    dispatch(setInventorysmartReviewMappingDataLoader(payload)),
  saveProductMappingReviewData: (payload) =>
    dispatch(saveProductMappingReviewData(payload)),
  getProductSupersessionSummaryTableConfig: (payload) =>
    dispatch(getProductSupersessionSummaryTableConfig(payload)),
  getProductMappingReviewData: (payload) =>
    dispatch(getProductMappingReviewData(payload)),
  addSnack: (body) => dispatch(addSnack(body)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewSKULevelMapping);
