import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { getStoreBandContributionData } from "../../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { scrollIntoView, reloadTable } from "../../inventorysmart-utility";
import StoreSizeContributionComponent from "./store-size-contribution";
import Loader from "core/Utils/Loader/loader";

const StoreBandContributionComponent = (props) => {
  const [
    storeBandContributionColumns,
    setStoreBandContributionColumns,
  ] = useState([]);
  const [storeBandContributionData, setStoreBandContributionData] = useState(
    []
  );
  const [pinnedRow, setPinnedRow] = useState([]);
  const [
    displayStoreSizeInStoreBand,
    setDisplayStoreSizeInStoreBand,
  ] = useState(false);
  const [childTableLoader, setChildTableLoader] = useState(false);
  const [storeBand, setStoreBand] = useState("");

  const storeSizeTableRef = useRef();
  const storeBandContributionRef = useRef({});
  const uniqueArticleKey = props.createPPTenantAttrs?.pp_unique_id || "article";

  const viewStoreContributionSplitDetails = (data) => {
    setStoreBand(data);
    setDisplayStoreSizeInStoreBand(true);
  };

  const IAProductProfileViewAction = {
    store_band: viewStoreContributionSplitDetails,
  };

  useEffect(() => {
    (async () => {
      try {
        reloadTable(storeBandContributionRef.current);
        setChildTableLoader(true);
        let body = {
          pp_code: props.selectedPPCode?.pp_code,
          channel: props.selectedPPCode?.channel?.toString(),
          metrics: "sale",
          store_attributes: props.filterDependencies?.filters?.filter(
            (item) => item.dimension === "store"
          ),
        };
        let response = await props.getStoreBandContributionData(body);
        let storeBandContributionResponse = response.data.data;
        let storeBandSizeColDef = agGridColumnFormatter(
          storeBandContributionResponse?.columns,
          null,
          IAProductProfileViewAction
        );
        storeBandSizeColDef.forEach((item) => {
          if (item.column_name === "store_band") {
            item.disabled = setCellsToBeDisabled;
          }
        });
        setStoreBandContributionColumns(storeBandSizeColDef);
        let sortedRows = storeBandContributionResponse?.data?.sort(
          (a, b) => b.overall_proportion - a.overall_proportion
        );
        const index = sortedRows.findIndex((obj) => obj.store_band === "Total");
        if (index !== -1) {
          let toPin = sortedRows.splice(index, 1);
          setPinnedRow(toPin);
        }
        setStoreBandContributionData(sortedRows);
        scrollIntoView(storeSizeTableRef);
        setDisplayStoreSizeInStoreBand(false);
        setChildTableLoader(false);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "success");
        }
      } catch (e) {
        setStoreBandContributionData([]);
        setChildTableLoader(false);
        const errObj = e?.response?.data;
        if (errObj?.show_message)
          displaySnackMessages(errObj?.message, "error");
        else displaySnackMessages(ERROR_MESSAGE, "error");
      }
    })();
  }, [props.selectedPPCode]);

  const setCellsToBeDisabled = (row, _item) => {
    // disable editing on the header row
    return row.store_band === "Total" ? true : false;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getRowStyle = (params) => {
    if (params.node.rowPinned) {
      return { fontWeight: "bold" };
    }
  };

  const setStoreBandContributionTableInstance = (params) => {
    storeBandContributionRef.current = params;
  };

  return (
    <div ref={storeSizeTableRef}>
      {props.tabState === 0 && (
        <Loader loader={childTableLoader} minHeight={160}>
          <AgGridComponent
            rowdata={storeBandContributionData}
            columns={storeBandContributionColumns}
            uniqueRowId={"store_band"}
            sizeColumnsToFitFlag
            pagination={false}
            getRowStyle={getRowStyle}
            pinnedTopRowData={pinnedRow}
            loadTableInstance={setStoreBandContributionTableInstance}
            tableHeader={
              "Store Band Contributions: " +
              props.selectedPPCode[uniqueArticleKey]
            }
            nestedTable={displayStoreSizeInStoreBand}
            nestedTableComponent={
              <StoreSizeContributionComponent
                tabState={props.tabState}
                selectedPPCode={props.selectedPPCode}
                filterDependencies={props.filterDependencies}
                storeBandData={storeBand}
                displayStoreSizeInStoreBand={displayStoreSizeInStoreBand}
                setDisplayStoreSizeInStoreBand={setDisplayStoreSizeInStoreBand}
                setPpSelectionState={props.setPpSelectionState}
              />
            }
            closeButton={true}
            handleCloseButtonClick={() => {
              setDisplayStoreSizeInStoreBand(false);
              props.setSelectedPPCode(null);
              props.setDisplayStoreBandContribution(false);
            }}
          />
        </Loader>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    createPPTenantAttrs:
      inventorysmartReducer.createProductProfileReducer
        ?.createProductProfileModuleConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getStoreBandContributionData: (pp_code) =>
      dispatch(getStoreBandContributionData(pp_code)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(StoreBandContributionComponent);
