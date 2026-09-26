import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt,Button } from "impact-ui-v3";
import {
  ToggleLoader,
  deleteDefinition,
  getDefinitions,
  setDefinitions,
  setViewDefnTableCols,
} from "core/pages/product-grouping/product-grouping-service";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import { useNavigate } from "react-router-dom-v5-compat";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const ViewDefinitions = (props) => {
  const [cols, setcols] = useState([]);
  const [deleteConfirmOpen, setdeleteConfirmOpen] = useState(false);
  const [delRow, setdelRow] = useState({});

  const tableInstance = useRef({});
  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  const navigate = useNavigate();


  useEffect(() => {
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        if (props.defnTableCols.length === 0) {
          let columns = await props.getColumnsAg("table_name=group_definition");
          columns = agGridColumnFormatter(columns);
          props.setViewDefnTableCols(columns);
        }
        props.ToggleLoader(false);
      } catch (error) {
        props.ToggleLoader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let columns = [...props.defnTableCols];
    if (columns.length > 0) {
      columns.push({
        headerName: "Action",
        id: "grp_def_action",
        is_frozen: true,
        sticky: "right",
        cellRenderer: (params, extraProps) => {
          return (
            <>
              <Button
                onClick={() => {
                  navigate(
                    `${STORE_ELIGIBILITY_GROUP}${props.prevScr}/edit-definitions/${params.data.pgd_code}`
                  );
                }}
                size="large"
                disabled={params?.node?.parent?.data?.checkbox_disabled}
                icon={<EditIcon />}
                variant="tertiary"
                sx={{
                  marginLeft: "10px",
                }}
              />
              <Button
                onClick={() => {
                  setdeleteConfirmOpen(true);
                  setdelRow(params.data.pgd_code);
                }}
                size="large"
                disabled={params?.node?.parent?.data?.checkbox_disabled}
                icon={<DeleteIcon />}
                variant="tertiary"
                sx={{
                  marginLeft: "10px",
                }}
              />
            </>
          );
        },
        suppressMenu: true,
        lockPosition: "right",
      });
      setcols(columns);
    }
  }, [props.defnTableCols]);

  const viewDefinitionsManualCallBack = async (
    manualbody,
    pageIndex,
    params
  ) => {
    props.ToggleLoader(true);
    try {
      const res = await props.getDefinitions(manualbody, props.pageSizeGrouping || 20, pageIndex);
      setDefinitions({ definitions: res.data.data, count: res.data.total });
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (err) {
      props.ToggleLoader(false);
      displaySnackMessages("Something went wrong", "error");
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

  const onConfirmDelete = async () => {
    props.ToggleLoader(true);
    setdeleteConfirmOpen(false);
    try {
      await props.deleteDefinition(delRow);
      handleClose();
      displaySnackMessages("Deleted successfully", "success");
      tableInstance.current.api?.refreshServerSideStore({ purge: true });
    } catch (error) {
      setdeleteConfirmOpen(false);
      displaySnackMessages("Delete failed", "error");
    }
    return null;
  };

  const handleClose = () => {
    setdeleteConfirmOpen(false);
    props.ToggleLoader(false);
  };

  return (
    <>
      <LoadingOverlay loader={props.isLoading} spinner>
        <Prompt
          isOpen={deleteConfirmOpen}
          title="Confirm Changes"
          primaryButtonLabel="Confirm"
          onPrimaryButtonClick={() => {
            onConfirmDelete();
            handleClose()
          }}
          secondaryButtonLabel="Cancel"
          onSecondaryButtonClick={() => handleClose()}
          variant="error"
          handleClose={handleClose}
        >
          Are you sure want to delete the definition?
        </Prompt>

        {cols.length > 0 && (
          <AgGridComponent
            columns={cols}
            selectAllHeaderComponent={false}
            sizeColumnsToFitFlag
            onGridChanged
            manualCallBack={(body, pageIndex, params) =>
              viewDefinitionsManualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSizeGrouping || 20}
            paginationPageSize={props.pageSizeGrouping || 20}
            uniqueRowId={"pgd_code"}
            loadTableInstance={setNewTableInstance}
            suppressClickEdit={true}
            topRightOptions={props.topRightOptions ? props.topRightOptions() : []}
            tableHeader={props.title ? props.title : "Definitions"}
          />
        )}
      </LoadingOverlay>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    isLoading: state.productGroupReducer.isLoading,
    definitions: state.productGroupReducer.productGrpDefinitions,
    defnCount: state.productGroupReducer.productGrpDefinitionsCount,
    isDataChanged: state.productGroupReducer.isDataChanged,
    dataChangeType: state.productGroupReducer.dataChangeType,
    defnTableCols: state.productGroupReducer.viewDefnTableCols,
    isSuperUser:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.isSuperUser,
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};

const mapActionsToProps = {
  deleteDefinition,
  getColumnsAg,
  ToggleLoader,
  setViewDefnTableCols,
  addSnack,
  setDefinitions,
  getDefinitions,
};

export default connect(mapStateToProps, mapActionsToProps)(ViewDefinitions);
