import { API_POST_BODY_META_DATA } from "config/constants";
import { forwardRef, useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  ToggleLoader,
  fetchProductGroups,
  addSelectedGroups,
  newGrpsInEdit,
  deletedGrpsInEdit,
} from "core/pages/product-grouping/product-grouping-service";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  getDependency,
  modifyEditOrDeleteUpdateObject,
  updateEditLevelData,
} from "./common-product-group-functions";
import AgGridComponent from "core/Utils/agGrid";
import { cloneDeep } from "lodash";
import { appendPropertiesToTableInstance } from "core/Utils/agGrid/table-functions";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";

const ManualProductGroupTable = forwardRef((props, ref) => {
  const [grpColumns, setgroupColumns] = useState([]);
  const [includedGroups, setIncludedGroups] = useState([]);
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  useEffect(() => {
    if (ref.productGroupLvlRef.current) {
      const appendPropertyObject = {
        filterDependency: cloneDeep(props.selectedFilters),
        newEditGrps: cloneDeep(props.newEditGrps),
        deleteEditGrps: cloneDeep(props.deleteEditGrps),
        selectedGroupType: cloneDeep(props.selectedGroupType),
        filteredProducts: cloneDeep(props.filteredProducts),
        selectedGrps: cloneDeep(props.selectedGrps),
        includedGroups: cloneDeep(props.includedGroups),
      };
      ref.productGroupLvlRef = appendPropertiesToTableInstance(
        appendPropertyObject,
        ref.productGroupLvlRef
      );
    }
  }, [
    props.selectedFilters,
    props.newEditGrps,
    props.deleteEditGrps,
    props.selectedGroupType,
    props.filteredProducts,
    props.selectedGrps,
    includedGroups,
  ]);

  // Might be used or required later for validation after confirmation TO DO
  // const selectGrpLevelIndexes = (dataOutput) => {
  //   dataOutput.forEach((grp, idx) => {
  //     if (props.isEdit) {
  //       //If it is mapped and not present in deleted window
  //       //selectedindex = true
  //       if (grp.is_mapped) {
  //         if (
  //           !props.deleteEditGrps.some((delGrp) => {
  //             return delGrp.pg_code === grp.pg_code;
  //           })
  //         ) {
  //           grp.is_selected = true;
  //         }
  //       } else {
  //         //If it is not mapped and present in add window
  //         //selectedindex = true
  //         if (
  //           props.newEditGrps.some((newGrp) => {
  //             return newGrp.pg_code === grp.pg_code;
  //           })
  //         ) {
  //           grp.is_selected = true;
  //         }
  //       }
  //     } else {
  //       if (
  //         props.selectedGrps.some((selGrp) => {
  //           return selGrp.pg_code === grp.pg_code;
  //         })
  //       ) {
  //         grp.is_selected = true;
  //       }
  //     }
  //   });
  //   return dataOutput;
  // };

  const getEditedTableConfiguration = (params) => {
    if (ref.isCancelledOrUpdatedGroups.current) {
      return [
        {
          searchColumns: {
            is_mapped: {
              filterType: "bool",
              filter: true,
            },
          },
        },
      ];
    } else {
      return [
        {
          searchColumns: {
            is_mapped: {
              filterType: "bool",
              filter: true,
            },
          },
          checkAll: true,
        },
        ...(params?.api?.checkConfiguration || []),
      ];
    }
  };
  const getType = async () => {
    const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
      attribute_name: "display_levels",
    });
    let hasGroupingConfig = Boolean(
      displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
        "productGrouping"
      ]
    );
    const requiredConfig = hasGroupingConfig
      ? displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
          "productGrouping"
        ]
      : displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
          "product"
        ];
    const type = requiredConfig?.["default"] !== "product";
    return type;
  };

  const fetchGroupsData = async (body, pageIndex, params) => {
    props.ToggleLoader(true);
    const reqBody = getDependency(
      params?.api?.filterDependency || props.selectedFilters
    );
    if (reqBody.length === 0) {
      setIncludedGroups([]);
      props.ToggleLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
    let manualbody = {
      meta: { ...body, limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 } },
      filters: reqBody,
      definitions: [],
      metrics: [],
      selection: {
        data: props.isEdit
          ? getEditedTableConfiguration(params)
          : params?.api?.checkConfiguration || [],
        unique_columns: ["pg_code"],
      },
    };
    const isStyleType = await getType();
    if (props.isEdit) {
      const grpId = props.pathname.split("/")[5];
      const res = await props.fetchProductGroups(
        manualbody,
        grpId,
        pageIndex + 1,
        isStyleType ? "aggregation" : null
      );
      setIncludedGroups(res.data.data);
      ref.isCancelledOrUpdatedGroups.current = false;
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } else {
      const res = await props.fetchProductGroups(
        manualbody,
        "",
        pageIndex + 1,
        isStyleType ? "aggregation" : null
      );
      setIncludedGroups(res.data.data);
      ref.isCancelledOrUpdatedGroups.current = false;
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      props.ToggleLoader(true);
      let cols = await props.getColumnsAg("table_name=product_group");
      cols = cols.map((col) => {
        let colTemp = {...col};
        if (col.column_name === "products") { 
          colTemp.accessor = "product_count";
        }
        if (col.column_name === "name") {
          colTemp.key = "newname";
        }
        if (
          col.accessor === "defintion_ids" ||
          col.accessor === "product_group_definitions"
        ) {
          colTemp.cellRenderer = (params) => {
            return params.data.special_classification !== "manual" ||
              !params.data.product_group_definitions ||
              params.data.product_group_definitions === 0
              ? "-"
              : params.data.product_group_definitions[0].name;
          };
          colTemp.tooltipField = "definitions";
        }
        return colTemp;
      });
      setgroupColumns(cols);
      props.ToggleLoader(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (props.selectedGroupType === "manual") {
      fetchGroupsData(API_POST_BODY_META_DATA, 0, 10);
    } else {
      setIncludedGroups([]);
      props.addSelectedGroups([]);
    }
  }, [props.filteredProducts]);

  const grpSelectionHandler = (event) => {
    const grps = event.api.getSelectedRows();
    if (props.isEdit) {
      //selected rows
      //Already mapped - and in delete window - Remove from Delete
      //Not mapped -
      //If it is not mapped => Add it to new window
      //If it is mapped and excluded => Add it to delete window
      let editOrDeleteUpdateObject = {
        should_include_in_delete: [],
        should_exclude_in_delete: [],
        should_include_in_new: [],
        should_exclude_in_new: [],
      };
      const unselectdRows = (event.api.includedGroups || includedGroups).filter(
        (prod) => {
          return !grps.some((select) => {
            return select.pg_code === prod.pg_code;
          });
        }
      );

      editOrDeleteUpdateObject = modifyEditOrDeleteUpdateObject(
        grps,
        event.api.deleteEditGrps || props.deleteEditGrps,
        event.api.newEditGrps || props.newEditGrps,
        editOrDeleteUpdateObject,
        "pg_code",
        false
      );
      editOrDeleteUpdateObject = modifyEditOrDeleteUpdateObject(
        unselectdRows,
        event.api.deleteEditGrps || props.deleteEditGrps,
        event.api.newEditGrps || props.newEditGrps,
        editOrDeleteUpdateObject,
        "pg_code",
        true
      );
      const [updatedDelete, updatedNew] = updateEditLevelData(
        event.api.deleteEditGrps || props.deleteEditGrps,
        event.api.newEditGrps || props.newEditGrps,
        editOrDeleteUpdateObject,
        "pg_code"
      );
      props.newGrpsInEdit(updatedNew);
      props.deletedGrpsInEdit(updatedDelete);
    } else {
      props.addSelectedGroups(grps);
    }
  };

  return (
    <>
      <div className={`${globalClasses.marginTop}`}>

        {grpColumns.length > 0 && (
          <AgGridComponent
            columns={grpColumns}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            onGridChanged
            onRowSelected
            manualCallBack={(body, pageIndex, params) =>
              fetchGroupsData(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSizeGrouping || 20}
            paginationPageSize={props.pageSizeGrouping || 20}
            uniqueRowId={"pg_code"}
            suppressClickEdit={true}
            loadTableInstance={(gridInstance) => {
              ref.productGroupLvlRef.current = gridInstance;
            }}
            onSelectionChanged={grpSelectionHandler}
            tableHeader={`Filtered Groups`}
          />
        )}
      </div>
    </>
  );
});
const mapStateToProps = (state) => {
  return {
    groupsCols: [...state.productGroupReducer.groupsTableCols],
    selectedGroupType: state.productGroupReducer.selectedGroupType,
    selectedManualFilterType:
      state.productGroupReducer.selectedManualFilterType,
    selectedCluster: state.productGroupReducer.selectedCluster,
    filteredProducts: state.productGroupReducer.manualFilteredProducts,
    selectedGrps: state.productGroupReducer.manualselectedGroups,
    newEditGrps: state.productGroupReducer.newGrpsInEdit,
    deleteEditGrps: state.productGroupReducer.deletedGrpsInEdit,
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};

const mapActionsToProps = {
  ToggleLoader,
  getColumnsAg,
  fetchProductGroups,
  addSelectedGroups,
  newGrpsInEdit,
  deletedGrpsInEdit,
  getTenantConfigApplicationLevel,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualProductGroupTable);
