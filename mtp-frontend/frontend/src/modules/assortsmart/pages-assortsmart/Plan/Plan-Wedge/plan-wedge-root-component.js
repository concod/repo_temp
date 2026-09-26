import { useEffect, useRef, useState } from "react";
import { Add, LocalShipping, Remove, Save } from "@mui/icons-material";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import Delete from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import {
  Button,
  Card,
  Grid,
  IconButton,
  TextField,
  Typography,
  Box,
  InputLabel,
} from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { useHistory } from "react-router";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { pollingService } from "core/Utils/functions/helpers/errorhandler-helpers";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt } from "impact-ui";
import { cloneDeep, isArray, isEmpty, times } from "lodash";
import { BUDGET_POLL } from "modules/assortsmart/constants-assortsmart/apiConstants";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { Accordion } from "impact-ui";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planWedgeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import moment from "moment";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { bindActionCreators } from "redux";
import {
  deleteDataFetch,
  deleteWedgeChoice,
  getOptimizeWedge,
  getPlanMetricsData,
  getPlanSetupdrops,
  getWedgeAttributesData,
  set2_3_Loader,
  setConstraint_2_3_Loader,
  setDeleteChoiceData,
  setDeleteChoiceLoader,
  setDeleteStyleData,
  setPlanMetricsData,
  setPlanSetupDrops,
  setShowWedgeScreen,
  setUpdatePlanSetupDropsResponse,
  setWedgeAttributeData,
  setWedgeData,
  setWedgeFiltersData,
  updateEOP,
  updatePlanSetupdrops,
  updateStyleWedgeData,
  updateWedgeData,
  uploadWedgeData,
  updateChoiceSet,
  deleteChoiceSet,
  imageGenWedgeMapping,
  downloadWedgeData,
} from "../../../services-assortsmart/Plan/Plan-Wedge/plan-wedge-service";
import {
  addDropToPayload,
  attributeFormatter,
  filterView,
  getPlanPayload,
  isChannelMultiple,
  isDropPlan,
} from "../../../utils-assortsmart/utilityFunctions";
import PlanModal from "../../Plan-Dashboard/components/create-or-copy-plan-modal";
import AddChoiceComponent from "./add-choice-component";
import AddStyleComponent from "./add-style-component";
import DeleteWedgeDataModal from "./delete-choices-component";
import DepthMultiplier from "./depth-multiplier-component";
import DropShipModal from "./drop-ship-component";
import MapStyleComponent from "./map-style-component";
import OptimizationConstraintTableComponent from "./optimization-constraint-table-component";
import PacDownloadComponent from "./pac-download-component";
import PlanWedgeComponent from "./plan-wedge-component";
import { generateDropDownOptions } from "./plan-wedge-functions";
import StyleLevelWedgeComponent from "./style-level-wedge-component";
import Select from "core/commonComponents/filters/Select/Select";
import "./wedge.scss";
import AddPackComponent from "./add-pack-component";
import WedgeStyleMapping from "./wedge-style-mapping";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import UploadComponent from "./upload-component";

const PlanWedgeRootComponent = (props) => {
  const downloadWedge = useRef(null);
  const uploadWedge = useRef(null);
  const [showWedge, setShowWedge] = useState(false);
  const [l1Options, setL1Options] = useState([]);
  const [selectedL1FilterValue, setSelectedL1FilterValue] = useState({});
  const [selectedL2FilterValue, setSelectedL2FilterValue] = useState({});
  const [l2Options, setL2Options] = useState([]);
  const [selectedL3FilterValue, setSelectedL3FilterValue] = useState({});
  const [l3Options, setL3Options] = useState([]);
  const [dropOptions, setDropOptions] = useState([]);
  const [flowOptions, setFlowOptions] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState([]);
  const [choiceCarryoverOption, setChoiceCarryoverOption] = useState([]);
  const [selectedChoiceCarryoverFlag, setChoiceCarryoverFlag] = useState({});
  const [wedgeRTinstance, setWedgeRTinstance] = useState(null);
  const [showDepthMultiplierModal, setShowDepthMultiplierModal] = useState(
    false
  );
  const [wedgeDataForDownload, setWedgeDataForDownload] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const [uniqueClusterListWedge, setUniqueClusterListWedge] = useState([]);
  const [finalWedgeData, setFinalWedgeData] = useState([]);
  const [finalStyleWedgeData, setFinalStyleWedgeData] = useState([]);
  const [wedgeHeaderList, setWedgeHeaderList] = useState([]);
  const [selectedWedgeFile, setSelectedWedgeFile] = useState([]);
  // set these values to initial states on closing the modal
  const [updatedSetupDropTableData, setUpdatedSetupDropTableData] = useState(
    []
  );
  const [callWedge, setCallWedge] = useState(false);
  const [callUpdateStyleWedge, setCallUpdateStyleWedge] = useState(false);
  const [callUpdateChoiceWedge, setCallUpdateChoiceWedge] = useState(false);
  const [downloadAtL3, setDownloadAtL3] = useState(false);
  const [isDownload, setIsDownload] = useState(false);
  const [isOpenCreatePlanModal, setIsOpenCreatePlanModal] = useState(false);
  const [selectedDropFilterValue, setSelectedDropFilterValue] = useState({});
  const [choiceNumber, setChoiceNumber] = useState(1);
  const [styleNumber, setStyleNumber] = useState(1);
  const [packNumber, setPackNumber] = useState(2);
  const [showAddChoiceModal, setShowAddChoiceModal] = useState(false);
  const [wedgeColumn, setWedgeColumn] = useState([]);
  const [wedgeTableData, setWedgeTableData] = useState([]);
  const [wedgeStyleTableData, setWedgeStyleTableData] = useState([]);
  const [showDeleteChoicePopup, setShowDeleteChoicePopup] = useState(false);
  const [showDeleteStylePopup, setShowDeleteStylePopup] = useState(false);
  const [showDeleteTablePopup, setShowDeleteTablePopup] = useState(false);
  const [showDropShipTablePopup, setShowDropShipTablePopup] = useState(false);
  const [holdBudget, setHoldBudget] = useState(false);
  const [deleteChoiceColumns, setDeleteChoiceColumns] = useState([]);
  const [deleteStyleColumns, setDeleteStyleColumns] = useState([]);
  const [dropShipColumns, setDropShipColumns] = useState([]);
  const [showConfirmDropShipDialog, setShowConfirmDropShipDialog] = useState(
    false
  );
  const [dropShipChoices, setDropShipChoices] = useState([]);
  const [dropShipHoldBudget, setDropShipHoldBudget] = useState(false);
  const [showGenerateWedgeOption, setShowGenerateWedgeOption] = useState(true);
  const [showDropshipIcon, setShowDropshipIcon] = useState(true);
  const [styleLevelColumn, setStyleLevelColumn] = useState([]);
  const [
    showConfirmScaleUpDownDialog,
    setShowConfirmScaleUpDownDialog,
  ] = useState(false);
  const [selectedDropData, setSelectedDropData] = useState(null);
  const [groupedDrops, setGroupedDrops] = useState(null);
  const [isScaleUpDownDisabled, setIsScaleUpDownDisabled] = useState(true);
  const [editedChoiceUnits, setEditedChoiceUnits] = useState([]);
  const [showAddStyleModal, setShowAddStyleModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [showMapStyleModal, setShowMapStyleModal] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState([]);
  const [updateStyleWedge, setUpdateStyleWedge] = useState(false);
  const [enableUpdateStyleBtn, setEnableUpdateStyleBtn] = useState(false);
  const [showPacDownloadModal, setShowPacDownloadModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [packOptions, setPackOptions] = useState([]);
  const [selectedPackValue, setSelectedPackValue] = useState(null);
  const [showAddSetField, setShowAddSetField] = useState(false);
  const [packName, setPackName] = useState("");
  const [flowList, setFlowList] = useState([]);
  const [selectedChoices, setSelectedChoices] = useState([]);
  const [showStyleMapping, setShowStyleMapping] = useState(false);
  const [choiceSetDetails, setChoiceDetails] = useState([]);
  const [showSetLoader, setShowSetLoader] = useState(false);
  const [callPackData, setCallPackData] = useState(true);
  const [isChoiceWedgeChanged, setIsChoiceWedgeChanged] = useState(false);
  const [unmappedWedgeAttributes, setUnMappedWedgeAttributes] = useState([]);
  const [isStyleWedgeChanged, setIsStyleWedgeChanged] = useState(false);
  const [callIntegrateMapData, setCallIntegrateMapData] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showConstraint, setShowContarint] = useState(false);
  const [renderConstarint, setRenderConstraint] = useState(false);
  const [wedgeSelectedRow, setWedgeSelectedRow] = useState([]);
  const [setupDropsLoader, setSetupDropsLoader] = useState(false);

  const history = useHistory();
  let propsRef = useRef({});
  const centerLoaderStyles = useRef({ margin: "14rem 45rem" });
  const classes = useStyles();
  const globalClasses = globalStyles();
  let planSubstep = useRef(
    props.planDetails?.data?.plan_step === 2.3
      ? props.planDetails?.data?.plan_sub_step
        ? props.planDetails?.data?.plan_sub_step
        : "optimization_constraint_table"
      : "wedge_table"
  );

  useEffect(() => {
    propsRef.current = props;
  }, [props.wedgeFiltersData]);

  useEffect(() => {
    if (window.innerHeight && window.pageYOffset && props.isConstraintLoading) {
      centerLoaderStyles.current = {
        margin: `calc(${window.innerHeight}px + ${window.pageYOffset}px - 650px) 45rem`,
      };
    }
  }, [props.isConstraintLoading]);

  useEffect(() => {
    setRenderConstraint(false);
    props.setDisableNext(true);
    if (
      props.screenConfiguration?.common?.assort_sidebar_value_exclude !== ""
    ) {
      setShowGenerateWedgeOption(false);
    }
    let showDropshipIcon = props.screenConfiguration?.["2.3"]?.show_dropship;
    setShowDropshipIcon(showDropshipIcon);
    let planCode = props.planDetails?.data?.plan_code;
    let AssortNLE = parseInt(localStorage.getItem("AssortNLE"));
    if (
      !props.initialLoadWedge ||
      props.fromDashboardScreen_2_3 ||
      planCode === AssortNLE
    ) {
      setShowLoader(true);
      setShowWedge(true);
      setShowContarint(false);
      planSubstep.current = "wedge_table";
      props.set2_3_Loader(true);
    }
    setRenderConstraint(true);
  }, []);

  useEffect(() => {
    if (
      props.wedgeFiltersData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let drop =
        props.wedgeFiltersData[0]?.l1FilterValue?.[0]?.[
          props.screenConfiguration?.common?.drop_key || "drop"
        ];
      if (
        !selectedDropData &&
        [props.screenConfiguration?.common?.drop_key || "drop"]?.length
      ) {
        setSelectedDropData(drop[0]);
        let dropArrData = [];
        drop.map((data) => {
          dropArrData[data] = data;
        });
        setGroupedDrops(dropArrData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.wedgeFiltersData]);

  useEffect(() => {
    if (
      props.wedgeFiltersData?.length &&
      isDropPlan(
        props.planDetails?.data,
        `${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        }_count`
      )
    ) {
      let flowOptions = generateDropDownOptions(
        props.wedgeFiltersData[0]?.l1FilterValue?.[0]?.[
          `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
        ]?.[selectedDropData]
      );
      setFlowOptions(flowOptions);
      setSelectedFlow(flowOptions?.[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDropData]);

  useEffect(() => {
    return () => {
      props.setShowReceiptDrawer(false);
      props.setWedgeAttributeData([]);
      props.setPlanMetricsData([]);
      props.setWedgeFiltersData([]);
      props.setWedgeData([]);
    };
  }, []);

  useEffect(() => {
    if (isDownload) {
      downloadWedge.current.link.click();
      setIsDownload(false);
    }
  }, [wedgeDataForDownload]);

  useEffect(() => {
    if (!props.disableNext) {
      setShowLoader(false);
    }
  }, [props.disableNext]);

  useEffect(() => {
    if (showWedge) {
      fetchPlanMetrics(props.setPlanMetricsData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWedge]);

  useEffect(() => {
    if (!isEmpty(selectedL1FilterValue) && showWedge) {
      props.set2_3_Loader(true);
      fetchPlanMetrics(props.setWedgeFiltersData, true, "l1FilterValue");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedL1FilterValue, showWedge]);

  useEffect(() => {
    props.setShowWedgeScreen(showWedge);
  }, [showWedge]);

  useEffect(() => {
    if (props.planMetricsData?.length) {
      if (props.planMetricsData[0]?.["l1_name"] !== null) {
        const tempL1Options = generateOptions(
          props.planMetricsData[0]?.["l1_name"]
        );
        setL1Options(tempL1Options);
        setSelectedL1FilterValue(tempL1Options?.[0] || {});
      } else {
        setShowLoader(false);
      }
    }
    const tempChoiceCarryoverOptions = generateOptions(["Carryover", "New"]);
    setChoiceCarryoverOption(tempChoiceCarryoverOptions);
    setChoiceCarryoverFlag(tempChoiceCarryoverOptions?.[0] || {});
  }, [props.planMetricsData]);

  useEffect(() => {
    if (props.wedgeFiltersData?.length) {
      Object.keys(props.wedgeFiltersData?.[0]).forEach((key) => {
        // If L1 filter is changed, check l1FilterValue key and set dropdown options for l2 and l3
        if (key === "l1FilterValue") {
          let tempL3Options = generateOptions(
            props.wedgeFiltersData[0]?.l1FilterValue?.[0]?.l3_name
          );
          setL3Options(tempL3Options);
          if (
            (!isArray(selectedL3FilterValue) &&
              !selectedL3FilterValue?.value) ||
            (isArray(selectedL3FilterValue) && !selectedL3FilterValue?.length)
          ) {
            setSelectedL3FilterValue(tempL3Options?.[0] || {});
          }

          let tempL2Options = generateOptions(
            props.wedgeFiltersData[0]?.l1FilterValue?.[0]?.l2_name
          );
          setL2Options(tempL2Options);
          if (!selectedL2FilterValue?.value) {
            setSelectedL2FilterValue(tempL2Options?.[0] || {});
          }
        } else if (key === "l2FilterValue") {
          // If L2 filter is changed, check l2FilterValue key and set dropdown options for l3 dropdown
          let tempL3Options = generateOptions(
            props.wedgeFiltersData[0]?.l2FilterValue?.[0]?.l3_name
          );
          setL3Options(tempL3Options);
          if (
            (!isArray(selectedL3FilterValue) &&
              !selectedL3FilterValue?.value) ||
            (isArray(selectedL3FilterValue) && !selectedL3FilterValue?.length)
          ) {
            setSelectedL3FilterValue(tempL3Options?.[0] || {});
          }
          if (selectedL2FilterValue?.value) {
            setSelectedL2FilterValue(
              {
                label:
                  props.wedgeFiltersData[0]?.l2FilterValue?.[0]?.l2_name?.[0],
                value:
                  props.wedgeFiltersData[0]?.l2FilterValue?.[0]?.l2_name?.[0],
              } || {}
            );
          }
          setFlowList(
            props.wedgeFiltersData[0]?.l2FilterValue?.[0]?.[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
            ]
          );
        } else if (
          key === "l3FilterValue" &&
          (props.screenConfiguration?.common?.final_level === "l3_name" ||
            !props.screenConfiguration?.common?.final_level)
        ) {
          setFlowList(
            props.wedgeFiltersData[0]?.l3FilterValue?.[0]?.[
              `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
            ]
          );
        }
      });
      return;
    }
  }, [props.wedgeFiltersData]);
  useEffect(() => {
    if (props.planDetails?.data) {
      const dropCount =
        props.planDetails?.data?.[
          `${
            props.screenConfiguration?.common?.drop_key.includes("drop")
              ? "drops"
              : props.screenConfiguration?.common?.drop_key || "drops"
          }_count`
        ];
      let dropOptions = [];
      for (let index = 0; index < dropCount; index++) {
        dropOptions.push({
          label: attributeFormatter(
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_` +
              (index + 1)
          ),
          value:
            `${
              props.screenConfiguration?.common?.drop_key.includes("drop")
                ? "drops"
                : props.screenConfiguration?.common?.drop_key || "drops"
            }_` +
            (index + 1),
        });
      }
      setDropOptions(dropOptions);
      setSelectedDropFilterValue(dropOptions?.[0] || {});
      if (
        (props.planDetails?.data?.plan_step === 2.3 &&
          props.planDetails?.data?.plan_sub_step !== "wedge_table") ||
        (props.initialLoadWedge &&
          props.planDetails?.data?.plan_sub_step !== "wedge_table")
      ) {
        setShowContarint(true);
      }
      setRenderConstraint(true);
    }
  }, [props.planDetails]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let planData = cloneDeep(props.planDetails.data);
        planData.l1_name = [selectedL1FilterValue?.value];
        planData.l2_name = [selectedL2FilterValue?.value];
        if (
          !selectedL3FilterValue?.value &&
          selectedL3FilterValue?.length > 0
        ) {
          let level3Arr = [];
          selectedL3FilterValue.forEach((level3) => {
            level3Arr.push(level3?.value);
          });
          planData.l3_name = level3Arr;
        } else {
          planData.l3_name = [selectedL3FilterValue?.value];
        }
        let payload = getPlanPayload(planData, props.planLevels);
        if (props.screenConfiguration?.common?.final_level === "l2_name") {
          payload.filters.push({
            attribute_name: "l2_name",
            value: planData["l2_name"],
            prefix: "levels",
            operator: "in",
          });
        } else {
          payload.filters.push({
            attribute_name: "l3_name",
            value: planData["l3_name"],
            prefix: "levels",
            operator: "in",
          });
        }
        let attributeResponse = await props.getWedgeAttributesData(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (attributeResponse?.data?.status) {
          props.setWedgeAttributeData(
            attributeResponse?.data?.data?.mapped_product_attributes
          );
          setUnMappedWedgeAttributes(
            attributeResponse?.data?.data?.unmapped_product_attributes
          );
        }
        if (!attributeResponse?.data?.data?.length) {
          setCallWedge(true);
        }
      } catch (err) {
        props.set2_3_Loader(false);
        displaySnackMessage("Fetching wedge details failed", "error");
      }
    };
    if (
      (selectedL3FilterValue?.value ||
        selectedL3FilterValue?.length ||
        props.screenConfiguration?.common?.final_level === "l2_name") &&
      selectedL2FilterValue?.value &&
      selectedL1FilterValue?.value
    ) {
      fetchData();
      props.set2_3_Loader(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedL3FilterValue, selectedL2FilterValue]);

  useEffect(async () => {
    if (selectedWedgeFile[0]) {
      props.set2_3_Loader(true);
      const formData = new FormData();
      formData.append("upload_file", selectedWedgeFile[0]);
      formData.append("plan_code", props.planDetails?.data.plan_code);
      formData.append("user_id", 1); //To be actualised later
      if (
        props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart"
      ) {
        formData.append("wedge_level", "choice_level");
      }
      let uploadWedgeResponse = await props.uploadWedgeData(
        formData,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (uploadWedgeResponse?.data?.status) {
        if (uploadWedgeResponse?.data?.message === "3") {
          setSelectedWedgeFile([]);
          setCallWedge(true);
          if (props.statusImageMap) {
            callImageWedgeMap();
          }
          return displaySnackMessage(
            "No Scaling: update successful",
            "success"
          );
        } else if (uploadWedgeResponse?.data?.message !== "1") {
          setSelectedWedgeFile([]);
          props.set2_3_Loader(false);
          return displaySnackMessage("Invalid file upload", "error");
        }
        setSelectedWedgeFile([]);
        setCallWedge(true);
        if (props.statusImageMap) {
          callImageWedgeMap();
        }
        displaySnackMessage("Wedge data uploaded successfully", "success");
      } else {
        props.set2_3_Loader(false);
        displaySnackMessage("Failed to upload wedge", "error");
      }
    }
  }, [selectedWedgeFile]);

  useEffect(() => {
    if (props.screenConfiguration?.["2.3"]?.enable_set) {
      let setNameArray = choiceSetDetails
        .filter((set) => set.set_name && set.set_name !== "")
        .map((obj) => obj.choice_name);
      let commonElements = editedChoiceUnits?.length
        ? editedChoiceUnits.filter((element) => !setNameArray.includes(element))
        : [];
      if (
        commonElements?.length ||
        (!setNameArray?.length && editedChoiceUnits?.length)
      ) {
        setIsScaleUpDownDisabled(false);
      } else {
        setIsScaleUpDownDisabled(true);
      }
    }
  }, [editedChoiceUnits?.length, choiceSetDetails]);

  const generateOptions = (rawData) => {
    return (
      rawData?.length &&
      rawData.map((eachOption) => {
        return {
          label: Number(eachOption)
            ? parseInt(eachOption)
            : replaceSpecialCharacter(eachOption),
          value: eachOption,
        };
      })
    );
  };

  const openCreatePlanModal = async () => {
    try {
      set2_3_Loader(true);
      const reqBody = {
        plan_wedge_data: finalWedgeData,
        is_completed: true,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_market_style_change: false,
        is_value_changed: isChoiceWedgeChanged,
        is_style_color_value_change: props.isStyleColorChanged,
      };
      if (props.screenConfiguration?.common?.show_style_level) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setIsStyleColorChanged(false);
      if (updateResponse?.data.status) {
        if (props.statusImageMap) {
          callImageWedgeMap();
        }
        displaySnackMessage(
          updateResponse?.data?.data?.message || updateResponse?.data?.message,
          updateResponse?.data?.data?.message_type
        );
        setIsChoiceWedgeChanged(false);
        setIsOpenCreatePlanModal(true);
      }
    } catch (error) {
      displaySnackMessage("Update wedge failed", "error");
    }
    set2_3_Loader(false);
  };

  const closeCreatePlanModal = () => {
    setIsOpenCreatePlanModal(false);
  };

  const toggleViewDepthMultiplier = (value) => {
    setShowDepthMultiplierModal(value);
  };

  const toggleViewAddChoiceModal = (value, wedge_type) => {
    if (wedge_type === "style-mapping") {
      setShowStyleMapping(false);
    } else if (wedge_type === "choice") {
      setChoiceNumber(1);
      setShowAddChoiceModal(value);
    } else if (wedge_type === "set") {
      setPackNumber(2);
      setShowPackModal(value);
    } else {
      setStyleNumber(1);
      setShowAddStyleModal(value);
    }
  };

  const displaySnackMessage = (msg, type) => {
    props.addSnack({
      message: msg,
      options: {
        variant: type,
      },
    });
  };

  const onWedgePollingSucess = () => {
    // props.set2_3_Loader(false);
    setShowWedge(true);
    setShowContarint(false);
    props.setFromDashboardScreen_2_3(true);
    planSubstep.current = "wedge_table";
    props.setActiveSubStep("wedge_table");
    setRenderConstraint(true);
    if (props.screenConfiguration.common.show_product_image) {
      callImageWedgeMap();
    }
  };

  const onWedgePollingFailure = () => {
    setRenderConstraint(true);
    props.set2_3_Loader(false);
    displaySnackMessage("Something went wrong", "error");
  };

  const callOptimizeWedge = async () => {
    try {
      props.set2_3_Loader(true);
      setShowWedge(false);
      setShowContarint(true);
      props.setInitialLoadFinalize(true);
      props.setFromDashboardScreen_2_4(false);
      props.setPlanMetricsData([]);
      props.setWedgeFiltersData([]);
      props.setWedgeData([]);
      props.setWedgeAttributeData([]);
      setSelectedL1FilterValue({});
      setSelectedL2FilterValue({});
      setSelectedL3FilterValue({});
      let planData = props.planDetails?.data;
      let payload = getPlanPayload(planData, props.planLevels, true);
      payload.filters.push({
        attribute_name: "channel",
        value: planData.channel,
        prefix: "levels",
        operator: "in",
      });
      payload.filters.push({
        attribute_name: "special_classification",
        value: planData.channel,
        operator: "in",
      });
      payload.filters.push({
        attribute_name: "sub_channel",
        value: planData.sub_channel || planData.channel,
        prefix: "levels",
        operator: "in",
      });
      payload = addDropToPayload(
        props.planDetails?.data,
        payload,
        props.screenConfiguration?.common?.drop_key
      );
      payload.compare_type = planData.compare_year;
      if (planData.data_pull_source) {
        payload.data_pull_source = planData.data_pull_source;
      }
      payload.compare_season = planData.compare_season || "";
      payload.run_size_curve_flag = false;
      payload.plan_sub_step = "wedge_table";
      props.setDisableNext(true);
      const optimizeWedgeResponse = await props.getOptimizeWedge(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (optimizeWedgeResponse.data.data.status) {
        const reqId = optimizeWedgeResponse.data?.data?.status?.task_id;
        setRenderConstraint(false);
        //Poll to the server till we receive the response
        pollingService(
          `${BUDGET_POLL}${reqId}`,
          onWedgePollingSucess,
          onWedgePollingFailure
        );
        displaySnackMessage(
          "Please wait for sometime till we process!",
          "success"
        );
      } else {
        displaySnackMessage("Failed to optimize wedge", "error");
        props.set2_3_Loader(false);
        props.setConstraint_2_3_Loader(false);
      }
    } catch (err) {
      props.set2_3_Loader(false);
      props.setConstraint_2_3_Loader(false);
      displaySnackMessage("Failed to optimize wedge", "error");
    }
  };

  const onImageGenWedgePollingSucess = (reload_wedge) => {
    props.setStatusImageMap(false);
    if (reload_wedge) {
      setCallWedge(true);
    } else {
      props.set2_3_Loader(false);
    }
  };

  const onImageGenWedgePollingFailure = () => {
    props.set2_3_Loader(false);
    props.setStatusImageMap(false);
    displaySnackMessage("Something went wrong", "error");
  };

  const callImageWedgeMap = async () => {
    let payload = {
      plan_code: props.planDetails?.data?.plan_code,
    };
    const response = await props.imageGenWedgeMapping(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (response.data.data.status) {
      //Poll to the server till we receive the response
      response.data.data.task_id.map((taskID, index) => {
        let reload_wedge =
          response.data.data.task_id?.length === index + 1 ? true : false;
        pollingService(
          `${BUDGET_POLL}${taskID}`,
          () => onImageGenWedgePollingSucess(reload_wedge),
          onImageGenWedgePollingFailure
        );
      });
      props.setStatusImageMap(false);
      displaySnackMessage(response.data.data.message, "success");
    } else {
      displaySnackMessage("Failed image wedge mapping", "error");
    }
  };

  const fetchPlanSetupDrops = async () => {
    try {
      let dropsValue = [];
      for (let i = 1; i <= props.planDetails?.data?.[`${"drops"}_count`]; i++) {
        dropsValue.push(props.planDetails?.data[`drops_${i}`]);
      }
      let startDate = moment(
        props.planDetails?.data.selling_period_sdate
      ).format("YYYY-MM-DD");
      let endDate = moment(props.planDetails?.data.selling_period_edate).format(
        "YYYY-MM-DD"
      );
      let planData = cloneDeep(props.planDetails?.data);
      let payload = getPlanPayload(planData, props.planLevels, false, true);
      payload.filters = payload.filters.filter((obj) => obj.value);
      payload.filters.push(
        {
          attribute_name: "start_date",
          operator: "in",
          value: [startDate],
        },
        {
          attribute_name: "end_date",
          operator: "in",
          value: [endDate],
        },
        {
          attribute_name: props.screenConfiguration?.common?.drop_key || "drop",
          operator: "in",
          value: dropsValue,
        },
        {
          attribute_name: "compare_type",
          operator: "in",
          value: [planData.compare_year],
        }
      );
      payload.compare_season = planData.compare_season;
      if (planData?.data_pull_source) {
        payload.data_pull_source = planData.data_pull_source;
      }
      let reqBody = { ...payload };
      let response = await props.getPlanSetupdrops(
        reqBody,
        "assort",
        props.planDetails?.data?.plan_code
      );
      props.setPlanSetupDrops(response.data);
      setSetupDropsLoader(false);
    } catch (err) {
      props.set2_3_Loader(false);
      displaySnackMessage(
        `Failed to fetch setup ${
          props.screenConfiguration?.common?.drop_key.includes("drop")
            ? "drops"
            : props.screenConfiguration?.common?.drop_key || "drops"
        } data`,
        "error"
      );
    }
  };

  const callUpdateSetupDrop = async () => {
    if (!isEmpty(updatedSetupDropTableData)) {
      let body = [];
      updatedSetupDropTableData.map((obj) => {
        if (obj.l3_name !== "Total") {
          let attributes = {};
          for (
            let i = 1;
            i <=
            props.planDetails?.data?.[
              `${
                props.screenConfiguration?.common?.drop_key.includes("drop")
                  ? "drops"
                  : props.screenConfiguration?.common?.drop_key || "drops"
              }_count`
            ];
            i++
          ) {
            attributes[
              `total_percentage_${
                props.screenConfiguration?.common?.flow_key || "flow"
              }`
            ] = obj["penetration_total"];
            attributes[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_rcpt_qty`
            ] =
              obj[
                `receipt_unit_${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}`
              ];
            attributes[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_percentage_${
                props.screenConfiguration?.common?.flow_key || "flow"
              }`
            ] =
              obj[
                `penetration_${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}`
              ] / 100;
            attributes[
              `${
                props.screenConfiguration?.common?.flow_key || "flow"
              }_${i}_rcpt_$`
            ] =
              obj[
                `receipt($)_${
                  props.screenConfiguration?.common?.flow_key || "flow"
                }_${i}`
              ];
            attributes["total_rcpt_$"] = obj["total_receipts($)"];
            attributes["total_rcpt_qty"] = obj["receipt_unit_total"];
          }
          body.push({
            plan_code: obj.plan_code,
            plan_wedge_opt_drop_id: obj.plan_wedge_opt_drop_id,
            drop_split: obj.drop_split,
            choice_flow: obj.choice_flow,
            attribute_value: attributes,
          });
        }
      });
      return await props.updatePlanSetupdrops(
        {
          plan_wedge_opt_drop_data: body,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
    }
    return {};
  };

  const generateWedge = async () => {
    props.set2_3_Loader(true);
    let response = await callUpdateSetupDrop();

    if (response.data.data?.status === 200) {
      props.setEnableStep(2.3);
      props.setInitialLoadFinalize(true);
      props.setFromDashboardScreen_2_4(false);
      props.setUpdatePlanSetupDropsResponse(true);
      displaySnackMessage(response.data.data?.message, "success");
      callOptimizeWedge();
    }
  };

  const getWedgeHeadersForExcelDownload = (column) => {
    const attributeData = column;
    let headers = [{ label: "Plan Code", key: "plan_code" }];
    attributeData?.length &&
      attributeData.forEach((data) => {
        if (
          data["id"].includes("attributes") ||
          data["id"].includes("season_date_for_now")
        ) {
          data?.children &&
            data?.children.forEach((sub_col) => {
              headers.push({
                label: sub_col["headerName"],
                key: sub_col["id"],
              });
            });
        } else if (
          data["id"] !== "wedge_id" &&
          data["id"] !== "parent_wedge_id" &&
          !data["id"].includes("clusters") &&
          (!isChannelMultiple(props.planDetails?.data) ||
            (isChannelMultiple(props.planDetails?.data) &&
              !data["id"].includes("_units") &&
              !data["id"].includes("_forecasted_qty") &&
              (!data["id"].includes("_door_count") ||
                data["id"] === "total_door_count")))
        ) {
          headers.push({ label: data["headerName"], key: data["id"] });
        }
      });
    setWedgeHeaderList(headers);
  };

  const getDataForExcelDownlaod = (instance) => {
    let dataClone = [];
    instance?.data?.forEach((data) => {
      dataClone.push(data);
      if (data?.subRows?.length) {
        dataClone.push(...data.subRows);
      }
    });
    if (!downloadAtL3) {
      setWedgeDataForDownload(dataClone);
    }
  };

  const onWedgeFileUploaded = (event) => {
    if (event.target.files?.length > 0) {
      event.preventDefault();
      setSelectedWedgeFile(event.target.files);
    }
  };

  const calculatePayload = (res, index, wedgeFilterData, clusterCode) => {
    let item = {
      choice_name: res.choice_name,
      cluster_qty: res[`clusters_${clusterCode}`],
      cluster_store_count: res[`store_count${index + 1}`],
      comments: res.comments,
      style_family: res.style_family,
      total_qty: res.total_qty,
      original_total_qty: res.original_total_qty,
      forecasted_qty: res.forecasted_qty,
      inv_qty: res.total_inventory,
      program: res.program,
      hero_status: res.hero_status,
      sub_brand: res.subbrand,
      market_style_changed_count: res.market_style_changed_count,
      channel_inv_qty: res[`${res[`channel${index + 1}`]}_inventory`],
      channel_forecasted_units:
        res[`${res[`channel${index + 1}`]}_forecasted_qty`],
      channel_door_count: res[`${res[`channel${index + 1}`]}_door_count`],
      moq: res[`${res[`channel${index + 1}`]}_moq`],
      price: res[`${res[`channel${index + 1}`]}_actual_msrp`] || res["price"],
      cost: res[`${res[`channel${index + 1}`]}_cost`] || res["cost"],
      aur: res[`${res[`channel${index + 1}`]}_aur`] || res["aur"],
      lock_choice: res.lock_choice,
      st: res[`${res[`channel${index + 1}`]}_st`]
        ? res[`${res[`channel${index + 1}`]}_st`] / 100
        : res.st / 100,
      aps: res[`${res[`channel${index + 1}`]}_aps`]
        ? res[`${res[`channel${index + 1}`]}_aps`]
        : res.aps,
      avg_wk_cnt_ty: res[`${res[`channel${index + 1}`]}_reg_weeks`]
        ? res[`${res[`channel${index + 1}`]}_reg_weeks`]
        : res.reg_weeks,
      doors: isChannelMultiple(props.planDetails?.data)
        ? res[`${res[`channel${index + 1}`]}_door_group`]
        : res.doors,
      is_qty: res.is_qty,
      is_color_count_changed: res.is_color_count_changed,
      is_product_attribute_changed: res.is_product_attribute_changed,
      is_other_attribute_changed: res.is_other_attribute_changed,
      is_image_mapped: res["is_image_mapped"],
      [`${
        props.screenConfiguration?.common?.flow_key || "flow"
      }_cluster_perc`]: res[
        `${
          props.screenConfiguration?.common?.flow_key || "flow"
        }_cluster_perc_clusters_${clusterCode}`
      ],
      style_no_commercial: res[
        `commercial_style_${res[`channel${index + 1}`]}_style_no`
      ]?.toString(),
      color_code_commercial: res[
        `commercial_style_${res[`channel${index + 1}`]}_color_code`
      ]?.toString(),
      drop_flow_perc: isChannelMultiple(props.planDetails?.data)
        ? res[`${res[`channel${index + 1}`]}_drop_flow_perc`]
        : res.drop_flow_perc,
    };
    let attributeList = wedgeFilterData?.[0]?.l1FilterValue?.[0]?.attribute_list?.filter(
      (data) => {
        return data !== "cluster_store_count";
      }
    );
    let productAttributeList = props.wedgeAttributeData.map((attrJson) => {
      return attrJson.attribute_name;
    });
    return Object.assign(
      ...attributeList.map((k) => {
        return {
          [k]: res[k] === 0 || res[k] ? res[k] : null,
        };
      }),
      ...productAttributeList.map((key) => {
        return {
          [key]: res[`attributes_${key}`],
        };
      }),
      item
    );
  };

  const onChangeL3 = (val) => {
    if (
      val?.length ||
      props.screenConfiguration?.common?.endpoint_project_name !==
        "assort-smart"
    ) {
      setSelectedL3FilterValue(val);
      if (val?.length > 1 && showPackModal) {
        displaySnackMessage(
          "Set cannot be created with multiple subcats",
          "error"
        );
        setShowPackModal(false);
      }
      props.sendWedgeTableData(finalWedgeData, false);
      let selectedL3 = isArray(val)
        ? val.map((obj) => obj.value)
        : [val?.value];
      fetchPlanMetrics(
        props.setWedgeFiltersData,
        true,
        "l3FilterValue",
        selectedL2FilterValue,
        selectedL3
      );
      if (
        props.screenConfiguration?.common?.endpoint_project_name !==
          "assort-smart" &&
        props.screenConfiguration?.common?.show_style_level
      ) {
        setCallUpdateStyleWedge(true);
      }
      setCallUpdateChoiceWedge(true);
      setCallPackData(true);
    } else if (
      props.screenConfiguration?.common?.endpoint_project_name ===
        "assort-smart" &&
      !val.length
    ) {
      displaySnackMessage("Atleast one subcat should be selected", "error");
    }
  };

  const onChangeL2 = (val) => {
    setSelectedL3FilterValue({});
    setSelectedL2FilterValue(val);
    fetchPlanMetrics(props.setWedgeFiltersData, true, "l2FilterValue", val);
    props.sendWedgeTableData(finalWedgeData, false);
    if (
      props.screenConfiguration?.common?.endpoint_project_name !==
        "assort-smart" &&
      props.screenConfiguration?.common?.show_style_level
    ) {
      setCallUpdateStyleWedge(true);
    }
    setCallUpdateChoiceWedge(true);
    setCallPackData(true);
  };

  const onChangeCarryoverFlag = async (val) => {
    try {
      set2_3_Loader(true);
      const reqBody = {
        plan_wedge_data: finalWedgeData,
        is_completed: true,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_market_style_change: false,
        is_value_changed: isChoiceWedgeChanged,
        is_style_color_value_change: props.isStyleColorChanged,
      };
      if (props.screenConfiguration?.common?.show_style_level) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setIsStyleColorChanged(false);
      if (updateResponse?.data.status) {
        displaySnackMessage(
          updateResponse?.data?.data?.message || updateResponse?.data?.message,
          updateResponse?.data?.data?.message_type
        );
        if (props.statusImageMap) {
          callImageWedgeMap();
        }
        setIsChoiceWedgeChanged(false);
        setChoiceCarryoverFlag(val);
      }
    } catch (error) {
      displaySnackMessage("Update wedge failed", "error");
    }
    set2_3_Loader(false);
  };

  const fetchPlanMetrics = async (
    setData,
    isWedgeFilter,
    type,
    selectedL2Value,
    selectedL3Value
  ) => {
    let planData = cloneDeep(props.planDetails.data);
    planData.l1_name = [selectedL1FilterValue?.value || planData.l1_name[0]];
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [planData.plan_code],
          operator: "in",
        },
      ],
    };
    if (isWedgeFilter) {
      payload = getPlanPayload(planData, props.planLevels);
    }

    if (
      type === "l1FilterValue" ||
      type === "l2FilterValue" ||
      type === "l3FilterValue"
    ) {
      payload.filters = payload.filters.filter(
        (attribute) => attribute.attribute_name !== "l2_name"
      );
    }
    props.set2_3_Loader(true);
    // First metrics api call to set value for l2 dropdown
    let planMatericsResponse = await props.getPlanMetricsData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    let planMatericsResponseDynamicL2, planMatericsResponseDynamicL3;
    if (planMatericsResponse?.data?.status) {
      setRenderConstraint(false);
      if (planMatericsResponse?.data?.data[0]?.l1_name === null) {
        props.set2_3_Loader(false);
        setShowWedge(false);
        setShowContarint(true);
        displaySnackMessage(
          "Wedge data not available for selected plan",
          "error"
        );
      }
      setRenderConstraint(true);
      // Get L2_name from first api call, and send that as payload to get l3 values
      if (
        isWedgeFilter &&
        planMatericsResponse?.data?.data[0]?.l2_name?.length
      ) {
        payload.filters.push({
          attribute_name: "l2_name",
          value:
            type === "l2FilterValue" || type === "l3FilterValue"
              ? [selectedL2Value?.value]
              : [planMatericsResponse?.data?.data[0]?.l2_name?.[0]],
          prefix: "levels",
          operator: "in",
        });
        planMatericsResponseDynamicL2 = await props.getPlanMetricsData(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (planMatericsResponseDynamicL2?.data?.data[0]?.l3_name?.length) {
          payload.filters.push({
            attribute_name: "l3_name",
            value:
              type === "l3FilterValue"
                ? selectedL3Value
                : [planMatericsResponseDynamicL2?.data?.data[0]?.l3_name?.[0]],
            prefix: "levels",
            operator: "in",
          });
          planMatericsResponseDynamicL3 = await props.getPlanMetricsData(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name ||
              "assort",
            props.planDetails?.data?.plan_code
          );
        }
      }
      // From object l1FilterValue, get options for l2 dropdown
      // From object l2FilterValue, get options for l3 dropdown
      let data = [
        {
          l1FilterValue: planMatericsResponse?.data?.data,
          l2FilterValue: planMatericsResponseDynamicL2?.data?.data,
          l3FilterValue: planMatericsResponseDynamicL3?.data?.data,
        },
      ];
      if (isWedgeFilter) {
        setData(data);
      } else {
        setData(planMatericsResponse?.data?.data);
      }
    } else {
      props.set2_3_Loader(false);
      displaySnackMessage("Something went wrong", "error");
    }
  };

  const receiveWedgeTableData = (
    afterWedgeTableData,
    uniqueClusterList,
    type
  ) => {
    if (afterWedgeTableData && afterWedgeTableData?.length) {
      let finalWedgeTableData = [];
      Object.keys(afterWedgeTableData).forEach((data) => {
        let res = afterWedgeTableData[data];
        times(uniqueClusterList.length, (index) => {
          if (res[`plan_wedge_opt_id${index + 1}`]) {
            let tempWedgeData = {};
            tempWedgeData = {
              plan_code: props.planDetails?.data?.plan_code,
              plan_wedge_opt_id: res[`plan_wedge_opt_id${index + 1}`],
              image_name_url: res["image_name_url"],
              levels: {
                [props.screenConfiguration?.common?.drop_key || "drop"]: res[
                  `${
                    props.screenConfiguration?.common?.drop_key || "drop"
                  }_name`
                ],
                [props.screenConfiguration?.common?.flow_key || "flow"]: res[
                  `${
                    props.screenConfiguration?.common?.flow_key || "flow"
                  }_name`
                ],
                channel: res[`channel${index + 1}`],
                l0_name: res.l0_name,
                l1_name: res.l1_name,
                l2_name: res.l2_name,
                sub_channel: res[`channel${index + 1}`],
                cluster_code: res[`cluster_code${index + 1}`],
                cluster_display_name: res[`cluster_display_name${index + 1}`],
              },
              attribute_value: calculatePayload(
                res,
                index,
                propsRef?.current.wedgeFiltersData,
                res[`cluster_display_name${index + 1}`]
              ),
            };
            if (
              props.screenConfiguration?.common?.final_level === "l3_name" ||
              !props.screenConfiguration?.common?.final_level
            ) {
              tempWedgeData["levels"]["l3_name"] = res.l3_name;
            }
            if (
              props.screenConfiguration?.common?.show_style_level ||
              props.screenConfiguration?.common?.endpoint_project_name ===
                "assort-smart"
            ) {
              tempWedgeData.levels.wedge_level = type;
            }
            tempWedgeData.attribute_value.channel_qty = isChannelMultiple(
              props?.planDetails?.data
            )
              ? res[`${tempWedgeData.levels.channel}_units`]
              : res["total_qty"];
            // tempWedgeData.attribute_value.st = isChannelMultiple(
            //   props?.planDetails?.data
            // )
            //   ? res[`${tempWedgeData.levels.channel}_st`] / 100
            //   : res["st"] / 100;
            // tempWedgeData.attribute_value.avg_wk_cnt_ty = isChannelMultiple(
            //   props?.planDetails?.data
            // )
            //   ? res[`${tempWedgeData.levels.channel}_avg_wk_cnt_ty`]
            //   : res["avg_wk_cnt_ty"];
            finalWedgeTableData.push(tempWedgeData);
            if (res.subRows) {
              res.subRows.map((tempSubRow) => {
                let tempSubRowWedgeData = {};
                tempSubRowWedgeData = {
                  plan_code: props.planDetails?.data?.plan_code,
                  plan_wedge_opt_id:
                    tempSubRow[`plan_wedge_opt_id${index + 1}`],
                  image_name_url: tempSubRow["image_name_url"],
                  levels: {
                    [props.screenConfiguration?.common?.drop_key ||
                    "drop"]: tempSubRow[
                      `${
                        props.screenConfiguration?.common?.drop_key || "drop"
                      }_name`
                    ],
                    [props.screenConfiguration?.common?.flow_key ||
                    "flow"]: tempSubRow[
                      `${
                        props.screenConfiguration?.common?.flow_key || "flow"
                      }_name`
                    ],
                    channel: tempSubRow[`channel${index + 1}`],
                    l0_name: tempSubRow.l0_name,
                    l1_name: tempSubRow.l1_name,
                    l2_name: tempSubRow.l2_name,
                    l3_name: tempSubRow.l3_name,
                    sub_channel: tempSubRow[`channel${index + 1}`],
                    cluster_code: tempSubRow[`cluster_code${index + 1}`],
                    cluster_display_name:
                      tempSubRow[`cluster_display_name${index + 1}`],
                  },
                  attribute_value: calculatePayload(
                    tempSubRow,
                    index,
                    propsRef?.current.wedgeFiltersData,
                    tempSubRow[`cluster_display_name${index + 1}`]
                  ),
                };
                if (
                  props.screenConfiguration?.common?.final_level ===
                    "l3_name" ||
                  !props.screenConfiguration?.common?.final_level
                ) {
                  tempSubRowWedgeData["levels"]["l3_name"] = tempSubRow.l3_name;
                }
                if (
                  props.screenConfiguration?.common?.show_style_level ||
                  props.screenConfiguration?.common?.endpoint_project_name ===
                    "assort-smart"
                ) {
                  tempSubRowWedgeData.levels.wedge_level = type;
                }
                tempSubRowWedgeData.attribute_value.channel_qty = isChannelMultiple(
                  props?.planDetails?.data
                )
                  ? tempSubRow[`${tempSubRowWedgeData.levels.channel}_units`]
                  : tempSubRow["total_qty"];
                // tempSubRowWedgeData.attribute_value.st = isChannelMultiple(
                //   props?.planDetails?.data
                // )
                //   ? tempSubRow[`${tempSubRowWedgeData.levels.channel}_st`] / 100
                //   : tempSubRow["st"] / 100;
                // tempSubRowWedgeData.attribute_value.avg_wk_cnt_ty = isChannelMultiple(
                //   props?.planDetails?.data
                // )
                //   ? tempSubRow[
                //       `${tempSubRowWedgeData.levels.channel}_avg_wk_cnt_ty`
                //     ]
                //   : tempSubRow["avg_wk_cnt_ty"];
                finalWedgeTableData.push(tempSubRowWedgeData);
                return tempSubRowWedgeData;
              });
            }
          }
        });
        return data;
      });
      if (type === "style_level") {
        setFinalStyleWedgeData(finalWedgeTableData);
      } else {
        setFinalWedgeData(finalWedgeTableData);
        props.sendWedgeTableData(finalWedgeTableData, false);
      }
    }
  };

  const updateSetupDropsDetails = (data) => {
    setUpdatedSetupDropTableData(data);
  };

  const handleChangeNumber = (type, value, wedgeType) => {
    let setNumber =
      wedgeType === "set"
        ? setPackNumber
        : wedgeType === "Choice"
        ? setChoiceNumber
        : setStyleNumber;
    let selectedNumber =
      wedgeType === "set"
        ? packNumber
        : wedgeType === "Choice"
        ? choiceNumber
        : styleNumber;
    switch (type) {
      case "add":
        if (wedgeType === "set") {
          if (wedgeTableData?.length >= selectedNumber + 1) {
            setNumber(selectedNumber + 1);
          } else {
            displaySnackMessage(
              "Added choices row cannot be more than wedge row",
              "error"
            );
          }
        } else {
          setNumber(selectedNumber + 1);
        }
        break;
      case "remove":
        if (selectedNumber > 1) {
          setNumber(selectedNumber - 1);
        }
        break;
      case "input":
        if (wedgeType === "set") {
          if (wedgeTableData?.length >= value) {
            if (value) {
              setNumber(parseInt(value));
            } else {
              setNumber(1);
            }
          } else {
            setNumber(wedgeTableData?.length);
            displaySnackMessage(
              "Added choices row cannot be more than wedge row",
              "error"
            );
          }
        } else {
          if (value) {
            setNumber(parseInt(value));
          } else {
            setNumber(1);
          }
        }
        break;
      default:
        return;
    }
  };

  const handleDeleteChoicePopup = () => {
    setDeleteType("choice_level");
    handleDeleteChoiceTablePopup(holdBudget);
  };

  const handleDeleteStylePopup = () => {
    setDeleteType("style_level");
    handleDeleteStyle(holdBudget);
  };

  const closeDeleteTablePopup = () => {
    setShowDeleteTablePopup(false);
  };

  const closeDropShipTablePopup = () => {
    setShowDropShipTablePopup(false);
  };

  const handleDeleteChoiceTablePopup = async (hold_budget) => {
    try {
      props.set2_3_Loader(true);
      const reqBody = {
        plan_wedge_data: finalWedgeData,
        is_completed: true,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_market_style_change: false,
        is_value_changed: isChoiceWedgeChanged,
        is_style_color_value_change: props.isStyleColorChanged,
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setIsStyleColorChanged(false);
      if (updateResponse?.data.status) {
        displaySnackMessage(
          updateResponse?.data?.data?.message || updateResponse?.data?.message,
          updateResponse?.data?.data?.message_type
        );
        if (props.statusImageMap) {
          callImageWedgeMap();
        }
        setIsChoiceWedgeChanged(false);
        setHoldBudget(hold_budget);
        setDeleteChoiceLoader(true);
        props.setDeleteChoiceData([]);
        try {
          let cols = await getColumnsAg(
            "table_name=preview_delete_choice",
            props.columnHeaderJson,
            true
          )();
          if (cols.length) {
            setDeleteChoiceColumns(cols);
            const reqBody = {
              plan_code: props?.planDetails?.data?.plan_code,
            };
            if (
              props.screenConfiguration?.common?.show_style_level ||
              props.screenConfiguration?.common?.endpoint_project_name ===
                "assort-smart"
            ) {
              reqBody["wedge_level"] = "choice_level";
            }
            const deleteChoiceData = await props.deleteDataFetch(
              reqBody,
              props.screenConfiguration?.common?.endpoint_project_name ||
                "assort",
              props.planDetails?.data?.plan_code
            );
            if (deleteChoiceData?.data?.data?.delete_choice_data.length) {
              setShowDeleteTablePopup(true);
              props.setDeleteChoiceData(
                deleteChoiceData.data.data.delete_choice_data
              );
            } else {
              displaySnackMessage(
                "No choice has been selected for deletion",
                "error"
              );
            }
          }
        } catch (error) {
          displaySnackMessage("Fetching delete choices failed", "error");
        }
        setDeleteChoiceLoader(false);
      }
    } catch (error) {
      displaySnackMessage("Deletion of wedge choice failed", "error");
    }
    props.set2_3_Loader(false);
  };

  const callAddDropShipChoices = async (hold_budget) => {
    setDropShipHoldBudget(hold_budget);
    let cols = await getColumnsAg(
      "table_name=preview_delete_choice",
      props.columnHeaderJson,
      true
    )();
    if (cols.length) {
      setDropShipColumns(cols);
      setShowDropShipTablePopup(true);
    }
  };

  const closeConfirmPrompt = (title) => {
    if (title === "delete-choice") {
      setShowDeleteChoicePopup(false);
    } else if (title === "dropship") {
      setShowConfirmDropShipDialog(false);
    } else if (title === "scale-up-down") {
      setShowConfirmScaleUpDownDialog(false);
    } else if (title === "delete-style") {
      setShowDeleteStylePopup(false);
    }
  };

  const callEOP = async () => {
    props.set2_3_Loader(true);
    const reqBody = {
      plan_wedge_data: finalWedgeData,
      is_scaling: false,
      is_update_plan_step: false,
      plan_sub_step: "wedge_table",
      is_market_style_change: false,
      is_value_changed: isChoiceWedgeChanged,
      is_style_color_value_change: props.isStyleColorChanged,
    };
    if (props.screenConfiguration?.common?.show_style_level) {
      reqBody["wedge_level"] = "choice_level";
    }
    const updateResponse = await props.updateWedgeData(
      reqBody,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    props.setIsStyleColorChanged(false);
    if (updateResponse?.data.status) {
      displaySnackMessage(
        replaceSpecialCharacter(updateResponse?.data?.data?.message) ||
          replaceSpecialCharacter(updateResponse?.data?.message),
        updateResponse?.data?.data?.message_type
      );
      setIsChoiceWedgeChanged(false);
      if (props.statusImageMap) {
        callImageWedgeMap();
      }
      let planData = cloneDeep(props.planDetails?.data);
      let payload = getPlanPayload(planData, props.planLevels);
      payload.filters.push({
        attribute_name: "channel",
        prefix: "levels",
        operator: "in",
        value: Array.isArray(planData.channel)
          ? planData.channel
          : [planData.channel],
      });
      payload.filters.push({
        attribute_name: "sub_channel",
        prefix: "levels",
        operator: "in",
        value: Array.isArray(planData.channel)
          ? planData.channel
          : [planData.channel],
      });
      if (props.currentBopPlan || planData.bop_tag_plan_code) {
        payload.filters.push({
          attribute_name: "bop_plan_code",
          operator: "in",
          value: [props.currentBopPlan || planData.bop_tag_plan_code],
        });
      }
      try {
        let EOPResponse = await props.updateEOP(
          payload,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (EOPResponse?.data?.status) {
          displaySnackMessage(
            replaceSpecialCharacter(EOPResponse?.data?.data?.message),
            "success"
          );
          setCallWedge(true);
        } else {
          props.set2_3_Loader(false);
          displaySnackMessage("EOP matching failed", "error");
        }
      } catch (e) {
        props.set2_3_Loader(false);
        displaySnackMessage("EOP matching failed", "error");
      }
    }
    props.set2_3_Loader(false);
  };

  const updateMapIntegration = () => {
    props.setIsStyleColorChanged(false);
    setCallUpdateChoiceWedge(true);
    setCallIntegrateMapData(true);
  };

  const scaleUpDown = async (value) => {
    try {
      props.set2_3_Loader(true);
      setIsScaleUpDownDisabled(true);
      const reqBody = {
        plan_wedge_data: finalWedgeData,
        is_completed: false,
        is_scaling: value,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_market_style_change: false,
        is_value_changed: isChoiceWedgeChanged,
        is_style_color_value_change: props.isStyleColorChanged,
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        reqBody["wedge_level"] = "choice_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setIsStyleColorChanged(false);
      if (updateResponse?.data.status) {
        displaySnackMessage(
          updateResponse?.data?.data?.message || updateResponse?.data?.message,
          updateResponse?.data?.data?.message_type
        );
        setIsChoiceWedgeChanged(false);
        if (props.statusImageMap) {
          callImageWedgeMap();
        }
        if (updateResponse?.data?.message === "3") {
          displaySnackMessage("No Scaling: update successful", "success");
        }
        setCallWedge(true);
      }
    } catch (error) {
      props.set2_3_Loader(false);
      displaySnackMessage("Something went wrong", "error");
    }
  };

  const handleDeleteStyle = async (hold_budget) => {
    try {
      props.set2_3_Loader(true);
      const reqBody = {
        plan_wedge_data: finalStyleWedgeData,
        is_completed: true,
        is_scaling: false,
        is_update_plan_step: false,
        plan_sub_step: "wedge_table",
        is_market_style_change: false,
        is_value_changed: isStyleWedgeChanged,
        is_style_color_value_change: props.isStyleColorChanged,
      };
      if (props.screenConfiguration?.common?.show_style_level) {
        reqBody["wedge_level"] = "style_level";
      }
      const updateResponse = await props.updateWedgeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setIsStyleColorChanged(false);
      if (updateResponse?.data.status) {
        displaySnackMessage(
          updateResponse?.data?.data?.message || updateResponse?.data?.message,
          updateResponse?.data?.data?.message_type
        );
        if (props.statusImageMap) {
          callImageWedgeMap();
        }
        setIsChoiceWedgeChanged(false);
        setIsStyleWedgeChanged(false);
        setHoldBudget(hold_budget);
        setDeleteChoiceLoader(true);
        props.setDeleteStyleData([]);
        try {
          let cols = await getColumnsAg(
            "table_name=preview_delete_style",
            props.columnHeaderJson,
            true
          )();
          if (cols.length) {
            setDeleteStyleColumns(cols);
            const reqBody = {
              plan_code: props?.planDetails?.data?.plan_code,
            };
            if (props.screenConfiguration?.common?.show_style_level) {
              reqBody["wedge_level"] = "style_level";
            }
            const deleteStyleData = await props.deleteDataFetch(
              reqBody,
              props.screenConfiguration?.common?.endpoint_project_name ||
                "assort",
              props.planDetails?.data?.plan_code
            );
            if (deleteStyleData?.data?.data?.delete_choice_data.length) {
              setShowDeleteTablePopup(true);
              props.setDeleteStyleData(
                deleteStyleData.data.data.delete_choice_data
              );
            } else {
              displaySnackMessage(
                "No style has been selected for deletion",
                "error"
              );
            }
          }
        } catch (error) {
          displaySnackMessage("Fetching delete style failed", "error");
        }
        setDeleteChoiceLoader(false);
      }
    } catch (error) {
      displaySnackMessage("Deletion of wedge style failed", "error");
    }
    props.set2_3_Loader(false);
  };

  const updateStyleTableData = async () => {
    props.set2_3_Loader(true);
    const reqBody = {
      plan_wedge_data: finalWedgeData,
      is_scaling: false,
      is_update_plan_step: false,
      plan_sub_step: "wedge_table",
      is_value_changed: isChoiceWedgeChanged,
      is_market_style_change: false,
      is_style_color_value_change: props.isStyleColorChanged,
    };
    if (props.screenConfiguration?.common?.show_style_level) {
      reqBody["wedge_level"] = "choice_level";
    }
    const updateResponse = await props.updateWedgeData(
      reqBody,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    props.setIsStyleColorChanged(false);
    if (updateResponse?.data.status) {
      displaySnackMessage(
        updateResponse?.data?.data?.message || updateResponse?.data?.message,
        updateResponse?.data?.data?.message_type
      );
      let updateStyleResponse = await props.updateStyleWedgeData(
        {
          plan_code: props.planDetails?.data?.plan_code,
        },
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (updateStyleResponse?.data?.status) {
        displaySnackMessage(
          updateStyleResponse?.data?.data?.message,
          "success"
        );
        if (props.statusImageMap) {
          callImageWedgeMap();
        }
        setIsChoiceWedgeChanged(false);
        setCallWedge(true);
        setUpdateStyleWedge(true);
        setEnableUpdateStyleBtn(false);
      } else {
        displaySnackMessage("Something went wrong", "error");
      }
    }
    props.set2_3_Loader(false);
  };

  const handleDeleteChoice = async (hold_budget) => {
    try {
      props.set2_3_Loader(true);
      const reqBody = {
        plan_code: props.planDetails?.data?.plan_code,
        hold_budget: hold_budget,
      };
      if (
        props.screenConfiguration?.common?.show_style_level ||
        props.screenConfiguration?.common?.endpoint_project_name ===
          "assort-smart"
      ) {
        reqBody["wedge_level"] = deleteType;
      }
      const deleteChoice = await props.deleteWedgeChoice(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (deleteChoice?.data?.status) {
        displaySnackMessage(deleteChoice.data.data.message, "success");
        if (props.screenConfiguration?.common?.show_style_level) {
          let updateStyleResponse = await props.updateStyleWedgeData(
            {
              plan_code: props.planDetails?.data?.plan_code,
            },
            props.screenConfiguration?.common?.endpoint_project_name ||
              "assort",
            props.planDetails?.data?.plan_code
          );
          if (updateStyleResponse?.data?.status) {
            callWedgeAttributeData();
          }
        } else {
          callWedgeAttributeData();
        }
      }
    } catch (error) {
      displaySnackMessage(
        `Deletion of wedge ${
          props.deleteType === "style_level" ? "style id" : "choices"
        } failed`,
        "error"
      );
    }
    props.set2_3_Loader(false);
    closeConfirmPrompt("delete-style");
  };

  const callWedgeAttributeData = async () => {
    const planData = props.planDetails?.data;
    const payload = getPlanPayload(planData, props.planLevels);
    payload.filters.push({
      attribute_name: "l2_name",
      value: [selectedL2FilterValue?.value],
      prefix: "levels",
      operator: "in",
    });
    let finalLevelKey =
      props.screenConfiguration?.common?.final_level === "l2_name"
        ? "l2_name"
        : "l3_name";
    if (finalLevelKey === "l3_name") {
      if (!selectedL3FilterValue?.value && selectedL3FilterValue?.length > 0) {
        let level3Arr = [];
        selectedL3FilterValue.forEach((level3) => {
          level3Arr.push(level3?.value);
        });
        payload.filters.push({
          attribute_name: "l3_name",
          value: level3Arr,
          prefix: "levels",
          operator: "in",
        });
      } else {
        payload.filters.push({
          attribute_name: "l3_name",
          value: [selectedL3FilterValue["value"]],
          prefix: "levels",
          operator: "in",
        });
      }
    }
    let attributeResponse = await props.getWedgeAttributesData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort",
      props.planDetails?.data?.plan_code
    );
    if (attributeResponse?.data?.status) {
      props.setWedgeAttributeData(
        attributeResponse?.data?.data?.mapped_product_attributes
      );
      setUnMappedWedgeAttributes(
        attributeResponse?.data?.data?.unmapped_product_attributes
      );
    }
  };

  const deleteSet = async (set) => {
    let planData = props.planDetails?.data;
    let payload = {
      data: [
        {
          filters: [
            {
              attribute_name: "plan_code",
              operator: "in",
              value: [planData.plan_code],
            },
            {
              attribute_name: "l0_name",
              operator: "in",
              prefix: "levels",
              value: planData.l0_name,
            },
            {
              attribute_name: "l1_name",
              operator: "in",
              prefix: "levels",
              value: selectedL1FilterValue?.value
                ? [selectedL1FilterValue?.value]
                : planData.l1_name,
            },
            {
              attribute_name: "l2_name",
              operator: "in",
              prefix: "levels",
              value: selectedL2FilterValue?.value
                ? [selectedL2FilterValue?.value]
                : planData.l2_name,
            },
            {
              attribute_name: "l3_name",
              operator: "in",
              prefix: "levels",
              value: isArray(selectedL3FilterValue)
                ? [selectedL3FilterValue?.[0]?.value]
                : [selectedL3FilterValue?.value],
            },
            {
              attribute_name: "set_name",
              operator: "in",
              prefix: "attribute_value",
              value: [set.value],
            },
            {
              attribute_name: "wedge_level",
              operator: "in",
              prefix: "levels",
              value: ["choice_level"],
            },
          ],
        },
      ],
    };
    setShowLoader(true);
    try {
      let response = await props.deleteChoiceSet(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      if (response?.data?.status) {
        setShowAddSetField(false);
        setPackName("");
        toggleViewAddChoiceModal(false, "set");
        setCallPackData(true);
        setCallWedge(true);
        displaySnackMessage("Set has been successfully deleted", "success");
      }
      setShowLoader(false);
    } catch (err) {
      setShowLoader(false);
    }
  };

  const downloadWedgeRollUp = async (type) => {
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [props.planDetails?.data?.plan_code],
          operator: "in",
        },
      ],
      plan_name: props.planDetails?.data?.name,
    };
    payload["action"] = type?.value || 1;
    let response = await props.downloadWedgeData(
      payload,
      "assort-smart",
      props.planDetails?.data?.plan_code
    );
    if (response?.data?.data?.url?.length) {
      let a = document.createElement("a");
      a.href = response?.data?.data?.url;
      a.download = "Cluster Rollup.xlsx";
      a.click();
      displaySnackMessage("Wedge downloaded successfully", "success");
    } else {
      displaySnackMessage("Error in downloading rollups", "error");
    }
  };

  const showCreateSetOption = (
    <div
      className={classes.createSetOptDiv}
      onClick={() => setShowAddSetField(true)}
      onFocus={() => {}}
    >
      <IconButton className={classes.addIcon} size="small">
        <Add />
      </IconButton>
      <span className={classes.createSetOptText}>{"Create new set"}</span>
    </div>
  );

  const redirectToTrending = () => {
    let query = "?";
    Object.keys(wedgeSelectedRow[0]).forEach((key) => {
      if (wedgeSelectedRow[0]?.[key]) {
        query =
          query +
          (query === "?" ? "" : "&") +
          key +
          "=" +
          replaceSpecialCharacter(wedgeSelectedRow[0][key]);
      }
    });
    const newWindow = window.open(
      "https://socialtrends.impactsmartsuite.com/" + query,
      "_blank",
      "noopener,noreferrer"
    );
    if (newWindow) newWindow.opener = null;
  };

  return (
    <>
      <LoadingOverlay
        loader={props.isConstraintLoading}
        centerLoaderStyles={centerLoaderStyles.current}
        spinner
      >
        {renderConstarint && (
          <Accordion
            label="Optimization Constraint"
            defaultExpanded={showConstraint}
            customClass={globalClasses.accordianWrapper}
          >
            <div>
              {(planSubstep.current === "optimization_constraint_table" ||
                planSubstep.current === "wedge_table") && (
                <OptimizationConstraintTableComponent
                  callOptimizeWedge={callOptimizeWedge}
                  generateWedge={generateWedge}
                  setShowWedge={setShowWedge}
                  updateSetupDropsDetails={updateSetupDropsDetails}
                  callUpdateSetupDrop={callUpdateSetupDrop}
                  setShowAddChoiceModal={setShowAddChoiceModal}
                  fetchPlanSetupDrops={fetchPlanSetupDrops}
                  setInitialLoadFinalize={props.setInitialLoadFinalize}
                  setFromDashboardScreen_2_4={props.setFromDashboardScreen_2_4}
                  setupDropsLoader={setupDropsLoader}
                  setSetupDropsLoader={setSetupDropsLoader}
                  setEnableStep={props.setEnableStep}
                />
              )}
            </div>
          </Accordion>
        )}
        <LoadingOverlay loader={props.isWedgeLoading} spinner>
          <div
            className={props.isWedgeLoading ? globalClasses.minHeightBody : 0}
          >
            {props.screenConfiguration?.common?.show_style_level &&
              showWedge &&
              planSubstep.current === "wedge_table" && (
                <Card className={globalClasses.paper} id="style-wedge-table">
                  <Grid container direction="row">
                    <Typography className="wedgeHeading" variant="h3">
                      Style Level Wedge
                    </Typography>
                  </Grid>
                  <Grid>
                    <div className={classes.heading}>
                      {filterView(
                        props.levelsJson["l1_name"],
                        "l1_name",
                        l1Options,
                        setSelectedL1FilterValue,
                        selectedL1FilterValue,
                        classes.assortSingleFilterView,
                        classes.inputLabel
                      )}
                      {filterView(
                        props.levelsJson["l2_name"],
                        "l2_name",
                        l2Options,
                        onChangeL2,
                        selectedL2FilterValue,
                        classes.assortSingleFilterView,
                        classes.inputLabel
                      )}
                      {filterView(
                        props.levelsJson["l3_name"],
                        "l3_name",
                        l3Options,
                        onChangeL3,
                        selectedL3FilterValue,
                        classes.assortMultiFilterView,
                        classes.inputLabel,
                        props.screenConfiguration?.common
                          ?.endpoint_project_name === "assort-smart"
                          ? true
                          : false
                      )}
                      {flowOptions?.length
                        ? filterView(
                            props.screenConfiguration?.common?.flow_key ||
                              "Flow",
                            props.screenConfiguration?.common?.flow_key ||
                              "flow",
                            flowOptions,
                            setSelectedFlow,
                            selectedFlow,
                            classes.assortMultiFilterView,
                            classes.inputLabel
                          )
                        : null}
                      {!history?.location.pathname.includes("view") && (
                        <div
                          className={`${classes.rightEnd} ${classes.paperStyle}`}
                        >
                          {!(
                            !wedgeStyleTableData?.length ||
                            showAddStyleModal ||
                            selectedStyleId?.length !== 1
                          ) && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"Map Style"}
                              id={"map-style"}
                              onClick={() => setShowMapStyleModal(true)}
                              disabled={
                                !wedgeStyleTableData?.length ||
                                showAddStyleModal ||
                                selectedStyleId?.length !== 1
                              }
                              className={classes.buttonFitMargin}
                            >
                              Map Style
                            </Button>
                          )}
                          {wedgeStyleTableData?.length && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"Add Style"}
                              id={"add-style"}
                              disabled={!wedgeStyleTableData?.length}
                              onClick={() => setShowAddStyleModal(true)}
                              className={classes.buttonFitMargin}
                            >
                              Add Style
                            </Button>
                          )}
                          {!(
                            !wedgeStyleTableData?.length || showAddStyleModal
                          ) && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"Delete style"}
                              className={classes.buttonFitMargin}
                              disabled={
                                !wedgeStyleTableData?.length ||
                                showAddStyleModal
                              }
                              onClick={handleDeleteStylePopup}
                            >
                              <Delete />
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            color="primary"
                            id="save--style-wedge-data"
                            className={classes.buttonFitMargin}
                            onClick={() => setCallUpdateStyleWedge(true)}
                          >
                            <Save />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Grid>
                  {showAddStyleModal && (
                    <IncrementDecrementFun
                      classes={classes}
                      handleChangeNumber={handleChangeNumber}
                      number={styleNumber}
                      type={"Style"}
                    />
                  )}
                  {showAddStyleModal && (
                    <AddStyleComponent
                      styleLevelColumn={styleLevelColumn}
                      wedgeAttributeData={props.wedgeAttributeData}
                      styleNumber={styleNumber}
                      generateOptions={generateOptions}
                      l3Options={l3Options}
                      dropOptions={dropOptions}
                      toggleViewAddChoiceModal={toggleViewAddChoiceModal}
                      setCallUpdateStyleWedge={setCallUpdateStyleWedge}
                      wedgeStyleTableData={wedgeStyleTableData}
                    />
                  )}
                  {showMapStyleModal && (
                    <MapStyleComponent
                      showMapStyleModal={showMapStyleModal}
                      setShowMapStyleModal={setShowMapStyleModal}
                      selectedLevel3Value={selectedL3FilterValue}
                      l3Options={l3Options}
                      setCallWedge={setCallWedge}
                      setCallUpdateStyleWedge={setCallUpdateStyleWedge}
                      selectedStyleId={selectedStyleId}
                      setUpdateStyleWedge={setUpdateStyleWedge}
                    />
                  )}
                  <div className={showAddStyleModal ? "hide_wedge" : ""}>
                    <StyleLevelWedgeComponent
                      generateOptions={generateOptions}
                      selectedL1FilterValue={selectedL1FilterValue}
                      selectedL2FilterValue={selectedL2FilterValue}
                      selectedL3FilterValue={selectedL3FilterValue}
                      setSelectedFlow={setSelectedFlow}
                      flowOptions={flowOptions}
                      selectedFlow={selectedFlow}
                      receiveWedgeTableData={receiveWedgeTableData}
                      finalStyleWedgeData={finalStyleWedgeData}
                      setUniqueClusterListWedge={setUniqueClusterListWedge}
                      uniqueClusterList={uniqueClusterListWedge}
                      setStyleLevelColumn={setStyleLevelColumn}
                      styleLevelColumn={styleLevelColumn}
                      fetchPlanMetrics={fetchPlanMetrics}
                      callUpdateStyleWedge={callUpdateStyleWedge}
                      setCallWedge={setCallWedge}
                      setDisableNext={props.setDisableNext}
                      groupedDrops={groupedDrops}
                      selectedDropData={selectedDropData}
                      setSelectedDropData={setSelectedDropData}
                      setWedgeStyleTableData={setWedgeStyleTableData}
                      setWedgeValidationMsg={props.setWedgeValidationMsg}
                      callValidateWedgeData={props.callValidateWedgeData}
                      setSelectedStyleId={setSelectedStyleId}
                      callWedge={callWedge}
                      updateStyleWedge={updateStyleWedge}
                      setCallUpdateStyleWedge={setCallUpdateStyleWedge}
                      callImageWedgeMap={callImageWedgeMap}
                      isStyleWedgeChanged={isStyleWedgeChanged}
                      setIsStyleWedgeChanged={setIsStyleWedgeChanged}
                    />
                  </div>
                </Card>
              )}
            {showWedge && planSubstep.current === "wedge_table" && (
              <Card
                className={`${globalClasses.paper} ${globalClasses.minHeightBody}`}
                id="choice-wedge-table"
              >
                <Grid container direction="row">
                  <Typography className="wedgeHeading" variant="h3">
                    {Plan.__Wedge_Text}
                  </Typography>
                </Grid>
                <Grid>
                  <div className={classes.heading}>
                    {filterView(
                      props.levelsJson["l1_name"],
                      "l1_name",
                      l1Options,
                      setSelectedL1FilterValue,
                      selectedL1FilterValue,
                      classes.assortSingleFilterView,
                      classes.inputLabel
                    )}
                    {filterView(
                      props.levelsJson["l2_name"],
                      "l2_name",
                      l2Options,
                      onChangeL2,
                      selectedL2FilterValue,
                      classes.assortSingleFilterView,
                      classes.inputLabel
                    )}
                    {(props.screenConfiguration?.common?.final_level ===
                      "l3_name" ||
                      !props.screenConfiguration?.common?.final_level) &&
                      filterView(
                        props.levelsJson["l3_name"],
                        "l3_name",
                        l3Options,
                        onChangeL3,
                        selectedL3FilterValue,
                        classes.assortMultiFilterView,
                        classes.inputLabel,
                        props.screenConfiguration?.common
                          ?.endpoint_project_name === "assort-smart"
                          ? true
                          : false,
                        props.screenConfiguration?.common
                          ?.endpoint_project_name === "assort-smart"
                          ? true
                          : false
                      )}
                    {props.screenConfiguration?.common?.show_style_level &&
                      filterView(
                        "Choice Carryover",
                        "choice_carryover_flag",
                        choiceCarryoverOption,
                        onChangeCarryoverFlag,
                        selectedChoiceCarryoverFlag,
                        classes.assortMultiFilterView,
                        classes.inputLabel
                      )}
                    {!history?.location.pathname.includes("view") ? (
                      <div
                        className={`${classes.rightEnd} ${classes.paperStyle}`}
                      >
                        {!(
                          !props.wedgeData?.length ||
                          showAddChoiceModal ||
                          showPacDownloadModal ||
                          showPackModal ||
                          showStyleMapping
                        ) && (
                          <>
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"PAC"}
                              id={"pac"}
                              onClick={() => redirectToTrending()}
                              disabled={!(wedgeSelectedRow?.length === 1)}
                              className={classes.buttonFitMargin}
                            >
                              Trending Videos
                            </Button>

                            {props.screenConfiguration?.common
                              ?.endpoint_project_name !== "assort-smart" && (
                              <Button
                                variant="outlined"
                                color="primary"
                                title={"Map Integration Data"}
                                id={"map-integration-data"}
                                onClick={updateMapIntegration}
                                className={classes.buttonFitMargin}
                              >
                                <IntegrationInstructionsIcon />
                              </Button>
                            )}
                          </>
                        )}
                        {props.screenConfiguration?.["2.3"]
                          ?.show_sister_style_mapping &&
                          !(
                            !props.wedgeData?.length ||
                            showAddChoiceModal ||
                            showPackModal ||
                            !selectedChoices?.length
                          ) && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"style-mapping"}
                              id={"style-mapping"}
                              onClick={() => setShowStyleMapping(true)}
                              disabled={
                                !props.wedgeData?.length ||
                                showAddChoiceModal ||
                                showPackModal ||
                                !selectedChoices?.length
                              }
                              className={classes.buttonFitMargin}
                            >
                              Style Mapping
                            </Button>
                          )}
                        {props.screenConfiguration?.["2.3"]?.enable_set &&
                          !(
                            !props.wedgeData?.length ||
                            showAddChoiceModal ||
                            showPackModal ||
                            showStyleMapping ||
                            (isArray(selectedL3FilterValue) &&
                              selectedL3FilterValue?.length > 1)
                          ) && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"create-modify-set"}
                              id={"create-modify-set"}
                              onClick={() => {
                                setCallPackData(true);
                                setShowPackModal(true);
                              }}
                              disabled={
                                !props.wedgeData?.length ||
                                showAddChoiceModal ||
                                showPackModal ||
                                showStyleMapping ||
                                (isArray(selectedL3FilterValue) &&
                                  selectedL3FilterValue?.length > 1)
                              }
                              className={classes.buttonFitMargin}
                            >
                              Create/ Modify Set
                            </Button>
                          )}
                        {props.screenConfiguration?.["2.3"]
                          ?.enable_pac_download &&
                          !(
                            !props.wedgeData?.length ||
                            showAddChoiceModal ||
                            showPackModal ||
                            showStyleMapping
                          ) && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"PAC"}
                              id={"pac"}
                              onClick={() => setShowPacDownloadModal(true)}
                              disabled={
                                !props.wedgeData?.length ||
                                showAddChoiceModal ||
                                showPackModal ||
                                showStyleMapping
                              }
                              className={classes.buttonFitMargin}
                            >
                              PAC Download
                            </Button>
                          )}
                        {props.screenConfiguration?.common?.show_style_level &&
                          !(
                            !props.wedgeData?.length ||
                            showAddChoiceModal ||
                            showPackModal ||
                            !enableUpdateStyleBtn ||
                            showPacDownloadModal ||
                            showStyleMapping
                          ) && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"Update Style"}
                              id={"update-style"}
                              onClick={() => {
                                updateStyleTableData(true);
                              }}
                              disabled={
                                !props.wedgeData?.length ||
                                showAddChoiceModal ||
                                showPackModal ||
                                !enableUpdateStyleBtn ||
                                showPacDownloadModal ||
                                showStyleMapping
                              }
                              className={classes.buttonFitMargin}
                            >
                              Update Style
                            </Button>
                          )}
                        {!(
                          !props.wedgeData?.length ||
                          showAddChoiceModal ||
                          showPacDownloadModal ||
                          showPackModal ||
                          showStyleMapping
                        ) && (
                          <Button
                            variant="outlined"
                            color="primary"
                            title={"EOP"}
                            id={"EOP"}
                            onClick={callEOP}
                            disabled={
                              !props.wedgeData?.length ||
                              showAddChoiceModal ||
                              showPacDownloadModal ||
                              showPackModal ||
                              showStyleMapping
                            }
                            className={classes.buttonFitMargin}
                          >
                            EOP
                          </Button>
                        )}
                        {!props.screenConfiguration?.common?.show_style_level &&
                          !(
                            !props.wedgeData?.length ||
                            showPacDownloadModal ||
                            showPackModal ||
                            showStyleMapping
                          ) && (
                            <>
                              <Button
                                variant="outlined"
                                color="primary"
                                title={"Add Choice"}
                                id={"add-choice"}
                                onClick={() => {
                                  setShowAddChoiceModal(true);
                                }}
                                disabled={
                                  !props.wedgeData?.length ||
                                  showPacDownloadModal ||
                                  showPackModal ||
                                  showStyleMapping
                                }
                                className={classes.buttonFitMargin}
                              >
                                Add Choice
                              </Button>
                              {showGenerateWedgeOption &&
                                !(
                                  !props.wedgeData?.length ||
                                  showAddChoiceModal ||
                                  showPacDownloadModal ||
                                  showPackModal ||
                                  showStyleMapping
                                ) && (
                                  <Button
                                    variant="outlined"
                                    color="primary"
                                    title={"Generate Omnichannel Wedge"}
                                    id={"generate-Omnichannel-Wedge"}
                                    onClick={openCreatePlanModal}
                                    disabled={
                                      !props.wedgeData?.length ||
                                      showAddChoiceModal ||
                                      showPacDownloadModal ||
                                      showPackModal ||
                                      showStyleMapping
                                    }
                                    className={classes.buttonFitMargin}
                                  >
                                    Generate Omnichannel Wedge
                                  </Button>
                                )}
                            </>
                          )}
                        {!(
                          !props.wedgeData?.length ||
                          showAddChoiceModal ||
                          showPacDownloadModal ||
                          showPackModal ||
                          showStyleMapping
                        ) && (
                          <Button
                            variant="outlined"
                            color="primary"
                            title={"Depth multiplier"}
                            id={"depth-multiplier"}
                            onClick={() => {
                              toggleViewDepthMultiplier(true);
                            }}
                            disabled={
                              !props.wedgeData?.length ||
                              showAddChoiceModal ||
                              showPacDownloadModal ||
                              showPackModal ||
                              showStyleMapping
                            }
                            className={classes.buttonFitMargin}
                          >
                            Depth Multiplier
                          </Button>
                        )}
                        {!(
                          !props.wedgeData?.length ||
                          showAddChoiceModal ||
                          showPacDownloadModal ||
                          showPackModal ||
                          showStyleMapping
                        ) &&
                          props.screenConfiguration?.common
                            ?.endpoint_project_name === "assort-smart" && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"Download wedge data"}
                              id={"download-wedge-data"}
                              disabled={
                                !props.wedgeData?.length ||
                                showAddChoiceModal ||
                                showPacDownloadModal ||
                                showPackModal ||
                                showStyleMapping
                              }
                              onClick={() => {
                                downloadWedgeRollUp();
                                // if (!downloadAtL3) {
                                //   downloadWedge.current.link.click();
                                // } else {
                                //   setIsDownload(true);
                                // }
                              }}
                              className={classes.buttonFitMargin}
                            >
                              {<DownloadIcon />}
                            </Button>
                          )}
                        {downloadExcelLink(
                          wedgeDataForDownload,
                          `PO_WEDGE_Sheet_${props.planDetails?.data?.["name"]}`,
                          downloadWedge,
                          wedgeHeaderList,
                          "",
                          ""
                        )}
                        {!(
                          !props.wedgeData?.length ||
                          showAddChoiceModal ||
                          showPacDownloadModal ||
                          showPackModal ||
                          showStyleMapping
                        ) && (
                          <Button
                            variant="outlined"
                            color="primary"
                            title={
                              props.screenConfiguration?.common
                                ?.endpoint_project_name !== "assort-smart"
                                ? "Upload/Download wedge data"
                                : "Upload wedge data"
                            }
                            id={"upload-wedge-data"}
                            onClick={() => {
                              if (
                                props.screenConfiguration?.common
                                  ?.endpoint_project_name !== "assort-smart"
                              ) {
                                setShowUploadPopup(true);
                              } else {
                                uploadWedge.current.click();
                              }
                            }}
                            disabled={
                              !props.wedgeData?.length ||
                              showAddChoiceModal ||
                              showPacDownloadModal ||
                              showPackModal ||
                              showStyleMapping
                            }
                            className={classes.buttonFitMargin}
                          >
                            <UploadIcon />
                            {props.screenConfiguration?.common
                              ?.endpoint_project_name !== "assort-smart" && (
                              <DownloadIcon />
                            )}
                            {props.screenConfiguration?.common
                              ?.endpoint_project_name === "assort-smart" && (
                              <input
                                ref={uploadWedge}
                                id="uploadWedge"
                                type="file"
                                accept=".xls,.xlsx , .csv"
                                onChange={(e) => onWedgeFileUploaded(e)}
                                onClick={(e) => {
                                  e.target.value = null;
                                }}
                              />
                            )}
                          </Button>
                        )}
                        {!(
                          !props.wedgeData?.length ||
                          showAddChoiceModal ||
                          showPacDownloadModal ||
                          showPackModal ||
                          showStyleMapping
                        ) && (
                          <Button
                            variant="outlined"
                            color="primary"
                            title={"Delete choice"}
                            className={classes.buttonFitMargin}
                            disabled={
                              !props.wedgeData?.length ||
                              showAddChoiceModal ||
                              showPacDownloadModal ||
                              showPackModal ||
                              showStyleMapping
                            }
                            onClick={handleDeleteChoicePopup}
                          >
                            <Delete />
                          </Button>
                        )}
                        {showDropshipIcon &&
                          !(
                            !props.wedgeData?.length ||
                            showAddChoiceModal ||
                            showPacDownloadModal ||
                            showPackModal ||
                            showStyleMapping
                          ) && (
                            <Button
                              variant="outlined"
                              color="primary"
                              title={"Save Drop Ship choice"}
                              className={classes.buttonFitMargin}
                              disabled={
                                !props.wedgeData?.length ||
                                showAddChoiceModal ||
                                showPacDownloadModal ||
                                showPackModal ||
                                showStyleMapping
                              }
                              onClick={() => setShowConfirmDropShipDialog(true)}
                            >
                              <LocalShipping />
                            </Button>
                          )}
                        {!(
                          !props.wedgeData?.length ||
                          isScaleUpDownDisabled ||
                          showAddChoiceModal ||
                          showPacDownloadModal ||
                          showPackModal ||
                          showStyleMapping
                        ) && (
                          <Button
                            variant="outlined"
                            color="primary"
                            className={classes.buttonFitMargin}
                            onClick={() =>
                              setShowConfirmScaleUpDownDialog(true)
                            }
                            disabled={
                              !props.wedgeData?.length ||
                              isScaleUpDownDisabled ||
                              showAddChoiceModal ||
                              showPacDownloadModal ||
                              showPackModal ||
                              showStyleMapping
                            }
                            title={Plan.__Scale_Up_Down}
                            id="budget-scale-up-down"
                          >
                            <CompareArrowsOutlinedIcon />
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          color="primary"
                          id="save-wedge-data"
                          className={classes.buttonFitMargin}
                          onClick={() => setCallUpdateChoiceWedge(true)}
                        >
                          <Save />
                        </Button>
                      </div>
                    ) : (
                      !(
                        !props.wedgeData?.length ||
                        showAddChoiceModal ||
                        showPacDownloadModal ||
                        showPackModal ||
                        showStyleMapping
                      ) && (
                        <div
                          className={`${classes.rightEnd} ${classes.paperStyle}`}
                        >
                          <Button
                            variant="outlined"
                            color="primary"
                            title={"Download wedge data"}
                            id={"download-wedge-data"}
                            disabled={
                              !props.wedgeData?.length ||
                              showAddChoiceModal ||
                              showPacDownloadModal ||
                              showPackModal ||
                              showStyleMapping
                            }
                            onClick={() => {
                              if (!downloadAtL3) {
                                downloadWedge.current.link.click();
                              } else {
                                setIsDownload(true);
                              }
                            }}
                            className={classes.buttonFitMargin}
                          >
                            {<DownloadIcon />}
                          </Button>
                        </div>
                      )
                    )}
                    {downloadExcelLink(
                      wedgeDataForDownload,
                      `PO_WEDGE_Sheet_${props.planDetails?.data?.["name"]}`,
                      downloadWedge,
                      wedgeHeaderList,
                      "",
                      ""
                    )}
                  </div>
                </Grid>
                {showAddChoiceModal && (
                  <IncrementDecrementFun
                    classes={classes}
                    handleChangeNumber={handleChangeNumber}
                    number={choiceNumber}
                    type={"Choice"}
                  />
                )}
                {showAddChoiceModal && (
                  <AddChoiceComponent
                    showAddChoiceModal={showAddChoiceModal}
                    toggleViewAddChoiceModal={toggleViewAddChoiceModal}
                    choiceNumber={choiceNumber}
                    generateOptions={generateOptions}
                    selectedL3FilterValue={selectedL3FilterValue}
                    selectedL2FilterValue={selectedL2FilterValue}
                    wedgeColumn={wedgeColumn}
                    wedgeAttributeData={props.wedgeAttributeData}
                    l3Options={l3Options}
                    l2Options={l2Options}
                    dropOptions={dropOptions}
                    wedgeTableData={wedgeTableData}
                    setCallWedge={setCallWedge}
                  />
                )}
                {showPacDownloadModal && (
                  <PacDownloadComponent
                    setShowPacDownloadModal={setShowPacDownloadModal}
                    setCallWedge={setCallWedge}
                  />
                )}
                {showPackModal && (
                  <IncrementDecrementFun
                    classes={classes}
                    handleChangeNumber={handleChangeNumber}
                    number={packNumber}
                    type={"set"}
                    packOptions={packOptions}
                    setSelectedPackValue={setSelectedPackValue}
                    selectedPackValue={selectedPackValue}
                    showCreateSetOption={showCreateSetOption}
                    showAddSetField={showAddSetField}
                    setShowAddSetField={setShowAddSetField}
                    setPackName={setPackName}
                    deleteSet={deleteSet}
                  />
                )}
                <AddPackComponent
                  toggleViewAddChoiceModal={toggleViewAddChoiceModal}
                  packNumber={packNumber}
                  selectedL1FilterValue={selectedL1FilterValue}
                  selectedL2FilterValue={selectedL2FilterValue}
                  selectedL3FilterValue={selectedL3FilterValue}
                  selectedDropData={selectedDropData}
                  setPackNumber={setPackNumber}
                  setPackOptions={setPackOptions}
                  packOptions={packOptions}
                  packName={packName}
                  selectedPackValue={selectedPackValue}
                  setSelectedPackValue={setSelectedPackValue}
                  setShowAddSetField={setShowAddSetField}
                  setPackName={setPackName}
                  showAddSetField={showAddSetField}
                  setCallWedge={setCallWedge}
                  showPackModal={showPackModal}
                  setChoiceDetails={setChoiceDetails}
                  showLoader={showSetLoader}
                  setShowLoader={setShowSetLoader}
                  callPackData={callPackData}
                  setCallPackData={setCallPackData}
                />
                {showStyleMapping && (
                  <WedgeStyleMapping
                    selectedChoices={selectedChoices}
                    toggleViewAddChoiceModal={toggleViewAddChoiceModal}
                    setCallWedge={setCallWedge}
                    l2Options={l2Options}
                    l3Options={l3Options}
                    selectedL2FilterValue={selectedL2FilterValue}
                    wedgeColumn={wedgeColumn}
                    callWedgeAttributeData={callWedgeAttributeData}
                    setSelectedChoices={setSelectedChoices}
                  />
                )}
                {showUploadPopup && (
                  <UploadComponent
                    showUploadPopup={showUploadPopup}
                    setShowUploadPopup={setShowUploadPopup}
                    downloadWedgeRollUp={downloadWedgeRollUp}
                    setCallWedge={setCallWedge}
                    callImageWedgeMap={callImageWedgeMap}
                    statusImageMap={props.statusImageMap}
                  />
                )}
                <div
                  className={
                    showAddChoiceModal ||
                    showPacDownloadModal ||
                    showPackModal ||
                    showStyleMapping
                      ? "hide_wedge"
                      : ""
                  }
                >
                  <PlanWedgeComponent
                    setRTinstance={setWedgeRTinstance}
                    generateOptions={generateOptions}
                    wedgeRTinstance={wedgeRTinstance}
                    selectedL1FilterValue={selectedL1FilterValue}
                    selectedL2FilterValue={selectedL2FilterValue}
                    selectedL3FilterValue={selectedL3FilterValue}
                    selectedDropFilterValue={selectedDropFilterValue}
                    setDisableNext={props.setDisableNext}
                    setUniqueClusterListWedge={setUniqueClusterListWedge}
                    receiveWedgeTableData={receiveWedgeTableData}
                    uniqueClusterList={uniqueClusterListWedge}
                    getWedgeHeadersForExcelDownload={
                      getWedgeHeadersForExcelDownload
                    }
                    getDataForExcelDownlaod={getDataForExcelDownlaod}
                    setShowReceiptDrawer={props.setShowReceiptDrawer}
                    RTinstance={wedgeRTinstance}
                    callWedge={callWedge}
                    setCallWedge={setCallWedge}
                    setDownloadAtL3={setDownloadAtL3}
                    downloadAtL3={downloadAtL3}
                    setWedgeDataForDownload={setWedgeDataForDownload}
                    isDownload={isDownload}
                    setWedgeColumn={setWedgeColumn}
                    setWedgeTableData={setWedgeTableData}
                    showConfirmDropShipDialog={showConfirmDropShipDialog}
                    setShowConfirmDropShipDialog={setShowConfirmDropShipDialog}
                    dropShipChoices={dropShipChoices}
                    setDropShipChoices={setDropShipChoices}
                    finalWedgeData={finalWedgeData}
                    setWedgeValidationMsg={props.setWedgeValidationMsg}
                    fetchPlanSetupDrops={fetchPlanSetupDrops}
                    fetchPlanMetrics={fetchPlanMetrics}
                    handleDeleteChoicePopup={handleDeleteChoicePopup}
                    choiceWedgeColumn={wedgeColumn}
                    groupedDrops={groupedDrops}
                    selectedDropData={selectedDropData}
                    setSelectedDropData={setSelectedDropData}
                    setGroupedDrops={setGroupedDrops}
                    selectedChoiceCarryoverFlag={selectedChoiceCarryoverFlag}
                    setIsScaleUpDownDisabled={setIsScaleUpDownDisabled}
                    editedChoiceUnits={editedChoiceUnits}
                    setEditedChoiceUnits={setEditedChoiceUnits}
                    callValidateWedgeData={props.callValidateWedgeData}
                    setCallUpdateChoiceWedge={setCallUpdateChoiceWedge}
                    callUpdateChoiceWedge={callUpdateChoiceWedge}
                    setEnableUpdateStyleBtn={setEnableUpdateStyleBtn}
                    flowList={flowList}
                    setSelectedChoices={setSelectedChoices}
                    choiceSetDetails={choiceSetDetails}
                    setShowPackModal={setShowPackModal}
                    setCallPackData={setCallPackData}
                    selectedChoices={selectedChoices}
                    isChoiceWedgeChanged={isChoiceWedgeChanged}
                    setIsChoiceWedgeChanged={setIsChoiceWedgeChanged}
                    statusImageMap={props.statusImageMap}
                    setStatusImageMap={props.setStatusImageMap}
                    callImageWedgeMap={callImageWedgeMap}
                    unmappedWedgeAttributes={unmappedWedgeAttributes}
                    callWedgeAttributeData={callWedgeAttributeData}
                    setIsStyleColorChanged={props.setIsStyleColorChanged}
                    isStyleColorChanged={props.isStyleColorChanged}
                    callIntegrateMapData={callIntegrateMapData}
                    setCallIntegrateMapData={setCallIntegrateMapData}
                    setWedgeSelectedRow={setWedgeSelectedRow}
                    wedgeSelectedRow={wedgeSelectedRow}
                  />
                </div>
              </Card>
            )}

            {showDepthMultiplierModal && (
              <DepthMultiplier
                showDepthMultiplierModal={showDepthMultiplierModal}
                toggleViewDepthMultiplier={toggleViewDepthMultiplier}
                selectedL1FilterValue={selectedL1FilterValue}
                selectedL2FilterValue={selectedL2FilterValue}
                selectedL3FilterValue={selectedL3FilterValue}
                callOptimizeWedge={callOptimizeWedge}
              />
            )}
            {isOpenCreatePlanModal && (
              <PlanModal
                {...props}
                open={isOpenCreatePlanModal}
                handleClose={closeCreatePlanModal}
                isWedgeScreen={true}
                planData={props.planDetails.data}
                accessData={props.userAccessList}
              />
            )}
            <Prompt
              isOpen={showDeleteChoicePopup}
              title="Confirm Budget"
              subHeading="You want to hold on to budget?"
              infoList={[]}
              primaryButtonProps={{
                children: "Yes",
                onClick: () => {
                  handleDeleteChoice(true);
                  setShowDeleteChoicePopup(false);
                },
              }}
              tertiaryButtonProps={{
                children: "No",
                onClick: () => {
                  handleDeleteChoice(false);
                  setShowDeleteChoicePopup(false);
                },
              }}
            />
            {showDeleteTablePopup && (
              <DeleteWedgeDataModal
                deleteColumns={
                  deleteType === "style_level"
                    ? deleteStyleColumns
                    : deleteChoiceColumns
                }
                deleteData={
                  deleteType === "style_level"
                    ? props.deleteStyleData
                    : props.deleteChoiceData
                }
                showDeleteTablePopup={showDeleteTablePopup}
                closeDeleteTablePopup={closeDeleteTablePopup}
                deleteType={deleteType}
                setShowDeleteStylePopup={setShowDeleteStylePopup}
                setShowDeleteChoicePopup={setShowDeleteChoicePopup}
              />
            )}
            {showDropShipTablePopup && (
              <DropShipModal
                dropShipColumns={dropShipColumns}
                dropShipChoices={dropShipChoices}
                holdBudget={dropShipHoldBudget}
                showDropShipTablePopup={showDropShipTablePopup}
                closeDropShipTablePopup={closeDropShipTablePopup}
                setCallWedge={setCallWedge}
                finalWedgeData={finalWedgeData}
                isChoiceWedgeChanged={isChoiceWedgeChanged}
                setIsChoiceWedgeChanged={setIsChoiceWedgeChanged}
                callImageWedgeMap={callImageWedgeMap}
                statusImageMap={props.statusImageMap}
                setIsStyleColorChanged={props.setIsStyleColorChanged}
                isStyleColorChanged={props.setIsStyleColorChanged}
              />
            )}
            <Prompt
              isOpen={showConfirmDropShipDialog}
              title="Confirm Choices"
              subHeading="You want to hold on to budget?"
              infoList={[]}
              primaryButtonProps={{
                children: "Yes",
                onClick: () => {
                  callAddDropShipChoices(true);
                  setShowConfirmDropShipDialog(false);
                },
              }}
              tertiaryButtonProps={{
                children: "No",
                onClick: () => {
                  callAddDropShipChoices(false);
                  setShowConfirmDropShipDialog(false);
                },
              }}
            />
            <Prompt
              isOpen={showConfirmScaleUpDownDialog}
              title="Confirm Choices"
              subHeading="You want to hold on to budget?"
              infoList={[]}
              primaryButtonProps={{
                children: "Yes",
                onClick: () => {
                  scaleUpDown(true);
                  setShowConfirmScaleUpDownDialog(false);
                },
              }}
              tertiaryButtonProps={{
                children: "No",
                onClick: () => {
                  scaleUpDown(false);
                  setShowConfirmScaleUpDownDialog(false);
                },
              }}
            />
            <Prompt
              isOpen={showDeleteStylePopup}
              title="Confirm Budget"
              subHeading="You want to hold on to budget?"
              infoList={[]}
              primaryButtonProps={{
                children: "Yes",
                onClick: () => {
                  handleDeleteChoice(true);
                  setShowDeleteStylePopup(false);
                },
              }}
              tertiaryButtonProps={{
                children: "No",
                onClick: () => {
                  handleDeleteChoice(false);
                  setShowDeleteStylePopup(false);
                },
              }}
            />
          </div>
        </LoadingOverlay>
      </LoadingOverlay>
    </>
  );
};

const IncrementDecrementFun = (props) => {
  let options = [];
  if (props.type === "set" && props.packOptions.length > 0) {
    props?.packOptions?.map((opt) => {
      opt.customAbbreviation = <Delete onClick={() => props.deleteSet(opt)} />;
      options.push(opt);
    });
  }
  return (
    <Grid>
      <div className={props.classes.choiceHeading}>
        <div className={props.classes.packFilter}>
          <label className={props.classes.choiceLabel}>
            List of {props.type}(s)
          </label>

          <div className={props.classes.packFilter}>
            {props.type === "set" && !props.showAddSetField ? (
              <div
                className={props.classes.assortSingleFilterView}
                id={"set_name"}
              >
                <label
                  className={props.classes.inputLabel}
                >{`Set Name `}</label>
                <Select
                  id="assortAddPackDropdown"
                  customLabel={props.showCreateSetOption}
                  isDisabled={props.selectedPackValue?.length < 1}
                  menuPosition={"fixed"}
                  menuShouldBlockScroll={true}
                  initialData={
                    props.type === "set" ? options : props.packOptions
                  }
                  selectedOptions={[props.selectedPackValue]}
                  label={"Set Name"}
                  updateDependency={(key, option) => {
                    props.setSelectedPackValue(option[0]);
                    props.setShowAddSetField(false);
                  }}
                  isClearable={false}
                  handleDropdownClose={true}
                  onDelete={() => props.deleteSet()}
                />
              </div>
            ) : null}

            {props.showAddSetField && (
              <>
                <div
                  className={props.classes.assortSingleFilterView}
                  id={"set_name"}
                >
                  <label
                    className={props.classes.inputLabel}
                  >{`Create New Set`}</label>
                  <TextField
                    onChange={(e) => props.setPackName(e.target.value)}
                  />
                </div>
                <Button
                  variant="outlined"
                  color="primary"
                  title={"Hide Set Field"}
                  className={`${props.classes.buttonDiv} ${props.classes.scaleUpDownBtn}`}
                  onClick={() => props.setShowAddSetField(false)}
                >
                  Back
                </Button>
              </>
            )}
          </div>
        </div>
        {(props.showAddSetField ||
          props.selectedPackValue?.value ||
          props.type !== "set") && (
          <Box className="choiceViewDiv" sx={{ minWidth: 30 }}>
            <InputLabel className="choiceLabel" id="demo-simple-select-label">
              Add {props.type === "set" ? "Choice" : props.type}
            </InputLabel>
            {props.type !== "set" && (
              <IconButton
                className="actionBtn"
                color="primary"
                onClick={() =>
                  props.handleChangeNumber("remove", null, props.type)
                }
                size="small"
              >
                <Remove className="icon" fontSize="small" />
              </IconButton>
            )}
            <TextField
              type="number"
              onChange={(e) =>
                props.handleChangeNumber("input", e.target.value, props.type)
              }
              value={props.number}
            />
            <IconButton
              className="actionBtn"
              color="primary"
              onClick={() => props.handleChangeNumber("add", null, props.type)}
              size="small"
            >
              <Add className="icon" fontSize="small" />
            </IconButton>
          </Box>
        )}
      </div>
    </Grid>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planMetricsData: planWedgeServiceActions.planMetricsDataSelector(state),
    wedgeFiltersData: planWedgeServiceActions.wedgeFiltersDataSelector(state),
    wedgeAttributeData: planWedgeServiceActions.wedgeAttributeDataSelector(
      state
    ),
    planOptimizationConstraintData: planWedgeServiceActions.planOptimizationConstraintDataSelector(
      state
    ),
    isWedgeLoading: planWedgeServiceActions.set2_3_LoaderSelector(state),
    wedgeData: planWedgeServiceActions.wedgeDataSelector(state),
    drops_count: planDashboardServiceActions.planDetailsDataSelector(state)
      ?.data?.drops_count,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      state
    ),
    deleteChoiceData: planWedgeServiceActions.deleteChoiceDataSelector(state),
    deleteStyleData: planWedgeServiceActions.deleteStyleDataSelector(state),
    styleWedgeData: planWedgeServiceActions.styleWedgeDataSelector(state),
    isConstraintLoading: planWedgeServiceActions.setConstraint_2_3_LoaderSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getOptimizeWedge,
      setPlanMetricsData,
      setWedgeFiltersData,
      setWedgeData,
      getWedgeAttributesData,
      setWedgeAttributeData,
      updateWedgeData,
      updateStyleWedgeData,
      uploadWedgeData,
      updatePlanSetupdrops,
      setUpdatePlanSetupDropsResponse,
      deleteDataFetch,
      setDeleteChoiceLoader,
      setDeleteChoiceData,
      setDeleteStyleData,
      updateEOP,
      setPlanSetupDrops,
      getPlanSetupdrops,
      getPlanMetricsData,
      setShowWedgeScreen,
      set2_3_Loader,
      addSnack,
      setConstraint_2_3_Loader,
      deleteWedgeChoice,
      updateChoiceSet,
      deleteChoiceSet,
      imageGenWedgeMapping,
      downloadWedgeData,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PlanWedgeRootComponent));
