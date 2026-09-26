import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { Button, Grid } from "@mui/material";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  CACHE_BLOCKSIZE_STRATEGY,
  defaultTableData,
  tableArticleFilter,
  tableStoreCodeFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import {
  getProductStoreInventorySourceData,
  getProductStoreInventorySourceTableConfig,
  setInventorysmartProductStoreInventorySourceMappingTableLoader,
  setInventorysmartProductStoreInventorySourceMappingConfigLoader,
  saveProductStoreInventorySourceMapping,
  saveProductStoreInventorySourceMappingSingle
} from "modules/inventorysmart/services-inventorysmart/Product-Store-Inventory-Source-Mapping/product-store-inventory-source-mapping-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import ProductStoreInventorySourceMappingSetAllModal from "./ProductStoreInventorySourceMappingSetAllModal";
import { addSnack } from "core/actions/snackbarActions";

const ProductStoreInventorySourceMappingSummary = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const agGridInstance = useRef(null);
  const storeInventorySourceApiMeta = useRef(null);

  const [renderMappingTable, setRenderMappingTable] = useState(false);
  const [
    productStoreInventorySourceMappingColumnConfig,
    setProductStoreInventorySourceMappingColumnConfig,
  ] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [isCheckedAll, setIsCheckedAll] = useState(false);
  const [showSetAllModal, setShowSetAllModal] = useState(false);

  const [changedRows, setChangesRows] = useState([]);

  const formatProductStoreInventorySourceMappingData = (data) => {
    const formattedData = data?.map((mapping, index) => {
      mapping.index = index;
      return mapping;
    });

    return formattedData;
  };

  const saveMapping = async (data, payloadListByArticle) => {
    try {
      props.setInventorysmartProductStoreInventorySourceMappingTableLoader(
        true
      );
      if (isCheckedAll) {
        const payload = {
          filters: props.selectedFilters?.filter(
            (filterItem) => filterItem?.values?.length > 0
          ),
          meta: storeInventorySourceApiMeta.current,
          store_grade: data?.store_grade,
          inv_source: data?.inv_source ? data?.inv_source : "0",
        };

        await props.saveProductStoreInventorySourceMapping(payload);
        props.setShowSetAllModal(false);
      } else {
        const promises = [];
        // Map Store Grade for Each Article
        payloadListByArticle.forEach((payloadOption) => {
          let articleFilter = tableArticleFilter;
          let storeCodeFilter = tableStoreCodeFilter;

          articleFilter.values = [payloadOption.articleId];
          storeCodeFilter.values = [...payloadOption.store_code];

          let body = {
            filters: [articleFilter, storeCodeFilter],
            meta: storeInventorySourceApiMeta.current,
            inv_source: data?.inv_source ? data?.inv_source : "0",
          };
          promises.push(props.saveProductStoreInventorySourceMapping(body));
        });

        await Promise.all(promises).then((data) => {
          const promiseData = data.map((promise) => {
            return promise.data.data;
          });
        });
      }

      displaySnackMessages("Inventory Source Successfully Updated", "success");
      setSelectedArticles([])
      setRenderMappingTable(false);
    } catch (err) {
      props.setInventorysmartProductStoreInventorySourceMappingTableLoader(
        false
      );
      displaySnackMessages("Error Updating Inventory Source Mapping", "error");
    } finally {
      setRenderMappingTable(true);
    }
  };

  const fetchProductStoreInventorySourceTableConfig = async () => {
    try {
      props.setInventorysmartProductStoreInventorySourceMappingConfigLoader(
        true
      );
      const payload = {
        tableConfigName: "inventorysmart_product_inventory_source",
      };
      let response = await props.getProductStoreInventorySourceTableConfig(
        payload
      );

      let formattedColumns = agGridColumnFormatter(response?.data?.data);
      setProductStoreInventorySourceMappingColumnConfig(formattedColumns);
      setRenderMappingTable(true);
    } finally {
      props.setInventorysmartProductStoreInventorySourceMappingConfigLoader(
        false
      );
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setInventorysmartProductStoreInventorySourceMappingTableLoader(
        true
      );

      const meta = {
        ...manualbody,
        limit: { limit: CACHE_BLOCKSIZE_STRATEGY, page: pageIndex + 1 },
      };

      let body = {
        filters: props.selectedFilters?.filter(
          (filterItem) => filterItem?.values?.length > 0
        ),
        meta,
      };

      let response = await props.getProductStoreInventorySourceData(body);
      let mappedProductStoreInventorySourceData = formatProductStoreInventorySourceMappingData(
        response?.data?.data
      );
      let formattedData = agGridRowFormatter(
        mappedProductStoreInventorySourceData,
        params?.api?.checkConfiguration,
        "index"
      );

      storeInventorySourceApiMeta.current = meta;
      return {
        data: formattedData,
      };
    } catch {
      return defaultTableData;
    } finally {
      props.setInventorysmartProductStoreInventorySourceMappingTableLoader(
        false
      );
    }
  };

  const onProductStoreSelectionChanged = (event) => {
    // fetch all selected rows
    let checkedAll = false;
    let selections = event.api.getSelectedRows();

    agGridInstance?.current?.api?.checkConfiguration?.forEach((configItem) => {
      if (configItem?.checkAll) {
        checkedAll = true;
      } else if (configItem?.unCheckAll) {
        checkedAll = false;
      }
    });
    setSelectedArticles([...selections]);
    setIsCheckedAll(checkedAll);
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

  const onCellValueChanged = (p_instance) => {
    const { column, newValue, oldValue, data } = p_instance;
    if(column?.colId === "inv_source_flag" && newValue !== oldValue){
      let map_values = [];
      if(changedRows.length)
        changedRows.map(i => map_values.push([i.store_code, i]));
      let rows = new Map(map_values);
      rows.set(data?.store_code, {
        product_code: data?.product_code,
        article: data?.article,
        store_code: data?.store_code,
        grade: data?.grade,
        inv_source_flag: p_instance?.newValue,
        inv_source: p_instance?.newValue == 0 ? "Book Inv." : "RFID Inv.",
      })
      setChangesRows([])
      let arr = []
      rows.forEach((value) => {
        if(value) arr.push(value);
      })
      setChangesRows(arr);
    }
  }

  const saveChangedCells = async() => {
    try{
      props.setInventorysmartProductStoreInventorySourceMappingTableLoader(
        true
      );
      let payload = {};
      payload.data = changedRows
      await props.saveProductStoreInventorySourceMappingSingle(payload); 
      setChangesRows([]);
      displaySnackMessages("Inventory Source Successfully Updated", "success");
      setRenderMappingTable(false);
    }catch{
      props.setInventorysmartProductStoreInventorySourceMappingTableLoader(
        false
      );
      displaySnackMessages("Error Updating Inventory Source Mapping", "error");
    }finally{
      setTimeout(() => setRenderMappingTable(true),0);
    }
  }

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setRenderMappingTable(false);
      fetchProductStoreInventorySourceTableConfig();
      setChangesRows([]);
    }
  }, [props.selectedFilters]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <CustomAccordion label="Details">
        <Loader
          loader={
            props.inventorysmartProductStoreInventorySourceMappingTableLoader ||
            props.inventorysmartProductStoreInventorySourceMappingConfigLoader
          }
          minHeight={"188px"}
        >
          {renderMappingTable && (
            <AgGridComponent
              columns={productStoreInventorySourceMappingColumnConfig}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              uniqueRowId={"index"}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              selectAllHeaderComponent
              onRowSelected
              onSelectionChanged={onProductStoreSelectionChanged}
              cacheBlockSize={CACHE_BLOCKSIZE_STRATEGY}
              loadTableInstance={loadAlertsTableInstance}
              onCellValueChanged={onCellValueChanged}
              pagination={true}
            />
          )}

          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
            className={globalClasses.marginAround}
          >
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              onClick={() => saveChangedCells()}
              disabled = {changedRows.length === 0}
            >
              Save
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={!(selectedArticles?.length || isCheckedAll)}
              className={classes.button}
              onClick={() => setShowSetAllModal(true)}
            >
              Set All
            </Button>
          </Grid>
        </Loader>
        {showSetAllModal && (
          <ProductStoreInventorySourceMappingSetAllModal
            showSetAllModal={showSetAllModal}
            selectedArticles={selectedArticles}
            setShowSetAllModal={setShowSetAllModal}
            agGridInstance={agGridInstance.current}
            saveMapping={saveMapping}
          />
        )}
      </CustomAccordion>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer
        .inventorySmartProductStoreInventorySourceMappingService
        .selectedFilters,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartProductStoreInventorySourceMappingTableLoader:
      store.inventorysmartReducer
        .inventorySmartProductStoreInventorySourceMappingService
        .inventorysmartProductStoreInventorySourceMappingTableLoader,
    inventorysmartProductStoreInventorySourceMappingConfigLoader:
      store.inventorysmartReducer
        .inventorySmartProductStoreInventorySourceMappingService
        .inventorysmartProductStoreInventorySourceMappingConfigLoader,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartProductStoreInventorySourceMappingTableLoader: (payload) =>
    dispatch(
      setInventorysmartProductStoreInventorySourceMappingTableLoader(payload)
    ),
  setInventorysmartProductStoreInventorySourceMappingConfigLoader: (payload) =>
    dispatch(
      setInventorysmartProductStoreInventorySourceMappingConfigLoader(payload)
    ),
  getProductStoreInventorySourceTableConfig: (payload) =>
    dispatch(getProductStoreInventorySourceTableConfig(payload)),
  getProductStoreInventorySourceData: (payload) =>
    dispatch(getProductStoreInventorySourceData(payload)),
  saveProductStoreInventorySourceMapping: (payload) =>
    dispatch(saveProductStoreInventorySourceMapping(payload)),
  saveProductStoreInventorySourceMappingSingle: (payload) =>
    dispatch(saveProductStoreInventorySourceMappingSingle(payload)),
  addSnack: (body) => dispatch(addSnack(body)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductStoreInventorySourceMappingSummary);
