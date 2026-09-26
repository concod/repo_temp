import { connect } from "react-redux";
import {
  fetchDataForTable,
  getTableAPIFiltersForCreateGroup,
  filterProductsOrGroupsArray,
  modifyEditOrDeleteUpdateObject,
  updateEditLevelData,
} from "./common-product-group-functions";
import {
  setSelectedProducts,
  setDeletedStylesInDefn,
  setDeletedProdsInDefn,
  setSelectedManualStyles,
  fetchProdGrpFilteredProducts,
  setProdGroupFilteredProds,
  newRowsInEdit,
  deletedRowsInEdit,
  ToggleLoader,
} from "core/pages/product-grouping/product-grouping-service";
import { addSnack } from "core/actions/snackbarActions";
import { forwardRef, useEffect, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { cloneDeep } from "lodash";
import { appendPropertiesToTableInstance } from "core/Utils/agGrid/table-functions";

const coreScreenConfig = localStorage.getItem("coreScreenNames");
const productLimit =
  coreScreenConfig?.attribute_value?.product_group_product_limit || 15000;

const ManualProductTable = forwardRef((props, ref) => {
  const [totalCount, setTotalCount] = useState(null);
  const [alertData, setAlertData] = useState({});
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [deSelections, setDeselections] = useState([]);

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

  const setProductLevelIndexes = (dataOutput, params) => {
    dataOutput.data.map((prod, idx) => {
      prod.is_selected = false;
      //In Edit If it is mapped and not present in deleted window
      if (
        props.isEdit &&
        prod.is_mapped &&
        (!(params.api.deleteEditProds || props.deleteEditProds).some(
          (delProd) => {
            return delProd.product_code === prod.product_code;
          }
        ) ||
          (params.api.selectedProducts || props.selectedProducts).some(
            (selProd) => {
              return selProd.product_code === prod.product_code;
            }
          ))
      ) {
        prod.is_selected = true;
      }

      if (
        props.isEdit &&
        !prod.is_mapped &&
        ((params.api.newEditProds || props.newEditProds).some((newProd) => {
          return newProd.product_code === prod.product_code;
        }) ||
          (params.api.selectedProducts || props.selectedProducts).some(
            (selProd) => {
              return selProd.product_code === prod.product_code;
            }
          ))
      ) {
        prod.is_selected = true;
      }

      if (
        !props.isEdit &&
        (params.api.selectedManualFilterType ||
          props.selectedManualFilterType) === "grouping_definitions" &&
        !(params.api.deletedDefnProds || props.deletedDefnProds).some(
          (selProd) => {
            return selProd.product_code === prod.product_code;
          }
        )
      ) {
        prod.is_selected = true;
      }

      if (
        !props.isEdit &&
        (params.api.selectedManualFilterType ||
          props.selectedManualFilterType) !== "grouping_definitions" &&
        (params.api.selectedProducts || props.selectedProducts).some(
          (selProd) => {
            return selProd.product_code === prod.product_code;
          }
        )
      ) {
        prod.is_selected = true;
      }
      return prod;
    });
    return dataOutput;
  };

  useEffect(() => {
    if (ref.productLvlRef.current) {
      const appendPropertyObject = {
        filterDependency: cloneDeep(props.selectedFilters),
        newEditProds: cloneDeep(props.newEditProds),
        deleteEditProds: cloneDeep(props.deleteEditProds),
        selectedGroupType: cloneDeep(props.selectedGroupType),
        deletedDefnProds: cloneDeep(props.deletedDefnProds),
        filteredProducts: cloneDeep(props.filteredProducts),
        deletedDefnStyles: cloneDeep(props.deletedDefnStyles),
        selectedStyles: cloneDeep(props.selectedStyles),
        selectedCluster: props.selectedCluster,
        selectedManualFilterType: props.selectedManualFilterType,
        manualDefinitionFilter: props.manualDefinitionFilter,
      };
      ref.productLvlRef = appendPropertiesToTableInstance(
        appendPropertyObject,
        ref.productLvlRef
      );
    }
  }, [
    props.selectedFilters,
    props.newEditProds,
    props.deleteEditProds,
    props.selectedGroupType,
    props.deletedDefnProds,
    props.filteredProducts,
    props.deletedDefnStyles,
    props.selectedStyles,
    props.selectedCluster,
    props.selectedGroupType,
    props.selectedManualFilterType,
    props.manualDefinitionFilter,
  ]);
  /**
   *
   * @param {*} rows
   * This logic will change once we migrate to aggrid
   */
  const rowSelectionHandler = (event) => {
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
    if ((event.api.selectedGroupType || props.selectedGroupType) !== "manual") {
      props.setSelectedProducts(rows);
    } else {
      if (
        (event.api.selectedManualFilterType ||
          props.selectedManualFilterType) === "grouping_definitions"
      ) {
        let updatedDefnDelete = (
          event.api.deletedDefnProds || props.deletedDefnProds
        ).filter((prod) => {
          return !rows.some((selection) => {
            return selection.product_code === prod.product_code;
          });
        });
        const deleteRows = filterProductsOrGroupsArray(
          rows,
          event.api.filteredProducts || props.filteredProducts,
          "product_code"
        );
        updatedDefnDelete.push(...deleteRows);
        let updatedStyles = [];
        (event.api.deleteProdsInDefn || props.deletedDefnStyles).forEach(
          (style) => {
            if (
              style.product_codes.some((prod_code) => {
                return updatedDefnDelete.some((selProd) => {
                  return selProd.product_code === prod_code;
                });
              })
            ) {
              updatedStyles.push(style);
            }
          }
        );
        props.setDeletedStylesInDefn(updatedStyles);
        props.setDeletedProdsInDefn(updatedDefnDelete);
      } else {
        if (props.isEdit) {
          //selected rows
          //Already mapped - and in delete window - Remove from Delete
          //Not mapped -
          //If it is not mapped => Add it to new window
          //If it is mapped and excluded => Add it to delete window
          let editOrDeleteUpdateObject = {
            should_include_in_delete: [],
            should_exclude_in_delete: [],
            should_exclude_in_new: [],
            should_include_in_new: [],
          };
          const unselectdRows = (
            event.api.filteredProducts || props.filteredProducts
          ).filter((prod) => {
            return !rows.some((select) => {
              return select.product_code === prod.product_code;
            });
          });
          editOrDeleteUpdateObject = modifyEditOrDeleteUpdateObject(
            rows,
            event.api.deleteEditProds || props.deleteEditProds,
            event.api.newEditProds || props.newEditProds,
            editOrDeleteUpdateObject,
            "product_code",
            false
          );
          editOrDeleteUpdateObject = modifyEditOrDeleteUpdateObject(
            unselectdRows,
            event.api.deleteEditProds || props.deleteEditProds,
            event.api.newEditProds || props.newEditProds,
            editOrDeleteUpdateObject,
            "product_code",
            true
          );
          const [updatedDelete, updatedNew] = updateEditLevelData(
            event.api.deleteEditProds || props.deleteEditProds,
            event.api.newEditProds || props.newEditProds,
            editOrDeleteUpdateObject,
            "product_code"
          );
          let updatedStyleProds = [
            ...rows,
            ...((event.api.selectedProducts || props.selectedProducts) || []),
          ];
          (event.api.selectedStyles || props.selectedStyles).forEach(
            (style) => {
              style.product_codes.forEach((style_prod) => {
                if (
                  editOrDeleteUpdateObject.should_include_in_new.some(
                    (incProd) => {
                      return incProd.product_code === style_prod;
                    }
                  ) ||
                  editOrDeleteUpdateObject.should_exclude_in_delete.some(
                    (incDelProd) => {
                      return incDelProd.product_code === style_prod;
                    }
                  )
                ) {
                  updatedStyleProds.push({ product_code: style_prod });
                }
                if (
                  editOrDeleteUpdateObject.should_include_in_delete.some(
                    (delProd) => {
                      return delProd.product_code === style_prod;
                    }
                  ) ||
                  editOrDeleteUpdateObject.should_exclude_in_new.some(
                    (delNewProd) => {
                      return delNewProd.product_code === style_prod;
                    }
                  )
                ) {
                  const index = updatedStyleProds.findIndex((styleProd) => {
                    return styleProd.product_code === style_prod;
                  });
                  if (index >= 0) {
                    updatedStyleProds.splice(index, 1);
                  }
                }
              });
            }
          );
          props.newRowsInEdit(updatedNew);
          props.deletedRowsInEdit(updatedDelete);
          props.setSelectedProducts(updatedStyleProds);
        } else {
          let updatedStyles = [];
          (event.api.selectedStyles || props.selectedStyles).forEach(
            (style) => {
              if (
                style.product_codes.some((prod_code) => {
                  return rows.some((selProd) => {
                    return selProd.product_code === prod_code;
                  });
                })
              ) {
                updatedStyles.push(style);
              }
            }
          );
          props.setSelectedProducts(rows);
          props.setSelectedManualStyles(updatedStyles);
        }
      }
    }
  };

  const getEditedTableConfiguration = (params) => {
    if (ref.isCancelledOrUpdated.current) {
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
  const fetchDataForProductTable = async (body, pageIndex, params, type) => {
    const APIFunction = {
      product: [
        props.fetchProdGrpFilteredProducts,
        props.setProdGroupFilteredProds,
      ],
    };
    let manualbody = getTableAPIFiltersForCreateGroup(
      body,
      params.api.filterDependency || props.selectedFilters,
      type,
      params.api.selectedGroupType || props.selectedGroupType,
      params.api.manualDefinitionFilter || props.manualDefinitionFilter,
      params.api.selectedManualFilterType || props.selectedManualFilterType,
      params.api.selectedCluster || props.selectedCluster
    );
    if (
      (params.api.selectedManualFilterType !== "grouping_definitions" &&
        manualbody.filters.length === 0) ||
      (params.api.selectedManualFilterType === "grouping_definitions" &&
        manualbody.definitions.length === 0)
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
          data: props.isEdit
            ? getEditedTableConfiguration(params)
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
          unique_columns: ["product_code"],
        },
      };
      let dataOutput = await fetchDataForTable(
        manualbody,
        pageIndex + 1,
        props.pageSizeGrouping || 20,
        APIFunction,
        props.isEdit,
        "product",
        props.pathname
      );
      ref.isCancelledOrUpdated.current = false;
      setTotalCount(dataOutput.totalCount);
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
  return (
    <>
      <AgGridComponent
        columns={props.columns}
        selectAllHeaderComponent={
          props.selectedManualFilterType !== "grouping_definitions"
        }
        onRowSelected
        sizeColumnsToFitFlag
        onGridChanged
        manualCallBack={(body, pageIndex, params) =>
          fetchDataForProductTable(body, pageIndex, params, "product")
        }
        rowModelType="serverSide"
        serverSideStoreType="partial"
        disablePaginationForSinglePage
        cacheBlockSize={props.pageSizeGrouping || 20}
        paginationPageSize={props.pageSizeGrouping || 20}
        uniqueRowId={"product_code"}
        suppressClickEdit={true}
        loadTableInstance={(gridInstance) => {
          ref.productLvlRef.current = gridInstance;
        }}
        onSelectionChanged={rowSelectionHandler}
        suppressColumnVirtualisation={true}
        topRightOptions={props.topRightCheckbox()}
        tableHeader={props.tableHeader}
        topLeftOptions={props.topLeftOptions()}
        topCenterOptions={props.topCenterOptions(alertData, setAlertData)}
        nestedTable={props.nestedTable}
        nestedTableComponent={props.nestedTableComponent}
      />
    </>
  );
});

const mapStateToProps = (state) => {
  return {
    selectedProducts: state.productGroupReducer.selectedProducts,
    deletedDefnProds: state.productGroupReducer.deleteProdsInDefn,
    resetFilterTable: state.productGroupReducer.resetTable,
    filteredProducts: state.productGroupReducer.manualFilteredProducts,
    selectedStyles: state.productGroupReducer.selectedStyles,
    selectedGroupType: state.productGroupReducer.selectedGroupType,
    selectedManualFilterType:
      state.productGroupReducer.selectedManualFilterType,
    filteredProductsCount:
      state.productGroupReducer.manualFilteredProductsCount,
    newEditProds: state.productGroupReducer.newProdsInEdit,
    deleteEditProds: state.productGroupReducer.deletedProdsInEdit,
    deletedDefnStyles: state.productGroupReducer.deletedDefnStyles,
    productFiltersTableState: state.tableReducer.tableState["product_filters"],
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};

const mapActionsToProps = {
  setSelectedProducts,
  setDeletedProdsInDefn,
  setDeletedStylesInDefn,
  setSelectedManualStyles,
  fetchProdGrpFilteredProducts,
  setProdGroupFilteredProds,
  newRowsInEdit,
  deletedRowsInEdit,
  ToggleLoader,
  addSnack,
};

export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(ManualProductTable);
