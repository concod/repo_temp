import { connect } from "react-redux";
import { useEffect, useState } from "react";
import { IconButton, Link, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  setSelectedStyleId,
  ToggleLoader,
  fetchUnitDefns,
  setUnitDefns,
  changeDataStatus,
} from "../product-unit-definition-service";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import { isNull, uniqBy, cloneDeep } from "lodash";
import {
  filterAccessibleTableData,
  addRequiredFilterKeys,
} from "core/Utils/filter-accessible-data";
import Loader from "core/Utils/Loader/loader";
import AgGridTable from "core/Utils/agGrid";
import React from "react";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles({
  tableCont: {
    marginTop: "1rem",
  },
  heading: {
    fontWeight: 500,
    fontSize: 18,
  },
  DefnDiv: {
    display: "flex",
    maxHeight: 100,
    overflowY: "auto",
    flexWrap: "wrap",
  },
});
const ViewStyles = React.forwardRef((props, ref) => {
  const [cols, setcols] = useState([]);
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();

  const manualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(ref?.filterDependencyRef?.current)) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    props.ToggleLoader(true);
    try {
      let reqBody = (
        ref?.filterDependencyRef?.current || props.selectedFilters
      ).map((filter) => {
        return {
          ...filter,
          column_name: filter.attribute_name,
          dimension: "Product",
        };
      });
      if (reqBody.length === 0) {
        let dependency = props.selectedFilters
          ? props.selectedFilters.map((item) => {
              return {
                attribute_name: item.filter_id,
                operator: "in",
                values: Array.isArray(item.values)
                  ? item.values.map((opt) => opt.value)
                  : item.values,
                filter_type: item.filter_type,
              };
            })
          : [];
        reqBody = dependency;
      }
      if (reqBody.length === 0) {
        props.setUnitDefns({ data: [], count: 0 });
        props.ToggleLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }
      // add required keys
      reqBody = addRequiredFilterKeys(props.planningLevelHierarchy, reqBody);
      let body = {
        product_attributes: reqBody,
        filters: {
          ...manualbody,
          limit: {
            limit: 10,
            page: pageIndex + 1,
          },
        },
      };

      const res = await props.fetchUnitDefns(body);
      const accessibleData = filterAccessibleTableData(
        res.data.data,
        props.userAccessList
      );
      props.setUnitDefns({ data: accessibleData, count: res.data.total });
      props.ToggleLoader(false);
      return {
        data: accessibleData,
        totalCount: res.data.total,
      };
    } catch (error) {
      //Error handling
      props.ToggleLoader(false);
    }
  };

  useEffect(() => {
    if (props.styleTableCols.length > 0) {
      const copyStyleTableCols = cloneDeep(props.styleTableCols);
      let newCols = copyStyleTableCols.map((col) => {
        if (col.column_name === "style_id") {
          col.field = "style";
          col.accessor = "style";
        }
        if (col.accessor === "definition_type") {
          col.cellRenderer = (params) => {
            const uniqueArr = uniqBy(
              params.data.mapped_definition,
              "definition_type"
            );
            return params.data.mapped_definition ? (
              <div className={classes.DefnDiv}>
                {uniqueArr.map((defn, idx) => (
                  <>
                    {defn.definition_type}
                    {idx < uniqueArr.length - 1 ? ", " : ""}
                  </>
                ))}
              </div>
            ) : (
              "-"
            );
          };
        }
        if (col.accessor === "name") {
          col.cellRenderer = (params) => {
            return (
              <div className={classes.DefnDiv}>
                {params.data.mapped_definition
                  ? params.data.mapped_definition.map((defn, index) => (
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => {
                          navigate(
                            `/product-unit-definition/edit/${params.data.style}/${defn.pud_code}`
                          );
                        }}
                        disabled={
                          params.data.disableEditSelection ? true : false
                        }
                      >
                        {defn.name}
                        {index < params.data.mapped_definition.length - 1
                          ? ","
                          : ""}
                      </Link>
                    ))
                  : "-"}
              </div>
            );
          };
        }
        return col;
      });
      newCols = [
        ...newCols,
        {
          headerName: "Actions",
          id: "action",
          sticky: "right",
          disableSortBy: true,
          isFixed: true,
          cellRenderer: (params) => {
            return (
              <>
                <IconButton
                  onClick={() => {
                    props.setSelectedStyleId(params.data.style);
                    navigate(
                      `/product-unit-definition/create/${params.data.style}`
                    );
                  }}
                  size="large"
                  disabled={params.data.disableCreateSelection ? true : false}
                >
                  <AddIcon />
                </IconButton>
              </>
            );
          },
          suppressMenu: true,
          lockPosition: "right",
        },
      ];
      setcols(newCols);
    }
  }, [props.styleTableCols]);
  return (
    <Loader loader={props.isLoading}>
      <div data-testid="resultContainer">
        <Typography
          variant="h6"
          gutterBottom
          className={globalClasses.marginBottom}
        >
          {`Filtered ${captializeStringIfCamelCase(
            dynamicLabelsBasedOnTenant("product", "core")
          )}`}
        </Typography>
        {cols.length > 0 && (
          <AgGridTable
            columns={cols}
            selectAllHeaderComponent={false}
            sizeColumnsToFitFlag
            onGridChanged
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            uniqueRowId={"pg_code"}
            loadTableInstance={(instance) =>
              (ref.stylesDashboardTableRef.current = instance)
            }
            suppressClickEdit={true}
          />
        )}
      </div>
    </Loader>
  );
});
const mapStateToProps = (state) => {
  return {
    isLoading: state.UnitDefnReducer.isLoading,
    styleData: state.UnitDefnReducer.stylesData,
    styleCount: state.UnitDefnReducer.stylesDataCount,
    styleTableCols: state.UnitDefnReducer.stylesTableCols,
    selectedFilters:
      state.filterReducer.selectedFilters["product unit definition"],
    showTable: state.UnitDefnReducer.showStylesTable,
    currentPageIndex: state.UnitDefnReducer.currentPageIndex,
    currentPageSize: state.UnitDefnReducer.currentPageSize,
    dataChanged: state.UnitDefnReducer.dataChanged,
    dataType: state.UnitDefnReducer.dataType,
    planningLevelHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .planningLevelHierarchy,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
  };
};

const mapActionsToProps = {
  setSelectedStyleId,
  setUnitDefns,
  fetchUnitDefns,
  ToggleLoader,
  changeDataStatus,
};

export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ViewStyles);
