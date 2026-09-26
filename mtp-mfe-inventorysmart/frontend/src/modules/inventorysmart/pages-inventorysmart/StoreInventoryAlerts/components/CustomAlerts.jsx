import React, { useState, useRef, useEffect } from "react";
import { Button, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { DC_TRANSFER_ALLOCATION_ALERT } from "../../../constants-inventorysmart/routesConstants";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";

const CustomAlerts = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const agGridInstance = useRef(null);
  const globalClasses = globalStyles();

  // Get unique ID from props at top level
  const uniqueId = props.data?.unique?.[1];

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    const fetchTableConfig = async () => {
      try {
        setIsLoading(true);
        // Get table configuration
        const tableConfigName = props.data.table_config[1];
        let cols = await getColumnsAg(`table_name=${tableConfigName}`)();

        setColumns(cols);

        // Set row data from props
        if (props.data.dropdown_table_data) {
          setRowData(props.data.dropdown_table_data);
        }

        setIsLoading(false);
      } catch (error) {
        handleErrorMessage(error);
        setIsLoading(false);
      }
    };

    fetchTableConfig();
  }, [props.data]);

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows().map((item) => item[uniqueId]);
    setSelectedIds(selections);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const handleGenerateTransfer = () => {
    if (props.data?.redirect === "DC Transfer Recommendation") {
      navigate(DC_TRANSFER_ALLOCATION_ALERT, {
        state: {
          selectedIds,
          selectedFiltersDependency: props.selectedFilters,
          redirect: true,
        },
      });
    } else {
      displaySnackMessages(t("inventorysmart.selectAValue"), "warning");
    }
  };

  const renderGenerateTransferButton = () => (
    <Button
      size="large"
      type="default"
      variant="primary"
      onClick={handleGenerateTransfer}
      disabled={selectedIds.length === 0}
    >
      {t("inventorysmart.generateRecommendations")}
    </Button>
  );

  return (
    <LoadingOverlay loader={isLoading} spinner>
      <div className={globalClasses.marginVertical}>
        <AgGridComponent
          rowdata={rowData}
          columns={columns}
          selectAllHeaderComponent={true}
          onSelectionChanged={onSelectionChanged}
          uniqueRowId={uniqueId}
          sizeColumnsToFitFlag
          rowSelection={"multiple"}
          paginationPageSize={10}
          noRowOverlayMessage={t("inventorysmart.noRecommendationsToReview")}
          loadTableInstance={loadTableInstance}
          tableHeader={t("inventorysmart.recommendation")}
          topRightOptions={renderGenerateTransferButton()}
        />
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  return {
    // Add any state mappings if needed
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(CustomAlerts);
