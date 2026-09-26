import { Paper } from "@mui/material";
import PageRouteTitles from "../PageRouteTitles";
import { useReducer, useEffect, useRef } from "react";
import {
  getDefinitions,
  setDefinitions,
  ToggleLoader,
  fetchGroupDefinitionById,
  setMappedDefns,
  fetchIndividualGroup,
  getGroupInfo,
  updateGrp,
  setDefnMapTablecols,
} from "core/pages/product-grouping/product-grouping-service";
import LoadingOverlay from "../../../../Utils/Loader/loader";
import { connect } from "react-redux";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import { getColumnsAg } from "../../../../actions/tableColumnActions";
import { addSnack } from "../../../../actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import AgGridComponent from "core/Utils/agGrid";
import { cloneDeep } from "lodash";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { useParams } from "react-router-dom";
import { pxToRem } from "core/Utils/functions/utils";
import { Button,Modal,Loader } from "impact-ui-v3";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const initialState = {
  columns: [],
  defns: [],
  open: false,
  grpObj: {},
  isLoading: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_COLUMNS":
      return {
        ...state,
        columns: action.payload,
      };
    case "SET_GRP_OBJECT":
      return {
        ...state,
        grpObj: action.payload,
      };
    case "SET_DEFINITIONS":
      return {
        ...state,
        defns: [...action.payload],
      };
    case "SET_MAPPED_DEFINITIONS":
      return {
        ...state,
        mappedDefns: action.payload,
      };
    case "SET_LOADER":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "TOGGLE_MODAL_STATE":
      return {
        ...state,
        open: action.status,
      };
    default:
      return state;
  }
};
const GroupDefMapper = (props) => {
  const mappingDefinitionTableInstance = useRef(null); //reference for the mapping table instance
  const [state, dispatch] = useReducer(reducer, initialState);
  const navigate = useNavigate();
  const routerParams = useParams();
  const location = useLocation();
  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: "product_grping_scr",
      label: dynamicLabelsBasedOnTenant("product_grouping", "core"),
      action: () => {
        navigate("/product-grouping");
      },
    },
    {
      id: "create_new_product_grp",
      label: "Group Definition Mapping",
      action: () => null,
    },
  ];

  const deleteData = (tableParams, index) => {
    let mappingTableData = [];
    tableParams.api.forEachNode((rowNode) => {
      mappingTableData.push(rowNode.data);
    });
    props.setMappedDefns(mappingTableData.filter((item, idx) => idx !== index));
  };
  useEffect(() => {
    const fetchData = async () => {
      props.ToggleLoader(true);
      const body = {
        search: [],
        sort: [],
        range: [],
        filters: [],
        include_mapped_definition: true,
      };
      const res = await props.getDefinitions(body, 100);
      const grpdId = routerParams.group_id;
      const grpObj = await props.getGroupInfo(grpdId);
      dispatch({
        type: "SET_GRP_OBJECT",
        payload: grpObj.data.data[0],
      });
      const options = res.data.data.map((row) => {
        return {
          ...row,
          value: row.pgd_code,
          label: row.name,
        };
      });
      dispatch({
        type: "SET_DEFINITIONS",
        payload: options.map((option) => {
          return {
            ...option,
            value: option.pgd_code,
          };
        }),
      });
      try {
        if (props.tableCols.length === 0) {
          let cols = await props.getColumnsAg("table_name=group_definition");
          cols = cols.map((col) => {
            col = Object.assign({}, col);
            if (col.accessor === "name") {
              col.pagination = true;
              col.options = [...options];
              col.fetchOptions = (page) => fetchNewOptions(page);
              col.cellRenderer = (params, extraProps) => {
                if (params.data.isSaved) {
                  return params.data.defn_name;
                } else {
                  return (
                    <div style={{ width: "80%" }}>
                      <CellRenderer
                        cellData={params}
                        column={{ ...col, type: "list", is_editable: true }}
                        extraProps={extraProps}
                      ></CellRenderer>
                    </div>
                  );
                }
              };
            }
            return col;
          });
          cols = [
            ...cols,
            {
              headerName: "Action",
              sticky: "right",
              isFixed: true,
              disableSortBy: true,
              cellRenderer: (params) => {
                return (
                  <>
                    <Button
                      onClick={() => {
                        navigate(
                          `/product-grouping/group-definition-mapping/${routerParams.group_id}/edit-definitions/${params.data.name}`
                        );
                      }}
                      size="large"
                      disabled={
                        params.data.name === "" ||
                        params?.node?.parent?.data?.checkbox_disabled
                      }
                      icon={<EditIcon />}
                      variant="secondary"
                    />
                    <Button
                      onClick={() => deleteData(params, params.rowIndex)}
                      size="large"
                      disabled={params?.node?.parent?.data?.checkbox_disabled}
                      icon={<DeleteIcon />}
                      variant="secondary"
                    />                   
                  </>
                );
              },
              suppressMenu: true,
              lockPosition: "right",
            },
          ];
          props.setDefnMapTablecols(cols);
        }
        if (props.mappedDefns.length === 0) {
          const defnbody = {
            search: [],
            sort: [],
            range: [],
          };
          const resdefn = await props.fetchIndividualGroup(
            routerParams.group_id,
            defnbody
          );
          props.setMappedDefns(
            resdefn.data.data.map((defn) => {
              return {
                ...defn,
                name: defn.pgd_code,
                defn_name: defn.name,
                pseudo_code: defn.pseudo_code,
                isSaved: true,
              };
            })
          );
        }
        props.ToggleLoader(false);
      } catch (error) {
        //Error Handling
        props.ToggleLoader(false);
      }
    };
    fetchData();
  }, []);

  const fetchNewOptions = async (page) => {
    try {
      const res = await props.getDefinitions(page);
      let newOptions = [...state.defns, ...res.data.data];
      dispatch({
        type: "SET_DEFINITIONS",
        payload: newOptions,
      });
    } catch (error) {}
  };

  const onCellValueChanged = (params) => {
    let { colDef, data, newValue, rowIndex } = params;
    //If No value is selected in the dropdown, we don't do any change
    if (newValue === "") {
      return;
    }
    //From the options, get the selected object. This object has pseudocode, rules etc.. of the selected
    //value
    const defnObj = state.defns.filter((defn) => {
      return defn.value === newValue;
    })[0];

    //Update the rowData with pseudocode and name using the above object
    const updatedData = props.mappedDefns.map((row, index) => {
      if (index === rowIndex) {
        return {
          ...row,
          [colDef.id]: newValue,
          defn_name: defnObj.name,
          pseudo_code: defnObj.pseudo_code,
        };
      }
      return row;
    });

    //Assign it to the table data redux variable
    props.setMappedDefns(cloneDeep(updatedData));
  };

  const addDefinition = () => {
    const updatedDefns = [
      ...props.mappedDefns,
      { name: "", isSaved: false, pseudo_code: "" },
    ];
    props.setMappedDefns(updatedDefns);
  };
  const saveDefns = () => {
    //On Clicking save, we iterate over the entire table data
    //and make the isSaved state to true if there is selection made in the dropdown
    //If isState is true, dropdown will become as string
    const updatedDefns = props.mappedDefns.map((defn) => {
      if (!defn.isSaved && defn.name !== "") {
        return {
          ...defn,
          isSaved: true,
        };
      }
      return defn;
    });
    props.setMappedDefns(updatedDefns);
    //Redraw the entire table to reflect the UI according to isState changes
    mappingDefinitionTableInstance.current.api.redrawRows();
  };

  const openModal = () => {
    dispatch({
      type: "TOGGLE_MODAL_STATE",
      status: true,
    });
  };

  const closeModal = () => {
    dispatch({
      type: "TOGGLE_MODAL_STATE",
      status: false,
    });
  };
  const onUpdate = async () => {
    const group = state.grpObj;
    const saveddefns = props.mappedDefns.filter((defn) => defn.isSaved);
    const defnIds = saveddefns.map((defn) => defn.name);
    const body = {
      name: group.name,
      group_type: "manual",
      definitions: defnIds,
      product_ids: [],
      product_group_ids: [],
    };
    try {
      dispatch({
        type: "SET_LOADER",
        payload: true,
      });
      await props.updateGrp(group.pg_code, body);
      props.addSnack({
        message: "Updated successfully",
        options: {
          variant: "success",
          onClose: () => {
            navigate("/product-grouping");
          },
        },
      });
      closeModal();
      props.setMappedDefns([]);
      dispatch({
        type: "SET_LOADER",
        payload: false,
      });
    } catch (error) {
      dispatch({
        type: "SET_LOADER",
        payload: false,
      });
      props.addSnack({
        message: "Update failed",
        options: {
          variant: "error",
        },
      });
    }
  };
  const goBack = () => {
    props.setMappedDefns([]);
    navigate("/product-grouping");
  };
  const globalClasses = globalStyles();
  return (
    <>
      <LoadingOverlay loader={props.isLoading} spinner>
        <div className={globalClasses.paddingAround}>
          <PageRouteTitles options={routeOptions} />
        </div>

        <Modal
          id="productGrpingDfnMapCnfmDialog"
          open={state.open}
          title="Confirm the changes made to mapping definitions"
          primaryButtonLabel="Confirm & Update"
          secondaryButtonLabel="Cancel"
          onPrimaryButtonClick={onUpdate}
          onSecondaryButtonClick={closeModal}
          onClose={closeModal}
          size="small"
        >
          {state.isLoading && <Loader />}
        </Modal>
        <Paper className={globalClasses.paper}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: `${pxToRem(15)} ${pxToRem(15)} ${pxToRem(15)} 0`,
            }}
          >
            <div>
              Product Group Name: <span>{state.grpObj.name}</span>
            </div>
            <Button
              id="productGrpingDfnMapCrtDfnBtn"
              color="primary"
              variant="contained"
              onClick={() => {
                navigate(
                  `${STORE_ELIGIBILITY_GROUP}/product-grouping/group-definition-mapping/${routerParams.group_id}/create-definition`,
                  {
                    state: {
                      prevScr: location.pathname,
                    },
                  }
                );
              }}
            >
              Create New Definition
            </Button>
          </div>
          <div className={globalClasses.marginBottom}>
            Mapped Definitions
          </div>
          {props.tableCols.length !== 0 && (
            <>
              <AgGridComponent
                columns={props.tableCols}
                rowdata={cloneDeep(
                  props.mappedDefns.map((defn, index) => {
                    return {
                      ...defn,
                      id: index,
                    };
                  })
                )}
                uniqueRowId={"id"}
                loadTableInstance={(params) =>
                  (mappingDefinitionTableInstance.current = params)
                }
                onCellValueChanged={onCellValueChanged}
                sizeColumnsToFitFlag
              />
            </>
          )}
          <div className={globalClasses.marginAround}>
            <Button
              color="primary"
              variant="contained"
              onClick={addDefinition}
              id="productGrpingDfnMapAddDfnBtn"
            >
              + Add Definition
            </Button>
          </div>
        </Paper>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.centerAlign} ${globalClasses.marginTop}`}
        >
          <Button
            color="primary"
            variant="contained"
            onClick={saveDefns}
            id="productGrpingDfnMapSaveDfnBtn"
          >
            Save
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={openModal}
            id="productGrpingDfnMapUpdDfnBtn"
          >
            Update
          </Button>
          <Button
            id="productGrpingDfnMapCnclDfnBtn"
            color="primary"
            variant="contained"
            onClick={goBack}
          >
            Cancel
          </Button>
        </div>
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    definitions: state.productGroupReducer.definitions,
    isLoading: state.productGroupReducer.isLoading,
    mappedDefns: state.productGroupReducer.mappedDefns,
    tableCols: state.productGroupReducer.defnMapTableCols,
  };
};
const mapActionsToProps = {
  getDefinitions,
  setDefinitions,
  ToggleLoader,
  fetchGroupDefinitionById,
  setMappedDefns,
  addSnack,
  fetchIndividualGroup,
  getGroupInfo,
  updateGrp,
  setDefnMapTablecols,
  getColumnsAg,
};
export default connect(mapStateToProps, mapActionsToProps)(GroupDefMapper);
