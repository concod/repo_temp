import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import CloseIcon from "@mui/icons-material/Close";
import LoadingOverlay from "core/Utils/Loader/loader";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import {
  isDropPlan,
  isChannelMultiple,
  getDefaultChannelValue,
  filterView,
  externalFilterLevelsChannelSubChannel,
  getFilteredFooter,
  assortAgGridCustomCellRenderer,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import PlanDropTabViewComponent from "../../plan-drop-tab-view-component";
import { cloneDeep, compact, groupBy, isEmpty, uniqBy } from "lodash";
import AgGridTable from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { groupByCustom } from "core/Utils/formatter";
import {
  CHANNEL_FORM,
  RECEIPT_DRAWER_METRICS,
  RECEIPT_DRAWER_QUARTER_MONTH_METRICS,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  getPlanReceiptDrawerView,
  setReceiptDrawerLoader,
} from "../../../../services-assortsmart/Plan/BOP-Receipt-Drawer/bop-receipt-drawer-service";
import { configureLevels } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import { getColumnsAg } from "core/actions/tableColumnActions";

const ReceiptDrawerRootComponent = (props) => {
  const [groupedDrops, setGroupedDrops] = useState({});
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [formFields, setFormFields] = useState(null);
  const [levelsOptions, setLevelsOptions] = useState({});
  const [levelSelected, setLevelSelected] = useState({});
  const [totalFooter, setTotalFooter] = useState([]);
  const [filteredFooter, setFilteredFooter] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [
    totalQuarterMonthLevelFooter,
    setTotalQuarterMonthLevelFooter,
  ] = useState([]);
  const [
    filteredQuarterMonthLevelFooter,
    setFilteredQuarterMonthLevelFooter,
  ] = useState([]);
  const ReceiptDrawerInstance = useRef({});
  const receiptDrawerViewInstance = useRef({});
  const planreceiptDrawerViewInstance = useRef({});
  let formData = props.formValue;
  const [receiptDrawerFiltered, setReceiptDrawerFiltered] = useState();

  useEffect(() => {
    const fetchData = async () => {
      props.setReceiptDrawerLoader(true);
      let cols = await getColumnsAg(
        "table_name=receipt_drawer_quarter_month_view",
        props.columnHeaderJson,
        true
      )();
      if (cols.length) {
        setColumns(cols);
        let payload = {
          plan_step: props.activeStep,
          plan_code: props.planDetails?.data?.plan_code,
          store_type: props.planDetails?.data?.channel?.[0],
        };
        let response = await props.getPlanReceiptDrawerView(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        props.setReceiptDrawerLoader(false);
        if (response.data.status) {
          let responseData = response.data.data.data;
          responseData.forEach((data) => {
            data.hierarchy = [data.quarter + data.channel, data.fm];
            data.uniqueId = data.quarter + data.channel + data.fm + data.fy;
            data.month =
              props.screenConfiguration?.["2.1"]
                ?.fiscal_month_mapping_with_name?.[data.fm] || data.fm;
          });
          let groupedDataArray = groupByCustom({
            Group: responseData,
            By: ["channel", "quarter"],
          });
          let tempData = [];
          groupedDataArray.forEach((groupedData) => {
            let total = {},
              quarter,
              channel;
            groupedData?.forEach((data) => {
              RECEIPT_DRAWER_QUARTER_MONTH_METRICS?.forEach((key) => {
                if (
                  key !== "planned_auc" ||
                  key !== "updated_auc" ||
                  key !== "planned_aur" ||
                  key !== "updated_aur" ||
                  key !== "units_diff_per"
                ) {
                  total[key] = (total[key] || 0) + data[key];
                }
              });
              total["planned_aur"] = total["planned_sales_units"]
                ? total["planned_revenue"] / total["planned_sales_units"]
                : 0;
              total["updated_aur"] = total["updated_sales_units"]
                ? total["updated_revenue"] / total["updated_sales_units"]
                : 0;
              total["planned_auc"] = total["planned_units"]
                ? total["planned_budget"] / total["planned_units"]
                : 0;
              total["updated_auc"] = total["updated_units"]
                ? total["updated_budget"] / total["updated_units"]
                : 0;
              total["units_diff_per"] = total["planned_units"]
                ? total["units_diff"] / total["planned_units"]
                : 0;
              quarter = data.quarter;
              channel = data.channel;
              tempData.push(data);
            });
            tempData.push({
              ...total,
              channel: channel,
              quarter: quarter,
              month: "Total",
              hierarchy: [quarter + channel],
              uniqueId: "Total" + channel + quarter,
            });
          });
          setTableData(tempData);
          setTotalQuarterMonthLevelFooter(
            getTotalQuarterMonthLevelFooterRow(tempData)
          );
        }
      }
    };
    if (props.activeStep !== 2.2) {
      fetchData();
    }
  }, []);

  useEffect(() => {
    return () => {
      props.setReceiptDrawerData([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.receiptDrawerData?.length) {
      const levelsData = configureLevels(
        props.planDetails?.data,
        props.levelsJson,
        props.receiptDrawerData
      );
      setLevelsOptions(levelsData?.options);
      setLevelSelected(levelsData?.selectedValue);
      Object.keys(props.levelsJson).forEach((level) => {
        if (!isEmpty(levelsData?.selectedValue?.[level])) {
          formData[level] = levelsData?.selectedValue?.[level]?.label;
        }
      });

      if (
        isDropPlan(
          props.planDetails?.data,
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_count`
        )
      ) {
        let drops = groupBy(
          props.receiptDrawerData,
          props.screenConfiguration?.common?.drop_key || "drop"
        );
        setGroupedDrops(drops);
      }
      if (isChannelMultiple(props.planDetails?.data)) {
        let channels = groupBy(props.receiptDrawerData, "channel");
        channels = Object.keys(channels);
        let channelOpt = channels?.map((data) => {
          return {
            label: data,
            value: data,
            id: data,
          };
        });
        let defaultChannel = getDefaultChannelValue(
          channelOpt,
          props.planDetails?.data
        );
        formData.channel_list = defaultChannel?.label;
        let channelFeilds = CHANNEL_FORM;
        channelFeilds.isMulti = false;
        channelFeilds.options = channelOpt;
        let formFields = [];
        formFields.push(channelFeilds);
        setFormFields(formFields);
      }
      props.setFormData(formData);
      setTotalFooter(
        getTotalFooterRow(props.receiptDrawerData, levelsData?.options)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.receiptDrawerData]);

  const getTotalFooterRow = (receiptDrawerData, levelsOptions) => {
    //To group data based on drop and sub_channel
    let footer = [];
    const groupBy_properties = [
      props.screenConfiguration?.common?.drop_key || "drop",
      "channel",
    ];
    if (levelsOptions && Object.keys(levelsOptions)?.length) {
      Object.keys(props.levelsJson).forEach((levelKey) => {
        if (levelsOptions[levelKey]?.length > 0) {
          groupBy_properties.push(levelKey);
        }
      });
    }
    const groupedDataArray = groupByCustom({
      Group: receiptDrawerData,
      By: groupBy_properties,
    });
    groupedDataArray?.length &&
      groupedDataArray.forEach((groupedData) => {
        let total = {};
        groupedData?.forEach((data) => {
          RECEIPT_DRAWER_METRICS?.forEach((key) => {
            total[key] = (total[key] || 0) + data[key];
          });
        });
        let footerObj = {
          ...total,
          "difference_units_%":
            (total["updated_units"] - total["initial_units"]) /
            total["initial_units"],
          units_diff_per: total["initial_units"]
            ? (total["updated_units"] - total["initial_units"]) /
              total["initial_units"]
            : 0,
          "difference_budget_%":
            (total["updated_budget"] - total["initial_budget"]) /
            total["initial_budget"],
          budget_diff_per: total["initial_budget"]
            ? (total["updated_budget"] - total["initial_budget"]) /
              total["initial_budget"]
            : 0,
          sales_diff_per:
            (total["updated_sales"] - total["initial_sales"]) /
            total["initial_sales"],
          margin_diff_per:
            (total["updated_margin"] - total["initial_margin"]) /
            total["initial_margin"],
          buy_units_diff_per:
            (total["updated_buy_units"] - total["initial_buy_units"]) /
            total["initial_buy_units"],
          l3_name: "Total",
          l1_name: groupedData[0]?.l1_name,
          l2_name: groupedData[0]?.l2_name,
          [props.screenConfiguration?.common?.drop_key ||
          "drop"]: groupedData?.[0]?.[
            props.screenConfiguration?.common?.drop_key || "drop"
          ],
          sub_channel: groupedData?.[0]?.sub_channel,
          channel: groupedData?.[0]?.channel,
          carryover_flag: groupedData[0].tag,
          uniqueId:
            "Total" +
            groupedData[0]?.l1_name +
            groupedData[0]?.l2_name +
            groupedData[0]?.l3_name +
            groupedData?.[0]?.channel +
            groupedData?.[0]?.sub_channel +
            groupedData?.[0]?.[
              props.screenConfiguration?.common?.drop_key || "drop"
            ] +
            groupedData?.[0]?.tag,
        };
        footer.push(footerObj);
      });
    return footer;
  };

  const getTotalQuarterMonthLevelFooterRow = (receiptDrawerData) => {
    let filteredData = receiptDrawerData.filter((obj) => obj.month === "Total");
    let groupedDataArray = groupByCustom({
      Group: filteredData,
      By: ["channel"],
    });
    let footerRow = [];
    groupedDataArray.forEach((groupedData) => {
      let total = {};
      groupedData?.forEach((data) => {
        RECEIPT_DRAWER_QUARTER_MONTH_METRICS?.forEach((key) => {
          if (
            key !== "planned_aur" ||
            key !== "updated_aur" ||
            key !== "planned_auc" ||
            key !== "updated_auc"
          ) {
            total[key] = (total[key] || 0) + data[key];
          }
        });
      });
      let footerObj = {
        ...total,
        units_diff_per: total["planned_units"]
          ? (total["updated_units"] - total["planned_units"]) /
            total["planned_units"]
          : 0,
        budget_diff_per: total["planned_budget"]
          ? (total["updated_budget"] - total["planned_budget"]) /
            total["planned_budget"]
          : 0,
        sales_units_diff_per: total["planned_sales_units"]
          ? (total["updated_sales_units"] - total["planned_sales_units"]) /
            total["planned_sales_units"]
          : 0,
        revenue_diff_per: total["planned_revenue"]
          ? (total["updated_revenue"] - total["planned_revenue"]) /
            total["planned_revenue"]
          : 0,
        month: "Total",
        [props.screenConfiguration?.common?.drop_key ||
        "drop"]: groupedData?.[0]?.[
          props.screenConfiguration?.common?.drop_key || "drop"
        ],
        channel: groupedData?.[0]?.channel,
        quarter: groupedData?.[0]?.quarter,
        uniqueId:
          "Total" + groupedData?.[0]?.channel + groupedData?.[0]?.quarter,
        planned_aur: total["planned_sales_units"]
          ? total["planned_revenue"] / total["planned_sales_units"]
          : 0,
        updated_aur: total["updated_sales_units"]
          ? total["updated_revenue"] / total["updated_sales_units"]
          : 0,
        planned_auc: total["planned_units"]
          ? total["planned_budget"] / total["planned_units"]
          : 0,
        updated_auc: total["updated_units"]
          ? total["updated_budget"] / total["updated_units"]
          : 0,
      };
      footerRow.push(footerObj);
    });
    return footerRow;
  };

  useEffect(() => {
    if (totalFooter?.length > 0) {
      let filterData = {};
      if (!isEmpty(levelSelected)) {
        Object.keys(levelSelected).forEach((level) => {
          filterData[level] = levelSelected[level]?.value;
        });
      }
      if (!isEmpty(props.formValue)) {
        Object.keys(props.formValue).forEach((key) => {
          let newKey = key === "channel_list" ? "channel" : key;
          filterData[newKey] = props.formValue[key];
        });
      }
      if (selectedDropData) {
        filterData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] = selectedDropData;
      }
      let filtereFooter = getFilteredFooter(totalFooter, filterData);
      setFilteredFooter(filtereFooter);
    } else {
      setFilteredFooter([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFooter, levelSelected, props.formValue, selectedDropData]);

  useEffect(() => {
    if (totalQuarterMonthLevelFooter?.length > 0) {
      let filterData = {};
      if (!isEmpty(levelSelected)) {
        Object.keys(levelSelected).forEach((level) => {
          filterData[level] = levelSelected[level]?.value;
        });
      }
      if (!isEmpty(props.formValue)) {
        Object.keys(props.formValue).forEach((key) => {
          let newKey = key === "channel_list" ? "channel" : key;
          filterData[newKey] = props.formValue[key];
        });
      }
      if (selectedDropData) {
        filterData[
          props.screenConfiguration?.common?.drop_key || "drop"
        ] = selectedDropData;
      }
      let filtereFooter = getFilteredFooter(
        totalQuarterMonthLevelFooter,
        filterData
      );
      console.log("filterd:", filtereFooter);
      setFilteredQuarterMonthLevelFooter(filtereFooter);
    } else {
      setFilteredQuarterMonthLevelFooter([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    totalQuarterMonthLevelFooter,
    levelSelected,
    props.formValue,
    selectedDropData,
  ]);

  const handleChangeSubChannelFilter = (updatedFormData, id) => {
    formData = updatedFormData;
    props.setFormData(formData);
    ReceiptDrawerInstance?.current?.api?.onFilterChanged();
    planreceiptDrawerViewInstance?.current?.api?.onFilterChanged();
  };

  const handleLevelsChange = (option, key) => {
    const selectedValue = levelSelected;
    const options = cloneDeep(levelsOptions);
    let formOption = cloneDeep(props.formValue);
    selectedValue[key.filter_id] = option;
    formOption[key.filter_id] = option?.label;
    formData[key.filter_id] = option?.label;
    if (key.filter_id === "l1_name") {
      let filteredData = props.receiptDrawerData.filter(
        (data) => data.l1_name === option?.label
      );
      let l2Values = uniqBy(filteredData, "l2_name");
      let l2ValuesOpt = l2Values?.map((item) => {
        if (item.l1_name === option?.label) {
          return {
            label: item.l2_name,
            value: item.l2_name,
            id: item.l2_name,
          };
        }
      });
      l2ValuesOpt = compact(l2ValuesOpt);
      options.l2_name = l2ValuesOpt;
      formOption.l2_name = l2ValuesOpt[0]?.label;
      selectedValue.l2_name = l2ValuesOpt[0];
      setLevelsOptions(options);
    }
    props.setFormData(formOption);
    setLevelSelected(selectedValue);
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    let levelsFilter = false;
    Object.keys(props.levelsJson).forEach((level) => {
      if (props.planDetails?.data?.[level]?.length > 1)
        return (levelsFilter = true);
    });
    return levelsFilter || isChannelMultiple(props.planDetails?.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel, levels changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        props.receiptDrawerData,
        formData,
        props.planDetails?.data,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, props.receiptDrawerData]
  );

  useEffect(() => {
    formData = props.formValue;
    if (ReceiptDrawerInstance?.current?.api) {
      ReceiptDrawerInstance?.current?.api?.onFilterChanged();
      planreceiptDrawerViewInstance?.current?.api?.onFilterChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.formValue]);

  useEffect(() => {
    if (
      props.receiptDrawerViewData &&
      selectedDropData &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      ) &&
      ReceiptDrawerInstance?.current?.api
    ) {
      try {
        var hardcodedFilter = {
          [props.screenConfiguration?.common?.drop_key || "drop"]: {
            type: "equals",
            filter: selectedDropData,
          },
        };
        ReceiptDrawerInstance.current.api.setFilterModel(hardcodedFilter);
        const receiptDrawerFilteredData = ReceiptDrawerInstance?.current?.api
          ?.getModel()
          ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);
        setReceiptDrawerFiltered(receiptDrawerFilteredData);
      } catch (error) {
        console.log("error:", error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ReceiptDrawerInstance?.current, selectedDropData]);

  const getSubrowPath = useMemo(() => {
    return (data) => {
      return data.hierarchy;
    };
  }, []);

  const doesExternalFilterPassReceiptDrawerView = useCallback(
    //whenever channel or sub channel, levels changes data get filtered here
    (node) => {
      return externalFilterLevelsChannelSubChannel(
        node,
        tableData,
        formData,
        props.planDetails?.data,
        props.levelsJson
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, tableData]
  );

  const loadTableInstance = (params) => {
    ReceiptDrawerInstance.current = params;
    const receiptDrawerFilteredData = ReceiptDrawerInstance?.current?.api
      ?.getModel()
      ?.rootNode.childrenAfterAggFilter?.map((node) => node.data);
    setReceiptDrawerFiltered(receiptDrawerFilteredData);
    if (
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let selectedDrop = Object.keys(groupedDrops)[0];
      var hardcodedFilter = {
        [props.screenConfiguration?.common?.drop_key || "drop"]: {
          type: "equals",
          filter: selectedDrop,
        },
      };
      ReceiptDrawerInstance.current.api.setFilterModel(hardcodedFilter);
    }
  };

  const loadReceiptDrawerInstance = (params) => {
    receiptDrawerViewInstance.current = params;
  };

  const loadReceiptDrawerViewInstance = (params) => {
    planreceiptDrawerViewInstance.current = params;
  };

  const autoGroupColumnDef = {
    headerName: "Month",
    cellRendererParams: {
      suppressCount: true,
    },
    width: 200,
    valueGetter: (props) => {
      return props?.data?.month;
    },
  };

  const classes = useStyles();
  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.onToggleReceiptDrawer(false)}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid container direction="row" alignItems="center">
          <Typography variant="h4" gutterBottom>
            Receipt Drawer{" "}
            {!props.screenConfiguration?.["receipt_drawer"]
              ?.hide_subcat_level_table
              ? ""
              : " View - Overall Plan Level"}
          </Typography>
          {!props.screenConfiguration?.["receipt_drawer"]
            ?.hide_subcat_level_table && (
            <>
              {Object.keys(props.levelsJson).map((levelKey) => {
                return (
                  levelsOptions[levelKey]?.length > 0 &&
                  filterView(
                    props.columnHeaderJson?.[levelKey],
                    levelKey,
                    levelsOptions[levelKey],
                    handleLevelsChange,
                    levelSelected[levelKey],
                    classes.formContainer,
                    classes.inputLabel
                  )
                );
              })}
              {formFields && props.receiptDrawerData?.length > 0 && (
                <div className={classes.formContainer}>
                  <Form
                    layout={"vertical"}
                    maxFieldsInRow={1}
                    handleChange={handleChangeSubChannelFilter}
                    fields={formFields}
                    updateDefaultValue={false}
                    defaultValues={formData}
                    handleDropdownClose={true}
                  ></Form>
                </div>
              )}
            </>
          )}

          <IconButton
            className={classes.rightEnd}
            aria-label="close"
            size="large"
          >
            <CloseIcon onClick={() => props.onToggleReceiptDrawer(false)} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={classes.contentBody}>
          <Grid container direction="row" className={classes.dialogGrid}>
            <LoadingOverlay loader={props.loaderReceiptDrawer}>
              <>
                {!props.screenConfiguration?.["receipt_drawer"]
                  ?.hide_subcat_level_table && (
                  <>
                    {!isEmpty(groupedDrops) && (
                      <div>
                        <PlanDropTabViewComponent
                          groupedDrops={groupedDrops}
                          onChangeTab={setSelectedDropData}
                          selectedTab={selectedDropData}
                        />
                      </div>
                    )}
                    {props.receiptDrawerData.length > 0 &&
                      ((isDropPlan(
                        props.planDetails?.data,
                        `${
                          props.screenConfiguration?.common?.drop_key.includes(
                            "drop"
                          )
                            ? "drops"
                            : props.screenConfiguration?.common?.drop_key ||
                              "drops"
                        }_count`
                      ) &&
                        Object.keys(groupedDrops)?.length > 0) ||
                        !isDropPlan(
                          props.planDetails?.data,
                          `${
                            props.screenConfiguration?.common?.drop_key.includes(
                              "drop"
                            )
                              ? "drops"
                              : props.screenConfiguration?.common?.drop_key ||
                                "drops"
                          }_count`
                        )) && (
                        <AgGridTable
                          columns={props.receiptDrawerColumns || []}
                          rowdata={props.receiptDrawerData || []}
                          loadTableInstance={loadTableInstance}
                          uniqueRowId={"uniqueId"}
                          isExternalFilterPresent={isExternalFilterPresent}
                          doesExternalFilterPass={doesExternalFilterPass}
                          sideBar={false}
                          pagination={false}
                          adjustTableHeight={
                            receiptDrawerFiltered?.length &&
                            receiptDrawerFiltered?.length <= 2
                              ? true
                              : false
                          }
                          pinnedBottomRowData={filteredFooter}
                          tableId={"receipt-drawer"}
                        />
                      )}
                  </>
                )}
                {props.receiptDrawerViewData?.length ? (
                  <div
                    className={
                      !props.screenConfiguration?.["receipt_drawer"]
                        ?.hide_subcat_level_table
                        ? classes.marginTop10
                        : ""
                    }
                  >
                    {!props.screenConfiguration?.["receipt_drawer"]
                      ?.hide_subcat_level_table && (
                      <Typography variant="h4" gutterBottom>
                        Receipt Drawer View
                      </Typography>
                    )}
                    <AgGridTable
                      columns={props.receiptDrawerViewColumns}
                      rowdata={props.receiptDrawerViewData}
                      loadTableInstance={loadReceiptDrawerInstance}
                      uniqueRowId={"tag"}
                      noEditableCustomCellRender={(cellProps) =>
                        assortAgGridCustomCellRenderer(
                          cellProps,
                          "receipt-view-table"
                        )
                      }
                      sideBar={false}
                      pagination={false}
                      sizeColumnsToFitFlag
                      skipAutoSizeColumn
                      adjustTableHeight={true}
                      tableId={"receipt-drawer-view"}
                    />
                  </div>
                ) : null}
                <div className={classes.marginTop10}>
                  {tableData?.length ? (
                    <>
                      <Typography variant="h4" gutterBottom>
                        Receipt Drawer Quarter/Month Level
                      </Typography>
                      <AgGridTable
                        columns={columns}
                        rowdata={tableData}
                        loadTableInstance={loadReceiptDrawerViewInstance}
                        uniqueRowId={"uniqueId"}
                        autoGroupColumnDef={autoGroupColumnDef}
                        isExternalFilterPresent={isExternalFilterPresent}
                        doesExternalFilterPass={
                          doesExternalFilterPassReceiptDrawerView
                        }
                        treeData={true}
                        getDataPath={getSubrowPath}
                        adjustTableHeight={true}
                        pinnedBottomRowData={filteredQuarterMonthLevelFooter}
                        tableId={"plan-receipt-drawer-view"}
                      />
                    </>
                  ) : null}
                </div>
              </>
            </LoadingOverlay>
          </Grid>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    loaderReceiptDrawer:
      store.assortsmartReducer.bopReceiptDrawerReducer.loaderReceiptDrawer,
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    columnHeaderJson:
      store.assortsmartReducer.planDashboardReducer.columnHeaderJson,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setReceiptDrawerLoader: (payload) =>
    dispatch(setReceiptDrawerLoader(payload)),
  getPlanReceiptDrawerView: (payload, endpoint, objID) =>
    dispatch(getPlanReceiptDrawerView(payload, endpoint, objID)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ReceiptDrawerRootComponent));
