import { Save } from "@mui/icons-material";
import Add from "@mui/icons-material/Add";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import Delete from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import {
  Button,
  Card,
  Container,
  ListItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import GlobalStyles from "core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { groupByCustom } from "core/Utils/formatter";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { Prompt } from "impact-ui";
import { cloneDeep, find, isEmpty, uniqBy } from "lodash";
import {
  common,
  newVsCarryOverOptions,
  omniFileUploadValidation,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { getStoreChannels } from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  createPlaceholderAndChoiceId,
  deleteOmniPlan,
  deleteOmnitableRow,
  fetchOmniMappingData,
  fetchOmniMappingMetrics,
  mergeOmniPlan,
  refreshPlans,
  setOmniLoader,
  setOmniMappingData,
  setOmniMappingMetrics,
  setUpdatedOmniMappingData,
  updateOmniTableData,
  uploadOmniMappingFile,
} from "modules/assortsmart/services-assortsmart/OmniChannel/omni-channel-service";
import {
  getPlanDetails,
  getPlanLevels,
  setLevelsJson,
  setPlanDetails,
  setPlanLevels,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import {
  getWedgeAttributesData,
  setWedgeAttributeData,
} from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import { setScreenConfiguration } from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  filterView,
  generateLevelJson,
  getOmniPlanPayload,
  getPlanPayload,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { withRouter } from "react-router-dom";
import LoadingOverlay from "../../../../core/Utils/Loader/loader";
import { getChannelOptions } from "../../../clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import PlanDataComponent from "../Plan/plan-filter-data-component";
import AssortBreadCrumbs from "../assort-bread-crumbs";
import OmniAddPlanModal from "./omni-add-plan-component";
import OmniCarryoverColorwayDialog from "./omni-carryover-colorway-dialog";
import OmniMappingTable from "./omni-channel-mapping-table";
import {
  getAddRowPayloadData,
  prepareOmniTableData,
  updateOmniPayload,
} from "./omni-channel-function";

const listStyles = makeStyles(() => ({
  listDiv: {
    listStyle: "disc",
    margin: "1rem 1.5rem",
  },
}));

const CreateOmniChannel = (props) => {
  const globalClasses = GlobalStyles();
  const classes = useStyles();
  const listClasses = listStyles();
  const history = useHistory();
  const [isOpenAddPlanModal, setOpenAddPlanModal] = useState(false);
  const [channelFilterOptions, setChannelFilterOptions] = useState([]);
  const [omniMappingColumns, setOmniMappingColumns] = useState([]);
  const [omniMappingTableData, setOmniMappingTableData] = useState([]);
  const [omniMappingRTinstance, setOmniMappingRTinstance] = useState(null);
  const [level3Options, setLevel3Options] = useState([]);
  const [selectedL3Option, setSelectedL3Option] = useState({});
  const [attributeList, setAttributeList] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const uploadOmniPlan = useRef(null);
  const [omniFileSelected, setSelectedOmniFile] = useState([]);
  const planCodeIndex = history.location.pathname.lastIndexOf("/");
  const omniPlanCode = history.location.pathname.slice(planCodeIndex + 1); //To get plancode from url
  const [addPlanChannelOptions, setAddPlanChannelOptions] = useState([]);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [MOQValue, setMOQValue] = useState("");
  const [updatedOmniTableData, setUpdatedOmniTableData] = useState([]);
  const [
    showCarryoverColorwayDialog,
    setShowCarryoverColorwayDialog,
  ] = useState(false);
  const [isSaveEnabled, setIsSaveEnabled] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const omniAGInstance = useRef({});

  const DeletePlanComponent = (props) => {
    return (
      <>
        <div className={`${classes.resultContainer} ${classes.deletePlanDiv}`}>
          <div>{props.displayName}</div>
          <div
            title="Delete"
            className="icon-blue"
            onClick={() => {
              const planId =
                  props.columnGroup.providedColumnGroup.colGroupDef.column_name,
                planName = props.displayName;
              onDeletePlanColumnClick({ label: planName, id: planId });
            }}
            onFocus={() => {}}
          >
            <Delete />
          </div>
        </div>
      </>
    );
  };

  const renderBuyUnitsCell = (column, moqData) => {
    column.cellRenderer = (params) => {
      return (
        <>
          {parseInt(moqData) >
          parseInt(
            params?.data?.overall_buy_units?.toString()?.replace(",", "")
          ) ? (
            <div className={classes.buyUnitsDivBackground}>{params?.value}</div>
          ) : (
            <div>{params?.value}</div>
          )}
        </>
      );
    };
    return column;
  };

  const getPlanCodeList = () => {
    const omniTableData = props.omniMappingData.data;
    const groupBy_properties = ["source_choice_id"];
    const group_data = groupByCustom({
      Group: omniTableData,
      By: groupBy_properties,
    });
    const planCode = [];
    //To get plancodes for plans present in omni mapping table
    group_data.forEach((data) => {
      data.forEach((plan) => {
        planCode.push(plan.destination_plan_code);
      });
    });
    //To get unique plancodes
    const uniquePlancode = new Set(planCode);
    //To convert object to list(array)
    const planCodeList = [...uniquePlancode];
    return planCodeList;
  };

  const openAddPlanModal = () => {
    setOpenAddPlanModal(true);
  };

  const closeAddPlanModal = () => {
    setOpenAddPlanModal(false);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const generateOptions = (rawData) => {
    return (
      rawData?.length &&
      rawData.map((eachOption) => {
        return {
          label: eachOption,
          value: eachOption,
        };
      })
    );
  };

  const setOptionsForAttribute = (colArray) => {
    colArray.forEach((col) => {
      if (attributeList.includes(col.column_name)) {
        let col_key = col.column_name.split("attributes_");
        let attributeOptions =
          find(props.wedgeAttributeData || [], {
            attribute_name: col_key[1],
          }) || [];
        col["options"] = generateOptions(attributeOptions?.attribute_value);
      } else if (
        col.column_name === "style_carryover_flag" ||
        col.column_name === "choice_carryover_flag"
      ) {
        const options = newVsCarryOverOptions;
        col["options"] = generateOptions(options);
      }
      if (col.sub_headers?.length) {
        setOptionsForAttribute(col.sub_headers);
      }
    });
    return colArray;
  };

  const getMOQData = (omniData) => {
    let moqValue = 0;
    omniData.forEach((row) => {
      moqValue += row.attribute_value.moq;
    });
    moqValue = moqValue / omniData.length;
    return moqValue;
  };

  const getOmniMappingTableData = async () => {
    try {
      const planData = props.planDetails?.data;
      const reqData = getOmniPlanPayload(planData, props.planLevels);
      reqData.filters.push({
        attribute_name: "l3_name",
        value: [selectedL3Option["value"]],
        operator: "in",
        prefix: "source_levels",
      });
      setOmniMappingTableData([]);
      const mappingData = await props.fetchOmniMappingData(
        reqData,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setOmniMappingData(mappingData.data.data);
    } catch (error) {
      displaySnackMessages("Omni mapping data fetch failed", "error");
    }
    props.setOmniLoader(false);
  };

  useEffect(() => {
    if (props.planLevels?.data) {
      props.setLevelsJson(generateLevelJson(props.planLevels?.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planLevels]);

  useEffect(() => {
    const fetchScreenConfiguration = async () => {
      let configResp = await props.getTenantConfigApplicationLevel(2, {
        attribute_name: "assort_smart_screen_configuration",
      });
      if (configResp?.data?.status) {
        props.setScreenConfiguration(
          configResp?.data?.data?.[0]?.attribute_value
        );
      }
    };
    fetchScreenConfiguration();
  }, []);

  useEffect(() => {
    const fetchOmniData = async () => {
      try {
        props.setOmniLoader(true);
        const planData = await props.getPlanDetails(
          omniPlanCode,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        props.setPlanDetails(planData.data);
        sessionStorage.setItem("planData", JSON.stringify(planData.data));
        const levels = await props.getPlanLevels();
        props.setPlanLevels(levels?.data);
        const channels = await getChannelOptions(
          history.location.pathname,
          props.screenConfiguration
        );
        setAddPlanChannelOptions(channels);
        setChannelFilterOptions(channels);
        const reqBody = {
          filters: [
            {
              attribute_name: "source_plan_code",
              value: [planData.data.data.plan_code],
              operator: "in",
            },
          ],
        };
        const metricsData = await props.fetchOmniMappingMetrics(
          reqBody,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        props.setOmniMappingMetrics(metricsData.data.data);
      } catch (error) {
        displaySnackMessages("OmniMapping data fetch failed", "error");
      }
      props.setOmniLoader(false);
    };
    if (props.screenConfiguration?.common) {
      fetchOmniData();
    }
    return () => {
      props.setOmniMappingMetrics({});
      props.setOmniMappingData({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.screenConfiguration]);

  useEffect(() => {
    if (props.wedgeAttributeData?.length) {
      const AttributeList = props.wedgeAttributeData.map((attribute) => {
        return `attributes_${attribute.attribute_name}`;
      });
      setAttributeList(AttributeList);
    }
  }, [props.wedgeAttributeData]);

  useEffect(() => {
    const fetchWedgeAttributes = async () => {
      if (
        !isEmpty(selectedL3Option) &&
        props.planLevels?.data?.level_info.length
      ) {
        try {
          props.setOmniLoader(true);
          const planData = props.planDetails.data;
          const reqBody = getPlanPayload(planData, props.planLevels);
          reqBody.filters.push({
            attribute_name: "l3_name",
            value: [selectedL3Option["value"]],
            operator: "in",
            prefix: "levels",
          });
          const attributesData = await props.getWedgeAttributesData(
            reqBody,
            props.screenConfiguration?.common?.endpoint_project_name ||
              "assort",
            props.planDetails?.data?.plan_code
          );
          if (attributesData?.data?.status) {
            props.setWedgeAttributeData(
              attributesData.data.data.mapped_product_attributes
            );
          }
        } catch (error) {
          displaySnackMessages("OmniMapping data fetch failed", "error");
        }
        props.setOmniLoader(false);
      }
    };
    fetchWedgeAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedL3Option, props.planLevels]);

  useEffect(() => {
    if (
      attributeList?.length &&
      props.planLevels?.data?.level_info.length &&
      !isEmpty(selectedL3Option)
    ) {
      getOmniMappingTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeList, props.planLevels, selectedL3Option]);

  useEffect(() => {
    if (props.omniMappingMetrics?.length) {
      setAttributeList([]);
      const level3Data = generateOptions(props.omniMappingMetrics[0].l3_name);
      setLevel3Options(level3Data);
      setSelectedL3Option(level3Data?.[0] || {});
    }
  }, [props.omniMappingMetrics]);

  const onChangeL3 = (val) => {
    setAttributeList([]);
    setSelectedL3Option(val);
  };

  useEffect(() => {
    if (
      !isEmpty(props.omniMappingData) &&
      props.omniMappingData?.data?.length > 0
    ) {
      const omniColumns = props.omniMappingData?.columns,
        omniData = props.omniMappingData?.data,
        channelData = [];
      let omniColumnData = setOptionsForAttribute(cloneDeep(omniColumns));
      let omniTableColumnData = agGridColumnFormatter(
        omniColumnData,
        props.levelsJson
      );
      let moqData = getMOQData(omniData);
      moqData = Math.round(moqData);
      setMOQValue(moqData);
      omniTableColumnData.forEach((col, index) => {
        if (col.headerName === "OVERALL BUY UNITS") {
          //Highlist OVERALL BUY UNITS cell if MOQ is higher than OVERALL BUY UNITS value
          omniTableColumnData[index] = renderBuyUnitsCell(col, moqData);
        }
      });
      omniTableColumnData.forEach((item) => {
        if (item.column_name.includes("plan")) {
          item.headerGroupComponent = DeletePlanComponent;
        }
      });
      setOmniMappingColumns(omniTableColumnData);
      setOmniMappingTableData(props.omniMappingData.data);
      //fetch all the channels
      const channels = uniqBy(omniData, "channel")?.map((item) => {
        return item.destination_attribute_value.channel;
      });
      const channelOptions = [];
      //Filter out channels which are not present in table
      channelFilterOptions.forEach((item) => {
        if (!channels.includes(item.label)) {
          channelOptions.push(item);
        }
      });
      setAddPlanChannelOptions(channelOptions);
    } else {
      setOmniMappingTableData([]);
      setAddPlanChannelOptions(channelFilterOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.omniMappingData]);

  const downloadCSVFile = (csv_data, fileName) => {
    // Create CSV file object and feed
    // our csv_data into it
    let CSVFile = new Blob([csv_data], {
      type: "text/csv",
    });

    // Create to temporary link to initiate
    // download process
    let temp_link = document.createElement("a");

    // Download csv file
    temp_link.download = fileName;
    var url = window.URL.createObjectURL(CSVFile);
    temp_link.href = url;

    // This link should not be displayed
    temp_link.style.display = "none";
    document.body.appendChild(temp_link);

    // Automatically click the link to
    // trigger download
    temp_link.click();
    document.body.removeChild(temp_link);
  };

  const downloadOmniPlans = async () => {
    try {
      let tempColumns =
        omniAGInstance?.current?.columnApi?.columnModel?.columnDefs;
      let csvData = [];
      let sub_header = [];
      let csvrow = [];
      tempColumns.forEach((par_col, index) => {
        //pushing main header names
        if (par_col.column_name !== "delete") {
          if (!par_col.column_name.includes("plan")) {
            csvrow.push(par_col?.headerName.toUpperCase());
          } else {
            csvrow.push(par_col.headerName);
          }
          if (par_col.sub_headers?.length) {
            par_col.sub_headers.forEach((sub_col, index) => {
              if (index) {
                csvrow.push(" ");
              }
              //pushing sub header names
              sub_header.push(sub_col.headerName.toUpperCase());
            });
          } else {
            sub_header.push(" ");
          }
        }
      });
      csvData.push(csvrow.join(","));
      sub_header.pop();
      csvData.push(sub_header.join(","));
      props.setOmniLoader(true);

      const l3_name = props.omniMappingMetrics[0].l3_name.filter(
        (item) => item != null
      );
      const planData = props.planDetails?.data;
      const reqData = getOmniPlanPayload(planData, props.planLevels);
      reqData.filters.push({
        attribute_name: "l3_name",
        value: l3_name,
        operator: "in",
        prefix: "source_levels",
      });
      const mappingData = await props.fetchOmniMappingData(
        reqData,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (mappingData?.data.data) {
        const tableData = mappingData.data.data.data;
        const omniDataForDownload = prepareOmniTableData(tableData);
        let tempData = cloneDeep(omniDataForDownload);
        tempData.forEach((row) => {
          csvrow = [];
          //pushing data for each row
          csvrow.push(...Object.values(row));
          csvData.push(csvrow.join(","));
        });
        csvData = csvData.join("\n");
        let fileName = `Omni_Mapping_Sheet_${props.planDetails?.data?.["name"]}.csv`;
        downloadCSVFile(csvData, fileName);
      }
    } catch (error) {
      displaySnackMessages("Download omni plans failed", "error");
    }
    props.setOmniLoader(false);
  };

  const onDeletePlanColumnClick = (selectedPlan) => {
    setShowDeleteDialog(true);
    setDeleteInstance(selectedPlan);
    setDeleteType("column");
  };

  const deletePlanColumn = async () => {
    try {
      props.setOmniLoader(true);
      const planCodeData = props.planNameToCodeData;
      const reqBody = {
        source_plan_code: parseInt(omniPlanCode),
      };
      for (const key in planCodeData) {
        if (deleteInstance.id.includes(key)) {
          reqBody["destination_plan_code"] = planCodeData[key];
        }
      }
      if (Object.keys(planCodeData).length > 1) {
        reqBody["is_full_delete"] = "false";
        const omniDeletePlan = await props.deleteOmniPlan(
          reqBody,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (omniDeletePlan?.data.status) {
          displaySnackMessages("Omni Plan deleted successfully", "success");
          getOmniMappingTableData();
        }
      } else {
        reqBody["is_full_delete"] = "true";
        const omniDeletePlan = await props.deleteOmniPlan(
          reqBody,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (omniDeletePlan.data.status) {
          displaySnackMessages("Omni Plan deleted successfully", "success");
          getOmniMappingTableData();
          setSelectedL3Option({});
        }
      }
    } catch (error) {
      displaySnackMessages("Omni delete plan failed", "error");
      props.setOmniLoader(false);
    }
  };

  const deleteRow = async () => {
    try {
      props.setOmniLoader(true);
      const reqBody = {
        source_plan_code: parseInt(omniPlanCode),
        source_choice_id: deleteInstance?.global_choice,
      };
      const deleteRowData = await props.deleteOmnitableRow(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (deleteRowData.data.status) {
        displaySnackMessages("Omni table row deleted successfully", "success");
        getOmniMappingTableData();
      }
    } catch (error) {
      displaySnackMessages("Omni table row deletion failed", "error");
      props.setOmniLoader(false);
    }
  };
  const callDeleteApi = async () => {
    if (deleteType === "column") {
      setShowDeleteDialog(false);
      deletePlanColumn();
    } else {
      setShowDeleteDialog(false);
      deleteRow();
    }
  };
  const onDeleteRowClick = (ins) => {
    setDeleteInstance(ins);
    setShowDeleteDialog(true);
    setDeleteType("row");
  };

  const addRow = async () => {
    let arr = [],
      maxNumber,
      global_choice_prefix;
    omniAGInstance?.current?.api?.forEachNode((row) => {
      global_choice_prefix = row.data.global_choice.split("_")[0];
      arr.push(parseInt(row.data.global_choice.split("_")[1]));
    });
    maxNumber = Math.max(...arr);
    const globalChoiceAdded = global_choice_prefix + "_" + (maxNumber + 1);
    try {
      props.setOmniLoader(true);
      //Format tabledata according to payload format
      const tableData = getAddRowPayloadData(globalChoiceAdded, props);
      const reqBody = {
        omni_wedge_data: tableData,
      };
      const updateData = await props.updateOmniTableData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (updateData?.data.status) {
        displaySnackMessages("Global choice added successfully", "success");
        getOmniMappingTableData();
      }
    } catch (error) {
      displaySnackMessages("Adding row failed", "error");
      props.setOmniLoader(false);
    }
  };

  const handleOmniFileUpload = () => {
    setShowUploadModal(true);
  };

  const onOmniPlanUpload = (event) => {
    if (event.target.files?.length > 0) {
      event.preventDefault();
      setShowUploadModal(false);
      setSelectedOmniFile(event.target.files);
    }
  };

  useEffect(() => {
    const omniFileUpload = async () => {
      try {
        props.setOmniLoader(true);
        const formData = new FormData();
        formData.append("upload_file", omniFileSelected[0]);
        formData.append("plan_code", props.planDetails?.data.plan_code);
        formData.append("user_id", 3);
        const uploadOmniPlanData = await props.uploadOmniMappingFile(
          formData,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (uploadOmniPlanData?.data.status) {
          displaySnackMessages(uploadOmniPlanData.data.message, "success");
          getOmniMappingTableData();
        } else {
          displaySnackMessages(uploadOmniPlanData.data.message, "error");
          props.setOmniLoader(false);
        }
      } catch (error) {
        displaySnackMessages("Upload omni plan data failed", "error");
        props.setOmniLoader(false);
      }
    };
    if (omniFileSelected[0]) {
      omniFileUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [omniFileSelected]);

  const handleMergePlan = async () => {
    try {
      props.setOmniLoader(true);
      const planCodeList = getPlanCodeList();
      const reqBody = {
        omni_plan_code: parseInt(omniPlanCode),
        plan_code: planCodeList,
      };
      const mergePlanData = await props.mergeOmniPlan(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (mergePlanData?.data.status) {
        displaySnackMessages("Omni plan merged successful", "success");
      }
    } catch (error) {
      displaySnackMessages("Omni merge plan failed:", "error");
    }
    props.setOmniLoader(false);
  };

  const handleRefreshPlans = async () => {
    try {
      props.setOmniLoader(true);
      const planCodeList = getPlanCodeList();
      const reqBody = {
        omni_plan_code: props.planDetails.data.plan_code,
        plan_code: planCodeList,
        refresh_flag: true,
      };
      const refreshPlanData = await props.refreshPlans(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (refreshPlanData?.data.status) {
        displaySnackMessages("Omni refresh plan successful", "success");
        getOmniMappingTableData();
      }
    } catch (error) {
      displaySnackMessages("Refresh plans failed", "error");
      props.setOmniLoader(false);
    }
  };

  const updateOmniTableData = async () => {
    const tableData = cloneDeep(props.updatedOmniData);
    try {
      const reqBody = {
        omni_wedge_data: tableData,
      };
      props.setOmniLoader(true);
      const updateData = await props.updateOmniTableData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (updateData?.data.status) {
        displaySnackMessages("Omni plan data updated successfully", "success");
        setUpdatedOmniTableData([]);
        setIsSaveEnabled(false);
        getOmniMappingTableData();
      }
    } catch (error) {
      displaySnackMessages("Omni plan data update failed", "error");
    }
    props.setOmniLoader(false);
  };

  const callFinalizePlan = async () => {
    setShowFinalizeDialog(false);
    let finalizePlanResponse = await props.createPlaceholderAndChoiceId(
      {
        plan_code: props.planDetails?.data.plan_code,
      },
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (finalizePlanResponse?.data?.status) {
      const planData = await props.getPlanDetails(
        omniPlanCode,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setPlanDetails(planData.data);
      sessionStorage.setItem("planData", JSON.stringify(planData.data));
      displaySnackMessages(
        "Successfully finalized Omnichannel wedge",
        "success"
      );
    }
  };

  const onBlurMOQValue = (event) => {
    let temp = event.target.value;
    let roundOff = Math.round(temp);
    setMOQValue(roundOff);
    const omniData = updateOmniPayload(temp, props);
    setIsSaveEnabled(true);
    props.setUpdatedOmniMappingData(omniData);
  };

  const handleMOQChange = (event) => {
    setMOQValue(event.target.value);
  };

  const onToggleCarryoverColorway = (state) => {
    setShowCarryoverColorwayDialog(state);
  };

  return (
    <>
      <AssortBreadCrumbs planStep={0} location={history.location.pathname} />
      <Paper elevation={3} className={globalClasses.paper}>
        <div className={classes.headerDiv}>
          <Typography variant="h3">Omni Channel Mapping</Typography>
        </div>
        <LoadingOverlay loader={props.loader} spinner>
          <Container
            maxWidth={false}
            className={classes.typographyMarginBottom}
          >
            <Card className={`${globalClasses.paper} ${globalClasses.auto}`}>
              <PlanDataComponent />
            </Card>
            <div className={classes.paperStyle}>
              <Button
                className={`${classes.button} ${classes.bottomButton}`}
                onClick={openAddPlanModal}
                variant="contained"
                color="primary"
                id="omniaddnewplan"
              >
                Add Plan
              </Button>
              <Button
                className={classes.button}
                onClick={handleRefreshPlans}
                variant="contained"
                color="primary"
                id="omnirefreshplan"
                disabled={omniMappingTableData.length === 0 ? true : false}
              >
                Refresh Plans
              </Button>
            </div>
            {isOpenAddPlanModal && (
              <OmniAddPlanModal
                isOpen={isOpenAddPlanModal}
                handleClose={closeAddPlanModal}
                channelFilterOptions={addPlanChannelOptions}
                selectedL3Option={selectedL3Option}
                setRTinstance={setOmniMappingRTinstance}
              />
            )}
          </Container>
        </LoadingOverlay>
        {omniMappingTableData.length > 0 ? (
          <LoadingOverlay loader={props.omniLoader}>
            <Paper elevation={3} className={globalClasses.paper}>
              <div
                className={`${classes.omniMappingFilterDiv} ${classes.typographyMarginBottom}`}
              >
                <div className={classes.omniMappingFilterRow}>
                  {filterView(
                    props.levelsJson["l3_name"],
                    "l3_name",
                    level3Options,
                    onChangeL3,
                    selectedL3Option,
                    classes.omniMappingFilter
                  )}
                  <div className={classes.omniMappingFilter}>
                    <label className={"drop-down-label"}>
                      <span>MOQ:</span>
                    </label>
                    <TextField
                      type="number"
                      variant="outlined"
                      size="medium"
                      className={classes.textfieldAttribute}
                      value={MOQValue}
                      onChange={handleMOQChange}
                      onBlur={onBlurMOQValue}
                    />
                  </div>
                </div>
                <div>
                  <Button
                    variant="contained"
                    color="primary"
                    title={"Carryover Colorway"}
                    id={"carryover-colorway-details"}
                    onClick={() => onToggleCarryoverColorway(true)}
                    className={classes.button}
                  >
                    <ArrowRightAltIcon />
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    title={"Download omni mapping data"}
                    id={"download-omni-mapping-data"}
                    onClick={downloadOmniPlans}
                    className={classes.button}
                  >
                    <DownloadIcon />
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    title={"Upload omni mapping data"}
                    id={"upload-omni-mapping-data"}
                    onClick={handleOmniFileUpload}
                    className={classes.button}
                  >
                    <UploadIcon />
                    <input
                      ref={uploadOmniPlan}
                      id="uploadOmniPlan"
                      type="file"
                      hidden="true"
                      accept=".xls,.xlsx,.csv"
                      onChange={(e) => onOmniPlanUpload(e)}
                      onClick={(e) => {
                        e.target.value = null;
                      }}
                    />
                  </Button>

                  <Prompt
                    isOpen={showUploadModal}
                    title="Omni upload file validations:"
                    subHeading={``}
                    infoList={omniFileUploadValidation?.map((text, index) => {
                      return (
                        <ListItem key={index} sx={{ display: "list-item" }}>
                          {text}
                        </ListItem>
                      );
                    })}
                    primaryButtonProps={{
                      children: common.__ConfirmBtnText,
                      onClick: () => {
                        uploadOmniPlan.current.click();
                        setShowUploadModal(false);
                      },
                    }}
                    tertiaryButtonProps={{
                      children: common.__RejectBtnText,
                      onClick: () => setShowUploadModal(false),
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    id="create-new-l3"
                    onClick={() => addRow()}
                    className={classes.button}
                  >
                    <Add />
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    id="save-omni-data"
                    onClick={updateOmniTableData}
                    disabled={!isSaveEnabled}
                  >
                    <Save />
                  </Button>
                </div>
              </div>
              <OmniMappingTable
                omniMappingColumns={omniMappingColumns}
                omniMappingRows={omniMappingTableData}
                RTinstance={omniMappingRTinstance}
                setRTinstance={setOmniMappingRTinstance}
                selectedL3Data={selectedL3Option}
                onDeletePlanColumnClick={onDeletePlanColumnClick}
                onDeleteRowClick={onDeleteRowClick}
                updatedOmniTableData={updatedOmniTableData}
                setUpdatedOmniTableData={setUpdatedOmniTableData}
                attributeList={attributeList}
                setIsSaveEnabled={setIsSaveEnabled}
                omniAGInstance={omniAGInstance}
              />
              <div className={classes.bottomButtonDiv}>
                <Button
                  variant="contained"
                  color="primary"
                  id="finalize-omni-channel-wedge"
                  onClick={() => setShowFinalizeDialog(true)}
                  className={classes.button}
                >
                  Finalize Omnichannel Wedge
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  id="merge-plan"
                  className={classes.button}
                  onClick={handleMergePlan}
                  disabled={props.planDetails?.data?.plan_step < 6}
                >
                  Merge with Plan
                </Button>
              </div>
            </Paper>
          </LoadingOverlay>
        ) : (
          <LoadingOverlay loader={props.omniLoader}>
            <Card className={`${globalClasses.paper} ${globalClasses.scroll}`}>
              <div className={classes.headerDiv}>
                {" "}
                No data available. Please Add plan to proceed
              </div>
            </Card>
          </LoadingOverlay>
        )}

        <Prompt
          isOpen={showDeleteDialog}
          title="Confirm Delete"
          subHeading={`Are you sure you want to delete ${
            deleteType === "column"
              ? deleteInstance?.label
              : deleteInstance?.global_choice
          }?`}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => {
              callDeleteApi();
              setShowDeleteDialog(false);
            },
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => setShowDeleteDialog(false),
          }}
          variant="error"
        />

        <Prompt
          isOpen={showFinalizeDialog}
          title="Confirm Finalizing plan"
          subHeading="Are you sure you want to finalize Omnichannel plan and create IA placeholder IDs?"
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => {
              callFinalizePlan();
              setShowFinalizeDialog(false);
            },
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => setShowFinalizeDialog(false),
          }}
        />
        {showCarryoverColorwayDialog ? (
          <OmniCarryoverColorwayDialog
            onToggleCarryoverColorway={onToggleCarryoverColorway}
          />
        ) : null}
      </Paper>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    loader: store.assortsmartReducer.planDashboardReducer.dashboard_loader,
    omniMappingMetrics:
      store.assortsmartReducer.omniChannelReducer.omniMappingMetrics,
    omniMappingData:
      store.assortsmartReducer.omniChannelReducer.omniMappingData,
    omniLoader: store.assortsmartReducer.omniChannelReducer.omniLoader,
    levelsJson: store.assortsmartReducer.planDashboardReducer.levelsJson,
    wedgeAttributeData:
      store.assortsmartReducer.planWedgeReducer.wedgeAttributeData,
    updatedOmniData:
      store.assortsmartReducer.omniChannelReducer.updatedOmniMappingData,
    planNameToCodeData:
      store.assortsmartReducer.omniChannelReducer.planNameToCodeData,
    columnHeaderJson:
      store.assortsmartReducer.planDashboardReducer.columnHeaderJson,
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapActionsToProps = {
  getPlanDetails,
  setPlanDetails,
  getPlanLevels,
  setPlanLevels,
  setLevelsJson,
  getStoreChannels,
  fetchOmniMappingData,
  fetchOmniMappingMetrics,
  setOmniMappingMetrics,
  setOmniMappingData,
  setOmniLoader,
  addSnack,
  getWedgeAttributesData,
  setWedgeAttributeData,
  uploadOmniMappingFile,
  mergeOmniPlan,
  refreshPlans,
  updateOmniTableData,
  deleteOmniPlan,
  setUpdatedOmniMappingData,
  deleteOmnitableRow,
  createPlaceholderAndChoiceId,
  getTenantConfigApplicationLevel,
  setScreenConfiguration,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(CreateOmniChannel));
