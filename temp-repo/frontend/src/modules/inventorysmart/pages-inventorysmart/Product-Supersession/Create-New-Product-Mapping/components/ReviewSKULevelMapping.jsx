import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import classnames from "classnames";
import { Button } from "@mui/material";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

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
  GO_BACK_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  CONFIGURATION,
  CREATE_NEW_PRODUCT_MAPPING,
} from "../../../../constants-inventorysmart/routesConstants";
import { addSnack } from "core/actions/snackbarActions";
import { Prompt } from "impact-ui";

const ReviewSKULevelMapping = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);

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
      props.setInventorysmartReviewMappingDataLoader(true);

      let effectiveDate = new Date();
      const data = productsMappingReviewData
        ?.filter((mapping) => {
          return mapping?.new_size?.length && mapping?.old_size?.length;
        })
        .map((mapping) => {
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
            old_size_name: mapping.old_size_name,
          };

          if (mapping.effective_date) {
            effectiveDate = mapping.effective_date;
          }
          return formattedMapping;
        });

      data.forEach((mapping) => {
        if (!mapping.priority) {
          displaySnackMessages("Mapping Priority Order Is Missing", "error");
          throw Error("Mapping Priority Order Is Missing");
        }
      });

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

    const formattedData = data?.map((mapping, index) => {
      const sizesLength = mapping?.new_size?.length;
      mapping.index = index;

      const mappedSelection = selections.find(
        (mappedProduct) => mappedProduct.new_article === mapping.new_article
      );

      mapping.mapped_sizes = sizesLength;

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

      mapping.priority_order_options = mapping.priority;
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
        return {
          new_article: productMapping.new_article,
          old_article: productMapping.article,
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
