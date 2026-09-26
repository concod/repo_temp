import { connect } from "react-redux";
import {
  fetchDataForTable,
  filterProductsOrGroupsArray,
  filterSelectionArray,
  getTableAPIFiltersForCreateGroup,
  getEditedTableConfiguration,
} from "./common-product-group-functions";
import { forwardRef, useEffect } from "react";
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
const ManualStyleTable = forwardRef((props, ref) => {
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

  const styleSelectionHandler = (event) => {
    const rows = event.api.getSelectedRows();
    if (
      (event.api.selectedManualFilterType || props.selectedManualFilterType) ===
      "grouping_definitions"
    ) {
      let updatedDefnDelete = filterSelectionArray(
        rows,
        event.api.deletedDefnStyles || props.deletedDefnStyles,
        dynamicLabelKeysBasedOnTenant("style", "core")
      );
      const deleteRows = filterSelectionArray(
        rows,
        event.api.styleLevelData || props.styleLevelData,
        dynamicLabelKeysBasedOnTenant("style", "core"),
        false
      );
      updatedDefnDelete.push(...deleteRows);
      const diffStyles = (
        event.api.deletedDefnStyles || props.deletedDefnStyles
      ).filter((style) => {
        return !updatedDefnDelete.some((updStyle) => {
          return (
            updStyle[dynamicLabelKeysBasedOnTenant("style", "core")] ===
            style[dynamicLabelKeysBasedOnTenant("style", "core")]
          );
        });
      });
      const addedStyles = updatedDefnDelete.filter((style) => {
        return !(event.api.deletedDefnStyles || props.deletedDefnStyles).some(
          (delDefnStyle) => {
            return (
              delDefnStyle[dynamicLabelKeysBasedOnTenant("style", "core")] ===
              style.style
            );
          }
        );
      });
      let updatedDefnProds = [
        ...(event?.api?.deletedDefnProds || props?.deletedDefnProds || []),
      ];
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
        dynamicLabelKeysBasedOnTenant("style", "core")
      );
      const updatedDelete = filterSelectionArray(
        deletedRows,
        event.api.selectedStyles || props.selectedStyles,
        dynamicLabelKeysBasedOnTenant("style", "core")
      );

      const updatedStyles = [...updatedDelete, ...rows];
      const deletedStyles = filterSelectionArray(
        deletedRows,
        event.api.selectedStyles || props.selectedStyles,
        dynamicLabelKeysBasedOnTenant("style", "core"),
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
        deletedDefnProds: cloneDeep(props.deletedDefnProds),
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

    if (
      (params.api.selectedManualFilterType ||
        props.selectedManualFilterType) === "grouping_definitions" &&
      (manualbody?.definitions || [])?.length === 0
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
          limit: { limit: 10, page: pageIndex + 1 },
        },
        selection: {
          data: props.isEdit
            ? getEditedTableConfiguration(params, ref)
            : params.api.selectedManualFilterType === "grouping_definitions"
            ? [
                {
                  searchColumns: {},
                  checkAll: true,
                },
                ...(params?.api?.checkConfiguration || []),
              ]
            : ref.isCancelledOrUpdated.current
            ? []
            : params?.api?.checkConfiguration,
          unique_columns: [dynamicLabelKeysBasedOnTenant("style", "core")],
        },
      };
      let dataOutput = await fetchDataForTable(
        manualbody,
        pageIndex + 1,
        10,
        APIFunction,
        props.isEdit,
        "style",
        props.pathname,
        props.level
      );
      ref.isCancelledOrUpdated.current = false;
      props.ToggleLoader(false);
      return dataOutput;
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
        selectAllHeaderComponent={true}
        sizeColumnsToFitFlag
        onGridChanged
        manualCallBack={(body, pageIndex, params) =>
          fetchDataForStyleTable(body, pageIndex, params, "style")
        }
        rowModelType="serverSide"
        serverSideStoreType="partial"
        cacheBlockSize={10}
        ignoreClearSelectionOnSearchandSort={true}
        uniqueRowId={dynamicLabelKeysBasedOnTenant("style", "core")}
        suppressClickEdit={true}
        loadTableInstance={(gridInstance) => {
          ref.styleLvlRef.current = gridInstance;
        }}
        onSelectionChanged={styleSelectionHandler}
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
