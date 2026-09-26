import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import classnames from "classnames";
import { Button } from "@mui/material";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import moment from "moment";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isEmpty } from "lodash";
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
  GO_BACK_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  CONFIGURATION,
  CREATE_NEW_PRODUCT_MAPPING,
} from "../../../../constants-inventorysmart/routesConstants";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";
import ProductPriorityPopup from "./ProductPriorityPopup";
import { getPriority } from "../../utils";

const ReviewSKULevelMapping = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);

  const { precalculatedPriority, mainChoicePriorityEditable } =
    props.inventorysmartScreenConfig?.inventorysmart_configuration
      ?.supersession || {};

  const [renderSKULevelMappingTable, setRenderSKULevelMappingTable] = useState(
    false
  );
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
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
  const [isPriorityMappingDialogActive, setIsPriorityMappingDialogActive] = useState(false);
  const [clickedPriorityData, setClickedPriorityData] = useState(null);

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

  const toggleAddPriorityPopup = (data) => {
    setClickedPriorityData(data);
    setIsPriorityMappingDialogActive(true);
  };

  const editSKULevelMapping = () => {
    setOpenProductMappingViewOnlyDialog(false);
    openProductMappingPopUp();
  };

  const onProductivityPriorityPopupOpen = () => {
    setIsPriorityMappingDialogActive(true);
  };

  const onProductivityPriorityPopupClose = () => {
    setIsPriorityMappingDialogActive(false);
  };

  const editPriorityMapping = () => {
    onProductivityPriorityPopupClose();
  };

  const updatePriorityMapping = (updatedPriority) => {
    let updatedProductsMappingReviewData = [...productsMappingReviewData];

    updatedProductsMappingReviewData?.forEach((data) => {
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

  const reviewSKULevelMappingActionMap = {
    mapped_sizes: toggleReviewSKULevelMappingPopup,
    priority_action: toggleAddPriorityPopup,
  };

  const saveProductMapping = async () => {
    try {
      props.setInventorysmartReviewMappingDataLoader(true);

      let effectiveDate = new Date();
      const data = productsMappingReviewData
        ?.filter((mapping) => {
          return mapping?.new_size?.length && mapping?.old_size?.length;
        })
        .map((mapping) => {
          const {
            new_article,
            old_article,
            new_product_code,
            old_product_code,
            priority,
            old_l0_name,
            old_l1_name,
            old_l2_name,
            old_l3_name,
            old_l4_name,
            old_style_color_id,
            old_product_description,
            old_size,
            old_size_name,
            old_product_code_all,
            new_product_code_all,
            old_size_all,
            old_size_name_all,
            start_date,
            end_date,
            has_store_exception,
            store,
            store_priority,
            old_model_description
          } = mapping; // tenant attr master

          const formattedMapping = {
            new_article,
            old_article,
            new_product_code,
            old_product_code,
            priority: typeof priority === 'object' ? priority?.[0]?.value : priority,
            old_l0_name,
            old_l1_name,
            old_l2_name,
            old_l3_name,
            old_l4_name,
            old_style_color_id,
            old_product_description,
            old_size,
            old_size_name,
            old_product_code_all,
            new_product_code_all,
            old_size_all,
            old_size_name_all,
            old_model_description
          };

          if (mapping.effective_date) {
            effectiveDate = mapping.effective_date;
          }

          if (
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.supersession?.startAndEndDates
          ) {
            formattedMapping.start_date = start_date;
            formattedMapping.end_date = end_date;

            if (has_store_exception) {
              formattedMapping.has_store_exception = true;
              formattedMapping.store = store;
              formattedMapping.store_priority = store_priority;
            } else {
              formattedMapping.has_store_exception = false;
              formattedMapping.store = [];
              formattedMapping.store_priority = [];
            }
          }

          return formattedMapping;
        });

      data.forEach((mapping) => {
        let l_unmappedOldProductCodes = mapping.old_product_code_all.filter(
          (item) => !mapping.old_product_code.includes(item)
        );
        let l_unmappedNewProductCodes = mapping.new_product_code_all.filter(
          (item) => !mapping.new_product_code.includes(item)
        );
        let l_unmappedOldSize = mapping.old_size_all.filter(
          (item) => !mapping.old_size.includes(item)
        );
        let l_unmappedOldSizeName = mapping.old_size_name_all.filter(
          (item) => !mapping.old_size_name.includes(item)
        );

        mapping.old_product_code?.push(...l_unmappedOldProductCodes);
        mapping.new_product_code = mapping.new_product_code?.concat(
          new Array(l_unmappedOldProductCodes.length).fill(null)
        );

        mapping.new_product_code?.push(...l_unmappedNewProductCodes);
        mapping.old_product_code = mapping.old_product_code?.concat(
          new Array(l_unmappedNewProductCodes.length).fill(null)
        );

        mapping.old_size?.push(...l_unmappedOldSize);
        mapping.old_size = mapping.old_size?.concat(
          new Array(l_unmappedNewProductCodes.length).fill(null)
        );

        mapping.old_size_name?.push(...l_unmappedOldSizeName);
        mapping.old_size_name = mapping.old_size_name?.concat(
          new Array(l_unmappedNewProductCodes.length).fill(null)
        );

        delete mapping.old_product_code_all;
        delete mapping.new_product_code_all;
        delete mapping.old_size_all;
        delete mapping.old_size_name_all;

        if (!mapping.priority) {
          displaySnackMessages("Mapping Priority Order Is Missing", "error");
          throw Error("Mapping Priority Order Is Missing");
        }
      });

      if (mainChoicePriorityEditable && data.length) {
        const clonedMapping = cloneDeep(data[0]); // One more mapping entry for new choice priority

        clonedMapping.old_article = null;
        clonedMapping.old_product_code = [null];
        clonedMapping.old_style_color_id = null;
        clonedMapping.old_product_description = null;
        clonedMapping.old_size = [null];
        clonedMapping.old_size_name = [null];

        const prioritySortedMappings = cloneDeep(data).sort(
          (a, b) => a.priority - b.priority
        );
        let currentPriority = 1;

        for (const mapping of prioritySortedMappings) {
          if (currentPriority < mapping.priority) {
            break;
          }

          currentPriority++;
        }

        clonedMapping.priority = currentPriority;

        data.push(clonedMapping);
      }

      const payload = {
        mappings: data,
        effective_date: effectiveDate,
      };

      if (payload?.mappings?.length) {
        let response = await props.saveProductMappingReviewData(payload);

        if (response.data?.status) {
          displaySnackMessages(
            "Mapping has been updating successfully",
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
        displaySnackMessages("Nothing to update", "info");
      }
    } catch (err) {
      displaySnackMessages("Error in updating the mapping", "error");
    } finally {
      setshowReviewConfirmationDialog(false);
      props.setInventorysmartReviewMappingDataLoader(false);
    }
  };

  const formatProductMappingData = (data, selections) => {
    const orderCountByNewArticle = {};

    if (precalculatedPriority) {
      let maxPriority = 0;

      data?.forEach((mapping) => {
        const { priority } = mapping;

        maxPriority = Math.max(maxPriority, priority);
      });

      data?.forEach((mapping) => {
        const { priority } = mapping;
        let newPriority = priority;

        if (priority === -1) {
          maxPriority++;

          newPriority = maxPriority;
        }

        mapping.priority = [
          {
            label: newPriority,
            value: newPriority,
          },
        ];
      });
    }

    const formattedData = data?.map((mapping, index) => {
      const sizesLength = mapping?.new_size?.length;
      mapping.index = index;

      const mappedSelection = selections.find(
        (mappedProduct) => mappedProduct.new_article === mapping.new_article
      );

      if (
        !props.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.supersession?.startAndEndDates
      ) {
        mapping.mapped_sizes = sizesLength;

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

      if(!precalculatedPriority) {
        if (orderCountByNewArticle?.[mapping?.new_article]) {
          const priority = getPriority(
            mapping.priority,
            orderCountByNewArticle?.[mapping?.new_article] + 1
          );

          mapping.priority = [
            {
              label: priority,
              value: priority,
            },
          ];

          orderCountByNewArticle[mapping?.new_article] =
            orderCountByNewArticle[mapping?.new_article] + 1;
        } else {
          const priority = getPriority(mapping.priority, 1);

          mapping.priority = [
            {
              label: priority,
              value: priority,
            },
          ];

          orderCountByNewArticle[mapping?.new_article] = 1;
        }
      }

      mapping.priority_order_options = mapping.priority;

      if (
        props.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.supersession?.priorityPopup
      ) {
        mapping.priority_action = "Add Priority";
      }

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
    } finally {
      props.setInventorysmartReviewMappingTableLoader(false);
    }
  };

  const fetchProductMappingReviewData = async () => {
    try {
      props.setInventorysmartReviewMappingDataLoader(true);

      let mappings = props?.modifiedProductMapping?.map((productMapping) => {
        const { new_article, article, start_date, end_date } = productMapping;
        const data = {
          new_article: new_article,
          old_article: article,
        };

        if (
          props.inventorysmartScreenConfig?.inventorysmart_configuration
            ?.supersession?.startAndEndDates
        ) {
          // Formatting dates to YYYY-MM-DD to avoid parsing mistake between MM-DD-YYYY & DD-MM-YYYY
          data.start_date = moment(start_date).format('YYYY-MM-DD');
          data.end_date = moment(end_date).format('YYYY-MM-DD');
        }

        return data;
      });

      let body = {
        mappings,
      };

      let response = await props.getProductMappingReviewData(body);
      let mappedProductData = formatProductMappingData(
        response?.data?.data,
        props?.modifiedProductMapping
      );

      setProductsMappingReviewData(mappedProductData);
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

  const processCellForClipboard = (params) => {
    const colDef = params.column.getColDef();

    if (colDef.type === "date" && colDef.formatter) {
      return moment(params.value).format(colDef.formatter);
    }

    return params.value;
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
    if (!isEmpty(props.modifiedProductMapping)) {
      generatePriorityOrderOptionsByArticles(props.modifiedProductMapping);
    }
  }, [props.modifiedProductMapping]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <CustomAccordion label="Details">
        <Loader
          loader={
            props.inventorysmartReviewMappingTableLoader ||
            props.inventorysmartReviewMappingDataLoader
          }
          minHeight={"188px"}
        >
          {renderSKULevelMappingTable && (
            <AgGridComponent
              columns={productsMappingReviewColumnConfig}
              rowdata={productsMappingReviewData}
              uniqueRowId={"index"}
              callBackOnChangeCustomFunction={
                updatePriorityOptionsOnSelectionChangeHandler
              }
              loadTableInstance={loadAlertsTableInstance}
              pagination={true}
              processCellForClipboard={processCellForClipboard}
              setIsFilterChanged={() => {}}
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
        />

        <ProductPriorityPopup
          active={clickedPriorityData && isPriorityMappingDialogActive}
          openModal={onProductivityPriorityPopupOpen}
          closeModal={onProductivityPriorityPopupClose}
          editSKULevelMapping={editPriorityMapping}
          clickedPriorityData={clickedPriorityData}
          updatePriorityMapping={updatePriorityMapping}
          isEditAllowed={true}
          parentAgGridInstance={agGridInstance}
          isStoreExceptionHidden={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.supersession?.hideStoreException
          }
          productsMappingReviewData={productsMappingReviewData}
          isEditFlow={props.isEditFlow}
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
            onClick={() => setShowGoBackDialog(true)}
          >
            Back
          </Button>
          <Button
            variant="contained"
            color="primary"
            className={classes.button}
            onClick={() => setshowReviewConfirmationDialog(true)}
          >
            Save Mapping
          </Button>
        </div>
        <Prompt
          isOpen={showGoBackDialog}
          title="Go back"
          subHeading={GO_BACK_MESSAGE}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => props.goBackToStep1(),
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => setShowGoBackDialog(false),
          }}
          variant="warning"
        />
        <Prompt
          isOpen={showReviewConfirmationDialog}
          title="Review Mappings"
          subHeading={CONFIRM_REVIEW_SUPERSESSION_MAPPING}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => saveProductMapping(),
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => setshowReviewConfirmationDialog(false),
          }}
          variant="warning"
        />
      </CustomAccordion>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
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
