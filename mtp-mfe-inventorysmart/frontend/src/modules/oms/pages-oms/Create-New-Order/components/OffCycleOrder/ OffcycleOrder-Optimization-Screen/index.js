import React, { useEffect } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { Button } from "impact-ui-v3";
import ROBOT_ICON from "assets/impactv3/Robot_Icon.svg";
import DC_ICON from "assets/impactv3/Dc_Icon.png";
import CROSS_ICON from "assets/impactv3/Cross_Icon.png";
import STORE_ICON from "assets/impactv3/Store_Icon.png";
import GRAPH_ICON from "assets/impactv3/Graph_Icon.png";
import SHIRT_ICON from "assets/impactv3/Graph_Icon.png";
import EQUAL_ICON from "assets/impactv3/Equal_Icon.png";
import "./styles.css";
import { runOffCycleRecommendationCalculation } from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

function OffCycleOrderOptimizationScreen({
  view_type = "manual_off_cycle",
  heading = "Optimisation running for recommendation",
  description = "It'll take several minutes. You'll get notification once optimisation is completed.",
  primaryButtonLabel = "Return to dashboard",
  showPrimaryButton = true,
  onPrimaryButtonClick,
  label = ["SKU's", "DC's", "Vendor", "Data points"],
  value = [null, null, null, null],
  optimizationDetails = {},
  ...props
}) {
  let height = "600px";
  if (isEmpty(optimizationDetails)) {
    height = "400px";
  }

  useEffect(() => {
    const runOffCycleRecommendationCalculationHandler = async () => {
      try {
        const response = await props.runOffCycleRecommendationCalculation({
          draft_id: [optimizationDetails?.draft_id],
          view_type: view_type,
        });
        if (response?.data?.status) {
          console.log("Off cycle recommendation calculation Triggered.");
        } else {
          console.log(
            "Error in running off cycle recommendation calculation",
            response?.data?.message
          );
        }
      } catch (error) {
        console.log(
          "Error in running off cycle recommendation calculation",
          error
        );
      }
    };
    runOffCycleRecommendationCalculationHandler();
  }, [optimizationDetails?.draft_id, view_type]);

  const ImageComponent = ROBOT_ICON;
  return (
    <div className="optimize_wrapper" style={{ height }}>
      <div className="center_svg">
        <ImageComponent />
      </div>
      {!isEmpty(optimizationDetails) && (
        <div className="heading_kpi_panel">
          <div className="i_heading">{heading}</div>
          <div className="kpis_box">
            <div className="kpis" style={{ background: "#F8E5D3" }}>
              <img src={SHIRT_ICON} alt="AI" />
              <div className="kpi_text_panel">
                <div className="text_bold">{value[0]}</div>
                <div className="text_bold">{label[0]}</div>
              </div>
            </div>
            <img height={"25px"} width={"30px"} src={CROSS_ICON} alt="AI" />
            <div className="kpis" style={{ background: "#DBEFF0" }}>
              <img src={STORE_ICON} alt="AI" />
              <div className="kpi_text_panel">
                <div className="text_bold">{value[1]}</div>
                <div className="text_bold">{label[1]}</div>
              </div>
            </div>
            <div className="icon">
              <img height={"25px"} width={"30px"} src={CROSS_ICON} alt="AI" />
            </div>
            <div className="kpis" style={{ background: "#ECEEFD" }}>
              <img src={DC_ICON} alt="AI" />
              <div className="kpi_text_panel">
                <div className="text_bold">{value[2]}</div>
                <div className="text_bold">{label[2]}</div>
              </div>
            </div>
            <div className="icon">
              <img src={EQUAL_ICON} alt="AI" />
            </div>
            <div
              className="kpis"
              style={{ background: "#CFF0F8", width: "187px" }}
            >
              <img src={GRAPH_ICON} alt="AI" />
              <div className="kpi_text_panel">
                <div className="text_bold">{value[3]}</div>
                <div className="text_bold">{label[3]}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="cta_text_panel">
        <div className="i_paragraph">{description}</div>
        {showPrimaryButton && <div className="light_text">OR</div>}

        <div className="bottom_cta_container">
          {primaryButtonLabel && showPrimaryButton && (
            <Button onClick={onPrimaryButtonClick}>{primaryButtonLabel}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

const mapDispatchToProps = (dispatch) => {
  return {
    runOffCycleRecommendationCalculation: (payload) =>
      dispatch(runOffCycleRecommendationCalculation(payload)),
  };
};

export default connect(
  null,
  mapDispatchToProps
)(OffCycleOrderOptimizationScreen);
