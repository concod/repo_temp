import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { Button } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import {
  getDownloadPOSheetData,
  set2_4_Loader,
} from "../../../services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { DOWNLOAD_PO_METRICS } from "../../../constants-assortsmart/stringContants";
import { getDropName } from "../../../utils-assortsmart/utilityFunctions";
import DownloadIcon from "@mui/icons-material/Download";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planFinalizeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  displaySnackMessage,
  getFinalizeDownloadHeaderData,
} from "./plan-finalize-function";
import { attributeFormatter } from "core/Utils/utils";
import { cloneDeep, isEmpty } from "lodash";
import * as XLSX from "xlsx";
import * as FileSaver from "file-saver";

const ReviewBySizeTableComponent = (props) => {
  const [currentDrop, setCurrentDrop] = useState("");
  const [currentDropIndex, setCurrentDropIndex] = useState(0);
  const [isDownloadClicked, setIsDownloadClicked] = useState(false);

  useEffect(() => {
    if (isDownloadClicked && currentDrop !== "") {
      if (currentDropIndex + 1 < props.dropArray?.length) {
        setCurrentDropIndex(currentDropIndex + 1);
      } else {
        displaySnackMessage(
          "PO Sheet Downloaded Successfully",
          "success",
          props
        );
        setIsDownloadClicked(false);
        setCurrentDropIndex(0);
        setCurrentDrop("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDrop, isDownloadClicked]);

  useEffect(() => {
    if (isDownloadClicked) {
      props.set2_4_Loader(true);
      setTimeout(() => {
        onGeneratePOSheetData();
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDropIndex, isDownloadClicked]);

  const onGeneratePOSheetData = async () => {
    let payload = {
      filters: [
        {
          attribute_name: "plan_code",
          value: [props.planDetails?.plan_code],
          operator: "in",
        },
      ],
    };
    if (
      props.reviewBySizeFormData?.[
        `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
      ]
    ) {
      payload.filters.push({
        attribute_name: props.screenConfiguration?.common?.flow_key || "flow",
        prefix: "levels",
        operator: "in",
        value: [
          props.reviewBySizeFormData?.[
            `${props.screenConfiguration?.common?.flow_key || "flow"}_list`
          ],
        ],
      });
    }
    let poSheetResponse = await props.getDownloadPOSheetData(
      payload,
      props.screenConfiguration?.common?.endpoint_project_name || "assort"
    );

    const unitsData = [],
      percenatgeData = [];
    poSheetResponse?.data?.data &&
      poSheetResponse?.data?.data?.data?.map((items) => {
        let item = {};
        let { size } = items;
        for (const key in DOWNLOAD_PO_METRICS) {
          if (key === "drop" || key === "launch") {
            item["Drop"] = attributeFormatter(items[key]) || "-";
          } else {
            item[DOWNLOAD_PO_METRICS[key]] = items[key];
          }
        }
        Object.keys(props.levelsJson).forEach((level) => {
          item[props.levelsJson[level]] = items[level];
        });
        item["Drop"] = attributeFormatter(
          items[props.screenConfiguration?.common?.drop_key || "drop"]
        );
        let itemPercentage = cloneDeep(item);
        itemPercentage["Total Buy Units"] = 100;

        if (size) {
          if(!isEmpty(size)){
            for (const key in size) {
              item[`Size(${key})`] = size[key]?.toFixed();
              itemPercentage[`Size(${key})`] =
                items.Quantity && size[key]
                  ? Math.round((size[key] / items.Quantity) * 100)
                  : 0;
            }
          }
        }
        unitsData.push(item);
        percenatgeData.push(itemPercentage);
        return null;
      });
    /* create a new blank excel file */
    let excelFile = XLSX.utils.book_new();

    /* create a worksheet for books */
    let unitsDetails = XLSX.utils.json_to_sheet(unitsData);

    /* Add the worksheet to the excelFile */
    XLSX.utils.book_append_sheet(excelFile, unitsDetails, "Units");

    /* create a worksheet for percentage details */
    let percentageDetails = XLSX.utils.json_to_sheet(percenatgeData);

    /* Add the worksheet to the excelFile */
    XLSX.utils.book_append_sheet(excelFile, percentageDetails, "Percentage");

    const fileType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
    const excelBuffer = XLSX.write(excelFile, {
      bookType: "xlsx",
      type: "array",
    });
    const excelData = new Blob([excelBuffer], { type: fileType });
    FileSaver.saveAs(
      excelData,
      `${props.planDetails?.["name"]}_PO_Sheet.xlsx`
    );

    setCurrentDrop(
      getDropName(props.dropArray?.[currentDropIndex] || "")
    );
    props.set2_4_Loader(false);
  };

  const onDownloadPOSheetData = () => {
    setIsDownloadClicked(true);
    setCurrentDropIndex(0);
    setCurrentDrop("");
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        title={"Download PO sheet data"}
        onClick={() => {
          onDownloadPOSheetData();
        }}
      >
        {<DownloadIcon />}
      </Button>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state)
      ?.data,
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    reviewBySizeData: planFinalizeServiceActions.reviewBySizeDataSelector(
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
      getDownloadPOSheetData,
      set2_4_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReviewBySizeTableComponent);
