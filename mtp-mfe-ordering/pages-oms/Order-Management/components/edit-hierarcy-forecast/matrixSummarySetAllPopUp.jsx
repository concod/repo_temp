import Form from "core/Utils/form";
import { useMemo, useRef, useState } from "react";
import { isEmpty } from "lodash";
import { useSelector } from "react-redux";
import { Modal } from "impact-ui-v3";
import { NO_UPDATE } from "modules/oms/constants-oms/stringConstants";
import { Panel } from "impact-ui-v3";

const MatrixSummarySetAllModal = ({
  setShowSetAllModal,
  kpiValues,
  selectedRows,
  isDataWeekLevel,
  SetAllData,
  displaySnackMessages,
  columnData,
  //   rowsData,
  //   setAll,
  //   setCheckAllSetAllRequest,
  //   agGridInstance,
}) => {
  const [formData, setFormData] = useState({});
  const [flagEdit, setFlagEdit] = useState(false);
  var orderPolicySetAllPayload = useRef([]);

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );

  const orderingScreensConfig = useSelector(
    (store) => store?.omsReducer.orderingCommonService.orderingScreensConfig
  );
  const fiscalWeekId = matrixSummaryReducer?.xAxisStaticDates;
  const isWeekLevel = matrixSummaryReducer?.displayDataToWeekLevel;

  const MATRIX_SUMMARY_SETALL_FIELDS = useMemo(
    () => [
      {
        accessor: "week_month_list",
        field_type: "list",
        isMulti: true,
        options: orderingScreensConfig?.oms_dashboard?.matrix_summary
          ?.mapSetAllFieldsWithColumnHeaders
          ? fiscalWeekId?.fiscal_ids.map((fiscalId) => {
              const matchingColumn = columnData?.find(
                (col) => col.column_name === fiscalId
              );
              return {
                label:
                  matchingColumn?.custom_label ||
                  matchingColumn?.label ||
                  fiscalId,
                value: fiscalId,
                id: fiscalId,
              };
            })
          : fiscalWeekId?.fiscal_ids.map((data) => ({
              label: data,
              value: data,
              id: data,
            })),
        required: true,
        label: isWeekLevel ? "Week" : "Month",
      },
      {
        accessor: "set_all_on",
        field_type: "list",
        options: kpiValues?.attribute_value?.options.map((skuId) => ({
          label: skuId?.label,
          value: skuId?.value,
          //id: skuId.id,
        })),
        required: true,
        label: kpiValues?.attribute_value?.matrixSummaryLabel || "Kpi Source",
      },
    ],
    []
  );

  const getcheckAllSetAllReq = (p_data, p_mapping) => {
    let req = {};
    for (let i in p_mapping) {
      !isEmpty(p_data?.[i]) && (req[p_mapping[i]] = p_data[i]);
    }
    return req;
  };

  const handleChange = (data) => {
    console.log("formData124", data);
    setFormData(data);
    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
  };

  const onApply = async () => {
    if (flagEdit) {
      if (
        !formData.hasOwnProperty("set_all_on") ||
        !formData.hasOwnProperty("week_month_list")
      ) {
        return displaySnackMessages(
          "Please select the required fields!",
          "info"
        );
      }
      var selectedStyle = [];
      selectedRows?.map((data) => {
        selectedStyle.push(data?.row);
      });
      let payloadData = {
        week_month_list: formData?.week_month_list.map(Number),
        set_all_on: formData?.set_all_on,
        update_level: isDataWeekLevel
          ? "fiscal_year_week"
          : "fiscal_year_month",
        styles_list: selectedStyle,
      };

      console.log("payloadData", formData);
      let response = SetAllData(payloadData);
      if (response) {
        setShowSetAllModal(false);
      }
      // var Weekdata = {
      //   week: parseInt(formData?.order_cycle),
      //   day: "Sunday",
      // };
      // let l_checkAllSetAllRequest = {
      //   searchColumns: agGridInstance.api.getFilterModel(),
      //   ...getcheckAllSetAllReq(formData, SETALL_MAPPING),
      // };
      // let data;
      // if (
      //   agGridInstance.api.checkConfiguration[
      //     agGridInstance.api.checkConfiguration.length - 2
      //   ]
      // ) {
      //   setCheckAllSetAllRequest((old) => {
      //     if (!isEmpty(old)) {
      //       data = [...old, l_checkAllSetAllRequest];
      //       return [...old, l_checkAllSetAllRequest];
      //     } else {
      //       data = [l_checkAllSetAllRequest];
      //       return [l_checkAllSetAllRequest];
      //     }
      //   });
      // }
      // let response = setAll(orderPolicySetAllPayload.current, data);
      // if (response) {
      //   setShowSetAllModal(false);
      //   orderPolicySetAllPayload.current = [];
      // }
    } else {
      displaySnackMessages(NO_UPDATE, "info");
    }
  };

  return (
    <Panel
      onClose={() => onCancel()}
      title="Set All"
      width="538"
      aria-labelledby="matrix-summary-set-all"
      open={true}
      primaryButtonLabel="Apply"
      onPrimaryButtonClick={() => {
        onApply();
      }}
      secondaryButtonProps={{
        variant: "url",
      }}
      secondaryButtonLabel="Cancel"
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div>
        <Form
          maxFieldsInRow={2}
          layout={"vertical"}
          handleChange={handleChange}
          fields={MATRIX_SUMMARY_SETALL_FIELDS}
          updateDefaultValue={true}
          defaultValues={{}}
        ></Form>
      </div>
    </Panel>
  );
};

export default MatrixSummarySetAllModal;
