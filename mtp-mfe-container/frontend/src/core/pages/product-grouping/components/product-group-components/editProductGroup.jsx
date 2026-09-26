import { useEffect, useRef, useState } from "react";
import LoadingOverlay from "core/Utils/Loader/loader";
import PageRouteTitles from "../PageRouteTitles";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  fetchMappedProducts,
  bulkDeleteProducts,
} from "../../product-grouping-service";
import { Typography, Grid } from "@mui/material";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Delete from "@mui/icons-material/Delete";
import AgGridComponent from "core/Utils/agGrid";
import { Prompt,Button } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { handleErrorMessage } from "./common-product-group-functions";

const EditProductGroup = (props) => {
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const {
    selectedProductGroups,
    filterDependency,
    isStyleType = false,
  } = location?.state;
  const [productGrpColumns, setProductGrpColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [deletePopup, setDeletePopup] = useState(false);
  const editProductGrpInstance = useRef({});
  let routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: "product_grping_scr",
      label: "Products Grouping",
      action: () => navigate(-1),
      icon: null,
    }, 
    {
      id: "delete_product_from_groups",
      label: "Delete Products",
      action: () => null,
    },
  ];
  /**
   * @function
   * @description Fetch intital product data from the product groups selected
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProductGroups.length) {
        props.addSnack({
          message: "Product Groups not selected",
          options: {
            variant: "error",
            onClose: navigate(-1),
          },
        });
      }
      try {
        setIsLoading(true);
        const cols = await props.getColumnsAg(
          isStyleType
            ? "table_name=product_group_filter_hierarchy"
            : "table_name=product_group_filter"
        );
        setProductGrpColumns(cols);
        setIsLoading(false);
      } catch (error) {
        props.addSnack({
          message: "Something went wrong",
          options: {
            variant: "error",
          },
        });
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  const loadTableInstance = (params) => {
    editProductGrpInstance.current = params;
  };
  /**
   * @function
   * @description Update local state to store selected products/articles
   */
  const onSelectionChanged = () => {
    let selectedRows = [];
    editProductGrpInstance?.current?.api?.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data, is_selected: true });
    });
    setSelectedProducts(selectedRows);
  };
  /**
   * @function
   * @description Handle delete product/article operation, prepare payload from selections.
   */
  const deleteStoreGroup = async () => {
    try {
      setIsLoading(true);
      const type = isStyleType
        ? dynamicLabelKeysBasedOnTenant("style", "core")
        : dynamicLabelKeysBasedOnTenant("product", "core");
      const staticPayloadObject = {
        searchColumns: {
          is_mapped: {
            filterType: "bool",
            filter: false,
          },
        },
        checkAll: true,
      };
      const config = [
        staticPayloadObject,
        ...(editProductGrpInstance?.current?.api?.checkConfiguration || []),
      ];
      const payload = {
        product_ids: {
          filters: [],
          meta: {
            search: [],
            range: [],
            sort: [],
            limit: {
              limit: props.pageSizeGrouping || 20,
              page: 1,
            },
          },
          definitions: [],
          metrics: [],
          selection: {
            data: config,
            unique_columns: [type],
          },
        },
        pg_codes: selectedProductGroups.map((group) => group.pg_code),
        delete_product_groups: false,
      };
      await props.bulkDeleteProducts(payload, isStyleType ? "aggregate" : null);
      setSelectedProducts([]);
      props.addSnack({
        message: `${type} deleted Successfully`,
        options: {
          variant: "success",
          onClose: navigate(-1),
        },
      });
      setIsLoading(false);
    } catch (error) {
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
      setIsLoading(false);
    }
  };

  /**
   * @function
   * @description Handle pagiantion for the table to fetch next pages
   * @param {Object} body
   * @param {Integer} pageIndex
   * @param {Object} params
   * @returns {Object}
   */
  const manualCallBack = async (body, pageIndex, params) => {
    try {
      setIsLoading(true);
      const type = isStyleType
        ? dynamicLabelKeysBasedOnTenant("style", "core")
        : dynamicLabelKeysBasedOnTenant("product", "core");
      const staticPayloadObject = {
        searchColumns: {
          is_mapped: {
            filterType: "bool",
            filter: false,
          },
        },
        checkAll: true,
      };
      const config = [
        staticPayloadObject,
        ...(editProductGrpInstance?.current?.api?.checkConfiguration || []),
      ];
      const manualbody = {
        filters: [],
        meta: {
          ...body,
          limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 },
        },
        selection: {
          data: config,
          unique_columns: [type],
        },
        definitions: [],
        metrics: [],
        pg_codes: selectedProductGroups.map((group) => group.pg_code),
      };
      const resp = await props.fetchMappedProducts(
        manualbody,
        isStyleType ? "aggregate" : null
      );
      setIsLoading(false);
      return {
        data: resp.data.data,
        totalCount: resp.data.total,
      };
    } catch (err) {
      handleErrorMessage(err, displaySnackMessages);

      setIsLoading(false);
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
  return (
    <>
      <div className={globalClasses.paddingAround}>
        <PageRouteTitles id="storeGrpingCrtBrdCrmbs" options={routeOptions} />
      </div>
      <div className={`${globalClasses.paddingAround}`} >
        <div
          className={`${globalClasses.flexRow} ${globalClasses.marginBottom}`}
        >
          <h4 id="productGrpingDeleteScreen">
            Selected Product Groups:
          </h4>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignCenter} ${globalClasses.marginLeft1rem}`}
          >
            {selectedProductGroups?.map((item, index) => {
              return (
                <Typography variant="body1" style={{ 
                  fontSize: '1rem',
                  fontWeight: 400,
                  lineHeight: 1.5
                }}>
                  {replaceSpecialCharacter(item?.name)}
                  {selectedProductGroups.length - 1 != index ? "," : ""}
                </Typography>
              );
            })}
          </div>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
        >
          <Typography variant="h5" id="productGrpingDeleteTable">
            All the products in selected groups:
          </Typography>
          <Button
            variant="primary"
            id="storeGrpingCreateBtn"
            size="small"
            onClick={() => setDeletePopup(true)}
            disabled={!selectedProducts.length}
          >
            <Delete />
          </Button>
        </div>
        <Prompt
          isOpen={deletePopup}
          title="Delete Products"
          primaryButtonLabel="Confirm"  
          onPrimaryButtonClick={() => {
              deleteStoreGroup();
              setDeletePopup(false);
          }}
          secondaryButtonLabel="Cancel"
          onSecondaryButtonClick={() => setDeletePopup(false)}
          variant="error"
          onClose={() => setDeletePopup(false)}
        >
          Are you sure want to delete products?
        </Prompt>
        <LoadingOverlay loader={isLoading} spinner>
          <AgGridComponent
            columns={productGrpColumns}
            sizeColumnsToFitFlag
            selectAllHeaderComponent
            onGridChanged
            loadTableInstance={loadTableInstance}
            suppressClickEdit={true}
            onSelectionChanged={onSelectionChanged}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            rowSelection={"multiple"}
            onRowSelected
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSizeGrouping || 20}
            paginationPageSize={props.pageSizeGrouping || 20}
            uniqueRowId={dynamicLabelKeysBasedOnTenant("style", "core")}
          />
        </LoadingOverlay>
        <Grid
          gap={2}
          className={`${globalClasses.stickyFooter}`}
        >
        <Button
          variant="secondary"
          className={globalClasses.marginTop}
          onClick={() => {
            navigate(location?.state?.prevScr, {
              state: {
                from: location.pathname,
              },
            });
          }}
          id="bulkEditPrevScrBtn"
        >
          {"< Go Back"}
        </Button>
        </Grid>
      </div>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};
const mapActionsToProps = {
  getColumnsAg,
  bulkDeleteProducts,
  fetchMappedProducts,
};

export default connect(mapStateToProps, mapActionsToProps)(EditProductGroup);
