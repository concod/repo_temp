import { Paper, Grid } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import AgGridTable from "core/Utils/agGrid";
import { checkForEmptyTableUserConfig } from "core/Utils/functions/utils";
import { storeGrouping } from "config/routes";
import { Prompt, Button, Checkbox } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import RequestsTable from "core/pages/product-grouping/components/product-group-components/clusterRequestsTable";
import { forwardRef, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { setSelectedFilters } from "../../../actions/filterAction";
import { addSnack } from "../../../actions/snackbarActions";
import { getColumnsAg } from "../../../actions/tableColumnActions";

import {
  ToggleLoader,
  addSelectedGroups,
  addToExistingStores,
  addStoresToGroups,
  deletedGrpsInEdit,
  deletedRowsInEdit,
  fetchStoreGroupCustomClusterInfo,
  fetchStoreGroups,
  fetchStoreGrpFilteredStores,
  newGrpsInEdit,
  newRowsInEdit,
  setClassificationValue,
  setClusterParamters,
  setClusterTimeFormat,
  setClusterTimePeriod,
  setGroupsCols,
  setSelectedCluster,
  setSelectedClusterFilters,
  setSelectedStores,
  setSelectedStoresSelectAllState,
  setStoreGroupCustomLoaderValue,
  setStoreGroupFilteredStores,
  updateGrp,
} from "../services-store-grouping/custom-store-group-service";
import {
  capitalizeFirstLetterDropdown,
  formatFiltersDependency,
  handleErrorMessage,
  renderGroupTypeCell,
} from "./common-functions";
import "./groupTable.scss";
import GroupName from "./storeGroupName";
import { fetchGradeList } from "core/pages/store-grading/grading-services";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";

const FilteredStores = forwardRef((props, ref) => {
  const globalClasses = globalStyles();
  const [open, setopen] = useState(false);
  const navigate = useNavigate();
  let location = useLocation();
  const [isIncludeGrpsChecked, setisIncludeGrpsChecked] = useState(false);
  const [grpColumns, setgroupColumns] = useState([]);
  const [columns, setColumns] = useState([]);
  const [confirmPopUp, setconfirmPopUp] = useState(false);
  const [openViewClusterStatus, setopenViewClusterStatus] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const isCancelledOrUpdated = useRef(false);
  const isCancelledOrUpdatedGrps = useRef(false);
  const isSaved = useRef(false);
  const [storeGradeFlag, setStoreGradeFlag] = useState(false);
  const [selectedRows, setSelectedRows] = useState([])
  const [confirmGoBack, setConfirmGoBack] = useState(false);
  const uniqueColRef = useRef(null);
  const hasUnsavedChanges = () => {
    if (props.isEdit) {
      if (isSaved.current || isCancelledOrUpdated.current) return false;
      return (
        props.newEditStores?.length > 0 ||
        props.deleteEditStores?.length > 0 ||
        props.newEditGrps?.length > 0 ||
        props.deleteEditGrps?.length > 0
      );
    }
    return selectedRows?.length > 0 || props.selectedStores?.length > 0 || props.selectedGrps?.length > 0;
  };

  const goBack = () => {
    if (props.isEdit) {
      const urlSplitArr = location.pathname.split("/");
      const grpId = urlSplitArr.pop();
      props.prevScr
        ? navigate(`${props.prevScr}/view/${grpId}`, {
            state: {
              prevScr: props.prevScr,
              from: location.pathname,
            },
          })
        : navigate(`${storeGrouping.viewGroup}/${grpId}`, {
            state: {
              from: location.pathname,
            },
          });
    } else {
      props.prevScr
        ? navigate(props.prevScr, {
            state: {
              from: location.pathname,
            },
          })
        : navigate(storeGrouping.home, {
            state: {
              from: history.location.pathname,
            },
          });
    }
  };

  const handleGoBack = () => {
    if (hasUnsavedChanges()) {
      setConfirmGoBack(true);
    } else {
      goBack();
    }
  };

  useEffect(() => {
    const fetchColumns = async () => {
      if (isIncludeGrpsChecked) {
        props.ToggleLoader(true);
        let cols = [];
        if (props.groupsCols.length === 0) {
          cols = await props.getColumnsAg("table_name=store_group"); 
        } else {
          cols = cloneDeep(props.groupsCols);
        }
        cols = cols.map((col) => {
          let colTemp = {...col};
          if (col.accessor === "special_classification") {
            colTemp = renderGroupTypeCell(colTemp);
          }
          return colTemp;
        });

        props.setGroupsCols(cols);
        setgroupColumns(cols);
      }
    };
    fetchColumns();
  }, [isIncludeGrpsChecked]);

  useEffect(() => {
    if (isIncludeGrpsChecked) {
      ref.storeGroupTableRef.current?.api?.refreshServerSideStore({
        purge: true,
      });
    } else {
      props.addSelectedGroups([]);
    }
  }, [isIncludeGrpsChecked, props.filteredStores]);

  useEffect(() => {
    const fetchCols = async () => {
      let cols = cloneDeep(props.columns);
      let gradeFlag = false;
      cols.forEach((item) => {
        if (item.column_name === "grade" && item.is_editable) {
          gradeFlag = true;
        }
        if (item.extra?.is_unique || item.extra?.is_unique === "true") {
          uniqueColRef.current = { uniqueCol: item.column_name };
        }
      });
      if (gradeFlag) {
        const { data } = await fetchGradeList();
        cols = cols.map((item) => {
          if (item.column_name === "grade") {
            item.options = data.data.map((item) => {
              return {
                label: item.name,
                id: item.name,
                value: item.name,
              };
            });
            item.initialData = item.options;
          }
          return item;
        });
        const formattedResponse = agGridColumnFormatter(cols);
        setColumns(formattedResponse);
        setStoreGradeFlag(true);
      } else {
        setColumns(cols);
      }
    };
    fetchCols();
  }, [props.columns]);

  useEffect(() => {
    let obj = {};
    obj["store_hierarchy"] = [];
    props.setSelectedFilters(obj);
  }, []);

  const rowSelectionHandler = (rows, data) => {
    const unselectdRows = data.filter((storeNode) => {
      return !rows.some((select) => {
        return select.store_code === storeNode.data.store_code;
      });
    });
    if (props.isEdit) {
      //selected rows
      //Already mapped - and in delete window - Remove from Delete
      //Not mapped -
      //If it is not mapped => Add it to new window
      //If it is mapped and excluded => Add it to delete window
      let should_include_in_delete = [];
      let should_exclude_in_delete = [];
      let should_include_in_new = [];
      let should_exclude_in_new = [];
      rows.forEach((row, _idx) => {
        if (row.is_mapped) {
          if (
            props.deleteEditStores.some((del) => {
              return del.store_code === row.store_code;
            })
          ) {
            should_exclude_in_delete.push(row);
          }
        } else {
          if (
            !props.newEditStores.some((newone) => {
              return newone.store_code === row.store_code;
            })
          ) {
            should_include_in_new.push(row);
          }
        }
      });
      unselectdRows.forEach((row, _idx) => {
        if (row.data.is_mapped) {
          if (
            !props.deleteEditStores.some((del) => {
              return del.store_code === row.data.store_code;
            })
          ) {
            should_include_in_delete.push(row.data);
          }
        } else {
          if (
            props.newEditStores.some((newone) => {
              return newone.store_code === row.data.store_code;
            })
          ) {
            should_exclude_in_new.push(row.data);
          }
        }
      });

      let updatedDelete = props.deleteEditStores.filter((del) => {
        return !should_exclude_in_delete.some((exclude) => {
          return exclude.store_code === del.store_code;
        });
      });
      updatedDelete = [...updatedDelete, ...should_include_in_delete];
      props.newRowsInEdit(should_include_in_new);
      props.deletedRowsInEdit(updatedDelete);
    } else {
      props.setSelectedStores(rows);
    }
  };

  const grpSelectionHandler = (grps, data) => {
    if (props.isEdit) {
      //selected rows
      //Already mapped - and in delete window - Remove from Delete
      //Not mapped -
      //If it is not mapped => Add it to new window
      //If it is mapped and excluded => Add it to delete window
      let should_include_in_delete = [];
      let should_exclude_in_delete = [];
      let should_include_in_new = [];
      let should_exclude_in_new = [];
      const unselectdRows = data.filter((prod) => {
        return !grps.some((select) => {
          return select.sg_code === prod.data.sg_code;
        });
      });
      grps.forEach((grp, _idx) => {
        if (grp.is_mapped) {
          if (
            props.deleteEditGrps.some((del) => {
              return del.sg_code === grp.sg_code;
            })
          ) {
            should_exclude_in_delete.push(grp);
          }
        } else {
          if (
            !props.newEditGrps.some((newone) => {
              return newone.sg_code === grp.sg_code;
            })
          ) {
            should_include_in_new.push(grp);
          }
        }
      });
      unselectdRows.forEach((row, _idx) => {
        if (row.data.is_mapped) {
          if (
            !props.deleteEditGrps.some((del) => {
              return del.sg_code === row.data.sg_code;
            })
          ) {
            should_include_in_delete.push(row.data);
          }
        } else {
          if (
            props.newEditGrps.some((newone) => {
              return newone.sg_code === row.data.sg_code;
            })
          ) {
            should_exclude_in_new.push(row.data);
          }
        }
      });

      let updatedDelete = props.deleteEditGrps.filter((del) => {
        return !should_exclude_in_delete.some((exclude) => {
          return exclude.sg_code === del.sg_code;
        });
      });
      updatedDelete = [...updatedDelete, ...should_include_in_delete];
      props.newGrpsInEdit(should_include_in_new);
      props.deletedGrpsInEdit(updatedDelete);
    } else {
      props.addSelectedGroups(grps);
    }
  };

  const toggleModalState = (status) => {
    if (props.isEdit) {
      onUpdate();
      return;
    }
    setopen(status);
  };

  const onUpdate = async () => {
    const body = {
      name: props.grpObj.name,
      special_classification: props.selectedGroupType,
      channel:
        props?.grpObj?.channel || (props?.allowMultiChannel ? "MC" : "NC"),
    };
    let selectedFilters = [];
    if (ref.storeFiltersRef.current) {
      const storeFilters = formatFiltersDependency(
        ref.storeFiltersRef.current,
        null,
        true
      );
      selectedFilters.push(...storeFilters);
      let selectedData = ref.storeTableRef.current?.api
        ?.getSelectedNodes()
        .map((node) => {
          return node.data;
        });
      let store_grade = selectedData
        .filter((item) => item.grade)
        .map((item) => {
          return {
            store_code: item.store_code,
            store_grade: item.grade,
          };
        });
      if (storeGradeFlag) {
        body.store_grades = store_grade;
      }
    }
    const uniqueId = uniqueColRef.current?.uniqueCol
      ? uniqueColRef.current.uniqueCol
      : "store_code";
    body["store_ids"] = {
      filters: selectedFilters,
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      metrics: [],
      selection: {
        data: [
          {
            searchColumns: {
              is_mapped: {
                filterType: "bool",
                filter: true,
              },
            },
            checkAll: true,
          },
          ...(ref.storeTableRef?.current?.api?.checkConfiguration || []),
        ],
        unique_columns: [uniqueId],
      },
    };
    body["store_group_ids"] = {
      filters: selectedFilters,
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      metrics: [],
      selection: {
        data: ref.storeGroupTableRef?.current?.api?.checkConfiguration || [],
        unique_columns: ["sg_code"],
      },
    };
    try {
      props.ToggleLoader(true);
      const urlSplitArr = location.pathname.split("/");
      const grpId = urlSplitArr.pop();
      await props.updateGrp(grpId, body);
      props.newRowsInEdit([]);
      props.deletedRowsInEdit([]);
      props.newGrpsInEdit([]);
      props.deletedGrpsInEdit([]);
      props.addSnack({
        message: "Updated successfully",
        options: {
          variant: "success",
        },
      });
      isCancelledOrUpdated.current = true;
      isSaved.current = true;
      refreshTables();
      props.ToggleLoader(false);
    } catch (error) {
      props.ToggleLoader(false);
      props.addSnack({
        message: "Update Failed",
        options: {
          variant: "error",
        },
      });
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
  const manualCallBack = async (body, pageIndex, params) => {
    let manualbody = {};
    manualbody = {
      filters: [],
      meta: { ...body, limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 } },
      metrics: [],
    };
    if (props.selectedGroupType === "custom") {
      let dependency = props.selectedClusterFilters
        ? props.selectedClusterFilters.map((item) => {
            return {
              attribute_name: item.filter_id,
              operator: "in",
              column_name: item.filter_id,
              dimension: item.dimension || "store",
              values: Array.isArray(item.values)
                ? item.values.map((opt) => opt.value)
                : item.values,
              filter_type: item.filter_type,
            };
          })
        : [];
      manualbody = {
        ...manualbody,
        filters: dependency,
        request_id: props.selectedCluster.id,
      };
    } else {
      let selectedFilters = [];
      if (ref.storeFiltersRef.current) {
        selectedFilters.push(...ref.storeFiltersRef.current);
      }
      let dependency = selectedFilters.map((item) => {
        return {
          attribute_name: item.filter_id,
          operator: "in",
          column_name: item.filter_id,
          dimension: item.dimension || "store",
          values: Array.isArray(item.values)
            ? item.values.map((opt) => opt.value || opt)
            : item.values,
          filter_type: item.filter_type,
        };
      });
      manualbody = {
        ...manualbody,
        filters: dependency,
      };
    }
    try {
      props.ToggleLoader(true);
      const uniqueId = uniqueColRef.current?.uniqueCol
        ? uniqueColRef.current.uniqueCol
        : "store_code";
      if (!manualbody?.filters?.length) {
        props.ToggleLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }
      if (props.isEdit) {
        manualbody = {
          ...manualbody,
          selection: {
            data: isCancelledOrUpdated.current
              ? [
                  {
                    searchColumns: {
                      is_mapped: {
                        filterType: "bool",
                        filter: true,
                      },
                    },
                    checkAll: true,
                  },
                ]
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
            unique_columns: [uniqueId],
          },
        };
        const urlSplitArr = location.pathname.split("/");
        const grpId = urlSplitArr.pop();
        const res = await props.fetchStoreGrpFilteredStores(
          manualbody,
          grpId,
          pageIndex + 1
        );
        let updatedRowData = cloneDeep(res);

        props.setStoreGroupFilteredStores({
          data: res.data.data,
          count: res.data.total,
        });
        if (isCancelledOrUpdated.current) {
          params.api.setCheckConfiguration([]);
        }
        props.ToggleLoader(false);
        isCancelledOrUpdated.current = false;
        return {
          data: updatedRowData.data.data,
          totalCount: updatedRowData.data.total,
        };
      } else {
        manualbody = {
          ...manualbody,
          selection: {
            data: params?.api?.checkConfiguration,
            unique_columns: [uniqueId],
          },
        };
        const res = await props.fetchStoreGrpFilteredStores(
          manualbody,
          "",
          pageIndex + 1
        );
        let updatedRowData = cloneDeep(res);

        props.setStoreGroupFilteredStores({
          data: res.data.data,
          count: res.data.total,
        });
        if (isCancelledOrUpdated.current) {
          params.api.setCheckConfiguration([]);
        }
        props.ToggleLoader(false);
        isCancelledOrUpdated.current = false;
        return {
          data: updatedRowData.data.data,
          totalCount: updatedRowData.data.total,
        };
      }
    } catch (error) {
      props.ToggleLoader(false);
      handleErrorMessage(error, displaySnackMessages);

      //Error handling
    }
  };

  const manualGrpCallBack = async (body, pageIndex, params) => {
    try {
      props.ToggleLoader(true);
      let selectedFilters = [];
      if (ref.storeFiltersRef.current) {
        const storeFilters = formatFiltersDependency(
          ref.storeFiltersRef.current,
          null,
          true
        );
        selectedFilters.push(...storeFilters);
      }
      let dependency = selectedFilters;
      if (dependency.length === 0) {
        props.ToggleLoader(false);
        return {
          data: [],
          totalCount: 0,
        };
      }
      const { applicationCode } = getCurrentApplicationDetails();
      let manualbody = {
        filters: dependency,
        meta: { ...body,limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 } },
        metrics: [],
        application_code: applicationCode,
      };
      if (props.isEdit) {
        manualbody = {
          ...manualbody,
          selection: {
            data: params?.api?.checkConfiguration,
            unique_columns: ["sg_code"],
          },
        };
        const urlSplitArr = location.pathname.split("/");
        const grpId = urlSplitArr.pop();
        const res = await props.fetchStoreGroups(
          manualbody,
          grpId,
          pageIndex + 1
        );
        if (isCancelledOrUpdatedGrps.current) {
          params.api.setCheckConfiguration([]);
        }
        props.ToggleLoader(false);
        isCancelledOrUpdatedGrps.current = false;
        return {
          data: res.data.data,
          totalCount: res.data.total,
        };
      } else {
        manualbody = {
          ...manualbody,
          selection: {
            data: params?.api?.checkConfiguration,
            unique_columns: ["sg_code"],
          },
        };
        const res = await props.fetchStoreGroups(manualbody, "", pageIndex + 1);

        if (isCancelledOrUpdatedGrps.current) {
          params.api.setCheckConfiguration([]);
        }
        props.ToggleLoader(false);
        isCancelledOrUpdatedGrps.current = false;
        return {
          data: res.data.data,
          totalCount: res.data.total,
        };
      }
    } catch (error) {
      //Error handling
      props.ToggleLoader(false);
      handleErrorMessage(error, displaySnackMessages);
    }
  };

  const handleClose = () => {
    setconfirmPopUp(false);
  };

  const onProceed = () => {
    setconfirmPopUp(false);
    if (props.isEdit) {
      const urlSplitArr = location.pathname.split("/");
      const grpId = urlSplitArr.pop();
      navigate(`${storeGrouping.viewGroup}/${grpId}`);
    } else {
      navigate(storeGrouping.home);
    }
  };

  const onClickViewClusterStatus = () => {
    setopenViewClusterStatus(true);
  };

  const closeViewClusterStatus = async (callBackData = {}) => {
    setopenViewClusterStatus(false);
    if (!isEmpty(callBackData)) {
      props.setStoreGroupCustomLoaderValue(true);
      const reqInfo = await props.fetchStoreGroupCustomClusterInfo(
        callBackData.id
      );

      const body = {
        filters: reqInfo.data.data.metrics.filters,
        sort: [],
        range: [],
        search: [],
        definitions: [],
        request_id: callBackData.id,
      };
      /**
       * Here assign the cluster filters to respective variables to populate
       */
      const filters = reqInfo.data.data.metrics.filters.map((filter) => {
        return {
          ...filter,
          filter_id: filter.attribute_name,
          values: filter.values.map((val) => {
            return {
              label: val,
              value: val,
            };
          }),
        };
      });
      props.setSelectedClusterFilters(filters);
      props.setClassificationValue(
        reqInfo.data.data.metrics.metrics.classification
      );
      props.setClusterParamters(
        capitalizeFirstLetterDropdown(reqInfo.data.data.metrics.metrics.value)
      );
      props.setClusterTimeFormat(
        capitalizeFirstLetterDropdown([
          reqInfo.data.data.metrics.metrics.time_format,
        ])
      );
      props.setClusterTimePeriod([
        moment(reqInfo.data.data.metrics.metrics.start_date, "YYYY-MM-DD"),
        moment(reqInfo.data.data.metrics.metrics.end_date, "YYYY-MM-DD"),
      ]);
      const res = await props.fetchStoreGrpFilteredStores(body);
      props.setStoreGroupFilteredStores({
        data: res.data.data,
        count: res.data.total,
      });
      props.setSelectedCluster(reqInfo.data.data);
      props.setStoreGroupCustomLoaderValue(false);
    }
  };

  useEffect(() => {
    closeViewClusterStatus(props.selectedCluster);
  }, [props.selectedCluster?.id]);

  const onStoreLevelSelectionChanged = (event) => {
    const selectedRows = event.api.getSelectedRows();
    let finalSelectedRows = cloneDeep(selectedRows);
    rowSelectionHandler(finalSelectedRows, event.api.getRenderedNodes());
  };

  const onStoreGroupLevelSelectionChanged = (event) => {
    const selectedGrpRows = event.api.getSelectedRows();
    grpSelectionHandler(selectedGrpRows, event.api.getRenderedNodes());
  };

  const refreshTables = () => {
    ref.storeTableRef.current.api.deselectAll();
    ref.storeTableRef.current.api.refreshServerSideStore({ purge: true });
    if (isIncludeGrpsChecked) {
      ref.storeGroupTableRef.current.api.deselectAll();
      ref.storeGroupTableRef.current.api.refreshServerSideStore({
        purge: false,
      });
    }
  };

  const onCancel = () => {
   if (
      props.isEdit &&
      !props.newEditStores.length &&
      !props.newEditGrps.length &&
      !props.deleteEditStores.length &&
      !props.deleteEditGrps.length
    ) {
      props.addSnack({
        message: "No changes are made",
        options: {
          variant: "warning",
        },
      });
      return;
    }

    if (
      !props.isEdit &&
      checkForEmptyTableUserConfig(ref.storeTableRef) &&
      checkForEmptyTableUserConfig(ref.storeGroupTableRef)
    ) {
      props.addSnack({
        message: "No changes are made",
        options: {
          variant: "warning",
        },
      });
      return;
    }
    showConfirmBox(true);
  };

  /**
   * @function
   * @description Handle selected stores channel and filter validation and call bulk/store api after payload creation
   * @returns {Boolean} false if validation fails
   */
  const handleAddStores = async () => {
    const channel = Array.from(
      new Set(props.selectedStoreGroups.map((item) => item.channel))
    );
    const uniqueId = uniqueColRef.current?.uniqueCol
      ? uniqueColRef.current.uniqueCol
      : "store_code";
    if (
      channel.length === 1 &&
      channel[0] !=
        ref?.storeFiltersRef?.current?.filter(
          (filter) => filter.filter_id === "channel"
        )[0].values[0]
    ) {
      props.addSnack({
        message: "Cross channel store addition is not allowed.",
        options: {
          variant: "warning",
        },
      });
      return;
    }
    const body = {
      store_groups: props.selectedStoreGroups.map((group) => {
        return {
          sg_code: group.sg_code,
          name: group.name,
          special_classification: group.special_classification,
          channel: channel[0],
        };
      }),
    };
    let selectedFilters = [];
    if (ref.storeFiltersRef.current) {
      const storeFilters = formatFiltersDependency(
        ref.storeFiltersRef.current,
        null,
        true
      );
      selectedFilters.push(...storeFilters);
      let selectedData = ref.storeTableRef.current?.api
        ?.getSelectedNodes()
        .map((node) => {
          return node.data;
        });
      let store_grade = selectedData
        .filter((item) => item.grade)
        .map((item) => {
          return {
            store_code: item.store_code,
            store_grade: item.grade,
          };
        });
      if (storeGradeFlag) {
        body.store_grades = store_grade;
      }
    }

    body["store_ids"] = {
      filters: selectedFilters,
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      metrics: [],
      selection: {
        data: [
          {
            searchColumns: {
              is_mapped: {
                filterType: "bool",
                filter: true,
              },
            },
            checkAll: true,
          },
          ...(ref.storeTableRef?.current?.api?.checkConfiguration || []),
        ],
        unique_columns: [uniqueId],
      },
    };
    body["store_group_ids"] = {
      filters: selectedFilters,
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      metrics: [],
      selection: {
        data: ref.storeGroupTableRef?.current?.api?.checkConfiguration || [],
        unique_columns: ["sg_code"],
      },
    };
    try {
      props.ToggleLoader(true);
      await props.addStoresToGroups(body);
      props.newRowsInEdit([]);
      props.deletedRowsInEdit([]);
      props.newGrpsInEdit([]);
      props.deletedGrpsInEdit([]);
      isCancelledOrUpdated.current = true;
      refreshTables();
      props.ToggleLoader(false);
      props.addSnack({
        message: "Added successfully",
        options: {
          variant: "success",
          onClose: navigate(props.prevScr),
        },
      });
    } catch (error) {
      props.ToggleLoader(false);
      handleErrorMessage(error, displaySnackMessages);
    }
  };

  const onSelectionChanged = (event)=>{
    const selectedRows = event?.api?.getSelectedRows();
    setSelectedRows(selectedRows)
    if (props.isEdit) {
      onStoreLevelSelectionChanged(event);
    }
  }

  const tableCheckbox = () => {
    if (props.selectedGroupType === "manual") {
      return (
        <Checkbox
          id="storeGrpingIncldGrpsFormLabel"
          label={`Include ${dynamicLabelsBasedOnTenant("store", "core")} Groups`}
          checked={isIncludeGrpsChecked}
          onChange={(event) => setisIncludeGrpsChecked(event.target.checked)}
        />
      );
    }
    if (props.selectedGroupType !== "manual" &&
      (!props.location?.pathname?.includes("add-stores") ||
        props.enableMultiEdit)) {
      return (
        <Button
          onClick={onClickViewClusterStatus}
          variant="primary"
        >
          View Cluster Status
        </Button>)
    }
  }

  return (
    <>
      <Prompt
        isOpen={confirmBox}
        title="Cancel Changes"
        primaryButtonLabel="Yes"
        onPrimaryButtonClick={() => {
          isCancelledOrUpdated.current = true;
            if (isIncludeGrpsChecked) isCancelledOrUpdatedGrps.current = true;
            refreshTables();
            showConfirmBox(false);
        }}
        secondaryButtonLabel="No"
        onSecondaryButtonClick={() => {
          showConfirmBox(false);
        }}
        handleClose={() => showConfirmBox(false)}
        variant="warning"
      >
        Your changes will be discarded if you proceed. Are you sure you want to cancel?
      </Prompt>
      <Prompt
        isOpen={confirmPopUp}
        title="Leave Page"
        primaryButtonLabel="Confirm"
        onPrimaryButtonClick={() => onProceed()}
        secondaryButtonLabel="Cancel"
        onSecondaryButtonClick={() => handleClose()}
        handleClose={() => handleClose()}
        variant="warning"
      >
        Changes will be lost. Are you sure want to proceed?
      </Prompt>
      <Prompt
        isOpen={confirmGoBack}
        title="Leave Page"
        primaryButtonLabel="Ok"
        onPrimaryButtonClick={() => {
          setConfirmGoBack(false);
          goBack();
        }}
        secondaryButtonLabel="Cancel"
        onSecondaryButtonClick={() => setConfirmGoBack(false)}
        handleClose={() => setConfirmGoBack(false)}
        variant="warning"
      >
        Are you sure you want to leave this page without saving changes?
      </Prompt>
      {open && (
        <GroupName
          ref={{
            storeTableRef: ref.storeTableRef.current,
            storeGroupTableRef: ref.storeGroupTableRef.current,
            storeFiltersRef: ref.storeFiltersRef.current,
          }}
          id="storeGrpingGrpNameComp"
          open={open}
          handleClose={() => toggleModalState(false)}
          prevScr={props.prevScr}
          storeGradeFlag={storeGradeFlag}
          refreshTables={refreshTables}
          uniqueRowId={
            uniqueColRef.current?.uniqueCol
              ? uniqueColRef.current.uniqueCol
              : "store_code"
          }
        />
      )}
      {openViewClusterStatus && (
        <RequestsTable
          dimension="store"
          selectedGroupType={props.selectedGroupType}
          open={openViewClusterStatus}
          handleClose={closeViewClusterStatus}
        />
      )}
      {columns.length !== 0 && (
        <Paper
        id={props.isEdit ? "storeGrpingEditCont" : "storeGrpingCrtCont"}
        elevation={0}
        className={globalClasses.marginBottom}
        >
          <AgGridTable
            columns={columns}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            onGridChanged
            onRowSelected
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            loadTableInstance={(gridInstance) => {
              ref.storeTableRef.current = gridInstance;
            }}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSizeGrouping || 20}
            paginationPageSize={props.pageSizeGrouping || 20}
            uniqueRowId={
              uniqueColRef.current?.uniqueCol
                ? uniqueColRef.current.uniqueCol
                : "store_code"
            }
            onSelectionChanged={onSelectionChanged}
            tableHeader={`Filtered ${dynamicLabelsBasedOnTenant("store", "core")}s`
              .replace(/\s/g, "")
              .replace(/([a-z])([A-Z])/g, "$1 $2")}
            topRightOptions={tableCheckbox()}
            topLeftOptions={props.topLeftOptions}
          />
        </Paper>
      )}
      {isIncludeGrpsChecked && grpColumns.length > 0 && (
          <AgGridTable
            columns={grpColumns}
            selectAllHeaderComponent={true}
            sizeColumnsToFitFlag
            onGridChanged
            onRowSelected
            manualCallBack={(body, pageIndex, params) =>
              manualGrpCallBack(body, pageIndex, params)
            }
            loadTableInstance={(gridInstance) => {
              ref.storeGroupTableRef.current = gridInstance;
            }}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={props.pageSizeGrouping || 20}
            paginationPageSize={props.pageSizeGrouping || 20}
            uniqueRowId={"sg_code"}
            onSelectionChanged={onStoreGroupLevelSelectionChanged}
            tableHeader={`Filtered Groups`}
          />
      )}
        <Grid
          className={`${globalClasses.stickyFooter}`}
          gap={2}
        >
          <div>
          <Button
            variant="tertiary"
            style={{marginRight: "10px"}}
            onClick={() => {
              location?.pathname?.includes("add-stores")
                ? navigate(props.prevScr, {
                    state: {
                      from: location.pathname,
                    },
                  })
                : handleGoBack();
            }}
            id={props.isEdit ? "storeGrpingEditBackBtn" : "storeGrpingCrtBackBtn"}
          >
            {"< Go Back"}
          </Button>
          </div>
          <div>
            {selectedRows?.length > 0 &&  <>
              <Button
                  variant="secondary"
                  onClick={() => {                                                                                                                                                                                                                                                                                                                                                                                                  
                    onCancel();
                  }}
                  id={props.isEdit ? "storeGrpingEditCnclBtn" : "storeGrpingCrtCnclBtn"}
                  style={{ marginRight: "10px" }}
                >
                {" "}
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  location?.pathname?.includes("add-stores")
                    ? handleAddStores()
                    : toggleModalState(true)
                }
                id={props.isEdit ? "storeGrpingUpdBtn" : "storeGrpingSaveBtn"}
                disabled={
                  props?.isModify && selectedRows.length === 0? true : (!props.isEdit && ref?.storeFiltersRef?.current?.length === 0) 
                }
              >
                {location?.pathname?.includes("add-stores")
                  ? "Add Stores"
                  : props.isEdit
                  ? "Update"
                  : "Save"}
              </Button>
            </>}
          </div>
        </Grid>
    </>
  );
});

const mapStateToProps = (state) => {
  return {
    selectedStores: state.storeGroupReducer.selectedstores,
    columns: state.storeGroupReducer.manualFilteredStoresCols,
    selectedFilters: state.filterReducer.selectedFilters["store_hierarchy"],
    manualSelectedStoreFilters:
      state.filterReducer.selectedFilters["store_filters_create_group"],
    manualSelectedProductFilters:
      state.filterReducer.selectedFilters["product_filters_create_group"],
    filteredStores: state.storeGroupReducer.manualFilteredStores,
    filteredStoresCount: state.storeGroupReducer.manualFilteredStoresCount,
    selectedManualFilterType: state.storeGroupReducer.selectedManualFilterType,
    groupsCols: [...state.storeGroupReducer.groupsTableCols],
    selectedGrps: state.storeGroupReducer.manualselectedGroups,
    existingStores: state.storeGroupReducer.exisitingStoresInEdit,
    newEditStores: state.storeGroupReducer.newStoresInEdit,
    deleteEditStores: state.storeGroupReducer.deletedStoresInEdit,
    selectedGroupType: state.storeGroupReducer.selectedGroupType,
    newEditGrps: state.storeGroupReducer.newGrpsInEdit,
    deleteEditGrps: state.storeGroupReducer.deletedGrpsInEdit,
    selectedCluster: state.storeGroupReducer.selectedCluster,
    selectedClusterFilters: state.storeGroupReducer.selectedClusterFilters,
    enableMultiEdit:
      state.tenantConfigReducer.coreScreenNames?.attribute_value?.storeGrouping
        ?.enableMultiEdit,
    allowMultiChannel: state.storeGroupReducer.allowMultiChannelFlag,

  };
};

const mapActionsToProps = {
  fetchStoreGrpFilteredStores,
  setStoreGroupFilteredStores,
  setSelectedStores,
  ToggleLoader,
  fetchStoreGroups,
  setGroupsCols,
  addSelectedGroups,
  addToExistingStores,
  newRowsInEdit,
  deletedRowsInEdit,
  updateGrp,
  addSnack,
  setSelectedFilters,
  deletedGrpsInEdit,
  newGrpsInEdit,
  setSelectedStoresSelectAllState,
  setStoreGroupCustomLoaderValue,
  fetchStoreGroupCustomClusterInfo,
  setClassificationValue,
  setClusterParamters,
  setClusterTimeFormat,
  setClusterTimePeriod,
  setSelectedCluster,
  setSelectedClusterFilters,
  addStoresToGroups,
  getColumnsAg,
};

export default connect(mapStateToProps, mapActionsToProps, null, {
  forwardRef: true,
})(FilteredStores);
