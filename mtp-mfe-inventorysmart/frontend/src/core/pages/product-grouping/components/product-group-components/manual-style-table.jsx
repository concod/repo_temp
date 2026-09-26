import { connect } from "react-redux";
import {
  fetchDataForTable,
  filterProductsOrGroupsArray,
  filterSelectionArray,
  getTableAPIFiltersForCreateGroup,
} from "./common-product-group-functions";
import { forwardRef, useEffect, useState } from "react";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  ToggleLoader,
  setStyleTableCols,
  fetchStyleLevelData,
  setStyleTableData,
  setSelectedManualStyles,
  setSelectedProducts,
  setDeletedStylesInDefn,
  setDeletedProdsInDefn,
} from "core/pages/product-grouping/product-grouping-service";
import AgGridComponent from "core/Utils/agGrid";
import { cloneDeep } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { appendPropertiesToTableInstance } from "core/Utils/agGrid/table-functions";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

const coreScreenConfig = localStorage.getItem("coreScreenNames");
const productLimit =
  coreScreenConfig?.attribute_value?.product_group_product_limit || 15000;

const ManualStyleTable = forwardRef((props, ref) => {
  const [totalCount, setTotalCount] = useState(null);
  const [alertData, setAlertData] = useState({});
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [deSelections, setDeselections] = useState([]);
  // Might be used or required later for validation after confirmation TO DO
  // const setStyleLevelIndexes = (dataOutput) => {
  //   dataOutput.data.forEach((style, idx) => {
  //     if (props.selectedManualFilterType === "grouping_definitions") {
  //       if (
  //         !props.deletedDefnStyles.some((delStyle) => {
  //           return delStyle.style === style.style;
  //         })
  //       ) {
  //         style.is_selected = true;
  //       }
  //     } else {
  //       if (
  //         props.selectedStyles.some((selStyle) => {
  //           return selStyle.style === style.style;
  //         }) &&
  //         style.product_codes.some((styleprod) => {
  //           return props.selectedProducts.some((prods) => {
  //             return prods.product_code === styleprod;
  //           });
  //         })
  //       ) {
  //         style.is_selected = true;
  //       }
  //     }
  //   });
  //   return dataOutput;
  // };

  useEffect(() => {
    if (totalCount) {
      if (totalCount > productLimit) {
        setAlertData({
          description: `Max of ${productLimit} product selections allowed to create a Product Group`,
          severity: "info",
        });
      } else {
        setAlertData({});
      }
    }
  }, [totalCount]);

  useEffect(() => {
    if (isSelectAll) {
      if (totalCount - (deSelections?.length || 0) > productLimit) {
        setAlertData({
          description: `The number of selected products exceeds the allowable limit of ${productLimit}. Please reduce the selection to proceed.`,
          severity: "error",
        });
        props.setEnableSave(false);
      } else {
        setAlertData({});
        props.setEnableSave(true);
      }
    } else {
      setAlertData({});
      props.setEnableSave(true);
    }
  }, [isSelectAll, deSelections]);

  const styleSelectionHandler = (event) => {
    const rows = event.api.getSelectedRows();
    if (event?.api?.isSelectAllRecords) {
      let deSelections = event.api
        ?.getRenderedNodes()
        ?.filter((node) => !node.selected);
      setDeselections(deSelections);
      setIsSelectAll(true);
    } else {
      setIsSelectAll(false);
      setDeselections([]);
    }
    if (
      (event.api.selectedManualFilterType || props.selectedManualFilterType) ===
      "grouping_definitions"
    ) {
      let updatedDefnDelete = filterSelectionArray(
        rows,
        event.api.deletedDefnStyles || props.deletedDefnStyles,
        "style"
      );
      const deleteRows = filterSelectionArray(
        rows,
        event.api.styleLevelData || props.styleLevelData,
        "style"
      );
      updatedDefnDelete.push(...deleteRows);
      const diffStyles = (
        event.api.deletedDefnStyles || props.deletedDefnStyles
      ).filter((style) => {
        return !updatedDefnDelete.some((updStyle) => {
          return updStyle.style === style.style;
        });
      });
      const addedStyles = updatedDefnDelete.filter((style) => {
        return !(event.api.deletedDefnStyles || props.deletedDefnStyles).some(
          (delDefnStyle) => {
            return delDefnStyle.style === style.style;
          }
        );
      });
      let updatedDefnProds = [...props.deletedDefnProds];
      addedStyles.forEach((style) => {
        style.product_codes.forEach((prd) => {
          updatedDefnProds.push({ product_code: prd });
        });
      });
      let diffProds = [];
      diffStyles.forEach((diffStyle) => {
        diffStyle.product_codes.forEach((diffProd) => {
          diffProds.push({ product_code: diffProd });
        });
      });
      updatedDefnProds = updatedDefnProds.filter((updProd) => {
        return !diffProds.some((diff) => {
          return diff.product_code === updProd.product_code;
        });
      });
      props.setDeletedStylesInDefn(updatedDefnDelete);
      props.setDeletedProdsInDefn(updatedDefnProds);
    } else {
      const deletedRows = filterProductsOrGroupsArray(
        rows,
        event.api.styleLevelData || props.styleLevelData,
        "style"
      );
      const updatedDelete = filterSelectionArray(
        deletedRows,
        event.api.selectedStyles || props.selectedStyles,
        "style"
      );

      const updatedStyles = [...updatedDelete, ...rows];
      const deletedStyles = filterSelectionArray(
        deletedRows,
        event.api.selectedStyles || props.selectedStyles,
        "style",
        true
      );
      let style_products = [];
      let deleted_style_products = [];
      updatedStyles.forEach((style) => {
        const style_prods = style.product_codes;
        if (
          !style_prods.some((prod) => {
            return (event.api.selectedProducts || props.selectedProducts).some(
              (selProd) => {
                return prod === selProd.product_code;
              }
            );
          })
        ) {
          style.product_codes.forEach((style_prod) => {
            style_products.push({ product_code: style_prod });
          });
        }
      });
      (event.api.selectedProducts || props.selectedProducts).forEach(
        (selProd) => {
          deletedStyles.forEach((delStyle) => {
            if (
              delStyle.product_codes.some((code) => {
                return code === selProd.product_code;
              })
            ) {
              deleted_style_products.push(selProd);
            }
          });
        }
      );
      let updatedDeleteProds = (
        event.api.selectedProducts || props.selectedProducts
      ).filter((prod) => {
        return !deleted_style_products.some((selection) => {
          return selection.product_code === prod.product_code;
        });
      });
      props.setSelectedManualStyles(updatedStyles);
      props.setSelectedProducts([...updatedDeleteProds, ...style_products]);
    }
  };

  useEffect(() => {
    if (ref.styleLvlRef.current) {
      const appendPropertyObject = {
        filterDependency: cloneDeep(props.selectedFilters),
        selectedStyles: cloneDeep(props.selectedStyles),
        selectedProducts: cloneDeep(props.selectedProducts),
        selectedGroupType: cloneDeep(props.selectedGroupType),
        selectedManualFilterType: cloneDeep(props.selectedManualFilterType),
        manualDefinitionFilter: cloneDeep(props.manualDefinitionFilter),
        deletedDefnStyles: cloneDeep(props.deletedDefnStyles),
        styleLevelData: cloneDeep(props.styleLevelData),
      };
      ref.styleLvlRef = appendPropertiesToTableInstance(
        appendPropertyObject,
        ref.styleLvlRef
      );
    }
  }, [
    props.selectedFilters,
    props.selectedStyles,
    props.selectedProducts,
    props.selectedGroupType,
    props.selectedManualFilterType,
    props.manualDefinitionFilter,
    props.deletedDefnStyles,
    props.styleLevelData,
  ]);
  const fetchDataForStyleTable = async (body, pageIndex, params, type) => {
    const APIFunction = {
      style: [props.fetchStyleLevelData, props.setStyleTableData],
    };
    let manualbody = getTableAPIFiltersForCreateGroup(
      body,
      params.api.filterDependency || props.selectedFilters,
      type,
      params.api.selectedGroupType || props.selectedGroupType,
      params.api.manualDefinitionFilter || props.manualDefinitionFilter,
      params.api.selectedManualFilterType || props.selectedManualFilterType,
      props.selectedCluster
    );
    if (
      (params.api.selectedManualFilterType ||
        props.selectedManualFilterType) !== "grouping_definitions" &&
      manualbody.filters.length === 0
    ) {
      return {
        data: [],
        totalCount: 0,
      };
    }
    try {
      props.ToggleLoader(true);
      manualbody = {
        ...manualbody,
        meta: {
          ...manualbody.meta,
          limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 },
        },
        selection: {
          data: !props.isEdit
            ? params?.api?.checkConfiguration
            : [
                {
                  searchColumns: {
                    is_mapped: {
                      filterType: "bool",
                      filter: true,
                    },
                  },
                  checkAll: true,
                },
                ...params?.api?.checkConfiguration,
              ],
          unique_columns: [dynamicLabelKeysBasedOnTenant("style", "core")],
        },
      };
      let dataOutput = await fetchDataForTable(
        manualbody,
        pageIndex + 1,
        props.pageSizeGrouping || 20,
        APIFunction,
        props.isEdit,
        "style",
        props.pathname,
        props.level
      );
      ref.isCancelledOrUpdated.current = false;
      setTotalCount(dataOutput.totalCount);
      props.ToggleLoader(false);
      return {
        data: agGridRowFormatter(
          dataOutput.data,
          ref.styleLvlRef.current.api.checkConfiguration || [],
          dynamicLabelKeysBasedOnTenant("style", "core")
        ),
        totalCount: dataOutput.totalCount,
      };
    } catch (error) {
      //Error handling
      props.ToggleLoader(false);
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      props.ToggleLoader(true);
      const cols = await props.getColumnsAg(
        "table_name=product_group_filter_hierarchy"
      );
      props.setStyleTableCols(cols);
      props.ToggleLoader(false);
    };
    fetchData();
  }, []);
  return (
    <>
      <AgGridComponent
        onRowSelected
        columns={props.styleLevelCols}
        selectAllHeaderComponent={
          props.selectedManualFilterType !== "grouping_definitions"
        }
        sizeColumnsToFitFlag
        onGridChanged
        manualCallBack={(body, pageIndex, params) =>
          fetchDataForStyleTable(body, pageIndex, params, "style")
        }
        rowModelType="serverSide"
        serverSideStoreType="partial"
        cacheBlockSize={props.pageSizeGrouping || 20}
        paginationPageSize={props.pageSizeGrouping || 20}
        uniqueRowId={dynamicLabelKeysBasedOnTenant("style", "core")}
        suppressClickEdit={true}
        loadTableInstance={(gridInstance) => {
          ref.styleLvlRef.current = gridInstance;
        }}
        onSelectionChanged={styleSelectionHandler}
        topRightOptions={props.topRightCheckbox()}
        tableHeader={props.tableHeader}
        topLeftOptions={props.topLeftOptions()}
        topCenterOptions={props.topCenterOptions(alertData, setAlertData)}
      />
    </>
  );
});

const mapStateToProps = (state) => {
  return {
    selectedStyles: state.productGroupReducer.selectedStyles,
    selectedProducts: state.productGroupReducer.selectedProducts,
    resetFilterTable: state.productGroupReducer.resetTable,
    selectedGroupType: state.productGroupReducer.selectedGroupType,
    selectedManualFilterType:
      state.productGroupReducer.selectedManualFilterType,
    selectedCluster: state.productGroupReducer.selectedCluster,
    filteredProductsCount:
      state.productGroupReducer.manualFilteredProductsCount,
    styleLevelData: state.productGroupReducer.styleLevelTableData,
    styleLevelDataCount: state.productGroupReducer.styleLevelTableCount,
    styleFiltersTableState: state.tableReducer.tableState["style_filters"],
    deletedDefnStyles: state.productGroupReducer.deletedDefnStyles,
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};
const mapActionsToProps = {
  ToggleLoader,
  setStyleTableCols,
  setStyleTableData,
  fetchStyleLevelData,
  setSelectedManualStyles,
  setSelectedProducts,
  setDeletedStylesInDefn,
  setDeletedProdsInDefn,
  getColumnsAg,
  addSnack,
};
export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualStyleTable);
