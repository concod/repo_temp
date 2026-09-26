import Form from "core/Utils/form";
import { useMemo } from "react";
import { isEmpty } from "lodash";
import { BottomSheet, Button } from "impact-ui-v3";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";

const ReviewRecommendationPopUp = ({
  setShowSetAllModal,
  choiceTableColumns,
  kpiValues,
  selectedRows,
  isDataWeekLevel,
  SetAllData,
  displaySnackMessages,
  topContent,
  formData,
  setFormData,
  flagEdit,
  setFlagEdit,
  renderReviewRecommendationTable,
  onSaveDraft,
  onApprove,
  isApproveDisabled,
  isSaveDraftDisabled,
}) => {
  // const [formData, setFormData] = useState({});
  // const [flagEdit, setFlagEdit] = useState(false);
  const classes = useStyles();

  const isWeekLevel = true;

  const MATRIX_SUMMARY_SETALL_FIELDS = useMemo(
    () => [
      {
        accessor: "week_month_list",
        field_type: "list",
        isMulti: false,
        options: choiceTableColumns.map((data) => ({
          label: data?.label,
          value: data?.column_name,
          id: data?.column_name,
        })),
        required: true,
        label: isWeekLevel ? "Select Week" : "Month",
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
    setFormData(data);

    if (!flagEdit) {
      setFlagEdit(true);
    }
  };

  const onCancel = () => {
    setShowSetAllModal(false);
    setFormData({});
  };

  // const onApply = async () => {
  //   if (flagEdit) {
  //     if (
  //       // !formData.hasOwnProperty("set_all_on") ||
  //       !formData.hasOwnProperty("week_month_list")
  //     ) {
  //       return displaySnackMessages(
  //         "Please select the required fields!",
  //         "info"
  //       );
  //     }
  //     var selectedStyle = [];
  //     selectedRows?.map((data) => {
  //       selectedStyle.push(data?.row);
  //     });
  //     let payloadData = {
  //       week_month_list: formData?.week_month_list,
  //     };

  //     let response = SetAllData(payloadData);
  //     if (response) {
  //       setShowSetAllModal(false);
  //     }
  //   } else {
  //     displaySnackMessages(NO_UPDATE, "info");
  //   }
  // };

  return (
    <BottomSheet
      open={true}
      onClose={() => onCancel()}
      title="Review recommendation"
      footerOptions={
        <>
          <Button onClick={onCancel} variant="url">
            Cancel
          </Button>
          <Button
            onClick={onSaveDraft}
            variant="secondary"
            disabled={isSaveDraftDisabled()}
          >
            Save as draft
          </Button>
          <Button
            onClick={onApprove}
            variant="primary"
            disabled={isApproveDisabled()}
          >
            Approve rebalance
          </Button>
        </>
      }
      // isExpanded={false}
    >
      <div style={{ display: "flex", gap: "12px" }}>
        <div className={classes.flexRow} style={{ alignItems: "center" }}>
          <div>
            <Form
              maxFieldsInRow={2}
              layout={"vertical"}
              handleChange={handleChange}
              fields={MATRIX_SUMMARY_SETALL_FIELDS}
              updateDefaultValue={true}
              defaultValues={{}}
              selectMinWidth={"300px"}
            ></Form>
            <label
              style={{
                fontSize: "12px",
                position: "absolute",
                color: "#60697D",
                fontWeight: "500",
              }}
            >
              *The subsequent 3 weeks are selected automatically
            </label>
          </div>
          <div
            className={classes.lineSeparator}
            style={{ transform: "translateY(90%)" }}
          ></div>
        </div>
        {topContent}
      </div>
      <div
        style={{
          marginTop: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        {renderReviewRecommendationTable && renderReviewRecommendationTable()}
      </div>
    </BottomSheet>
  );
  return (
    <Modal
      onClose={() => onCancel()}
      title="Select Week"
      aria-labelledby="matrix-summary-set-all"
      open={true}
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => {
            onCancel();
          },
          variant: "url",
        },
        {
          label: "Proceed",
          onClick: () => {
            onApply();
          },
          variant: "contained",
        },
      ]}
      primaryButtonLabel="Apply"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={() => {
        onApply();
      }}
      onSecondaryButtonClick={() => {
        onCancel();
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: "14px",
          fontWeight: "bold",
          marginBottom: "10px",
        }}
      >
        The subsequent 3 weeks are selected automatically
      </div>
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
    </Modal>
  );
};

export default ReviewRecommendationPopUp;
