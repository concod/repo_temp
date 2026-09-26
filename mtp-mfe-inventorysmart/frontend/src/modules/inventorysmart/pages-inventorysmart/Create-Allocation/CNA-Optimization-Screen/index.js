import React from "react";
import { Button } from "impact-ui-v3";
import ROBOT_ICON from "../../../../../assets/impactv3/Robot_Icon.svg";
import DC_ICON from "../../../../../assets/impactv3/Dc_Icon.png"
import CROSS_ICON from "../../../../../assets/impactv3/Cross_Icon.png"
import STORE_ICON from "../../../../../assets/impactv3/Store_Icon.png"
import GRAPH_ICON from "../../../../../assets/impactv3/Graph_Icon.png"
import SHIRT_ICON from "../../../../../assets/impactv3/Graph_Icon.png"
import EQUAL_ICON from "../../../../../assets/impactv3/Equal_Icon.png"
import {isEmpty} from "lodash"
import "./styles.css"
import { DEFAULT_CNA_OPTIMIZATION_SCREEN_DESCRIPTION, DEFAULT_CNA_OPTIMIZATION_SCREEN_HEADER } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

export default function CnaOptimizationScreen({
  heading = DEFAULT_CNA_OPTIMIZATION_SCREEN_HEADER,
  description = DEFAULT_CNA_OPTIMIZATION_SCREEN_DESCRIPTION,
  secondaryButtonLabel = "Return to dashboard",
  onSecondaryButtonClick,
  primaryButtonLabel = "Create new allocation",
  onPrimaryButtonClick,
  label = ['SKUs', 'Stores', 'DCs', 'Data Points'],
  value = [null,null,null,null],
  optimizationDetails = {}
}) {
  let height = '600px'
  if(isEmpty(optimizationDetails)){
    height = '400px'
  }

  const ImageComponent = ROBOT_ICON
  return (
    <div className="optimize_wrapper" style={{height}}>
      <div className="center_svg">
        <ImageComponent />
      </div>
  {!isEmpty(optimizationDetails) &&  <div className="heading_kpi_panel">
        <div className="i_heading">{heading}</div>
        <div className="kpis_box">
          <div className="kpis" style={{ background: '#F8E5D3' }}>
            <img
              src={SHIRT_ICON}
              alt="AI"
            />
            <div className="kpi_text_panel">
              <div className="text_bold">
                {value[0]}
              </div>
              <div className="text_bold">
                {label[0]}
              </div>
            </div>
          </div>
          <img
            height={'25px'}
            width={'30px'}
            src={CROSS_ICON}
            alt="AI"
          />
          <div className="kpis" style={{ background: '#DBEFF0' }}>
            <img
              src={STORE_ICON}
              alt="AI"
            />
            <div className="kpi_text_panel">
              <div className="text_bold">
                {value[1]}
              </div>
              <div className="text_bold">
                {label[1]}
              </div>

            </div>
          </div>
          <div className="icon">
            <img
              height={'25px'}
              width={'30px'}
              src={CROSS_ICON}
              alt="AI"
            />
          </div>
          <div className="kpis" style={{ background: '#ECEEFD' }}>
            <img
              src={DC_ICON}
              alt="AI"
            />
            <div className="kpi_text_panel">
              <div className="text_bold">
                {value[2]}
              </div>
              <div className="text_bold">
                {label[2]}
              </div>

            </div>
          </div>
          <div className="icon">
            <img
              src={EQUAL_ICON}
              alt="AI"
            />
          </div>
          <div className="kpis" style={{ background: '#CFF0F8', width: '187px' }}>
            <img
              src={GRAPH_ICON}
              alt="AI"
            />
            <div className="kpi_text_panel">
              <div className="text_bold">
                {value[3]}
              </div>
              <div className="text_bold">
                {label[3]}
              </div>
            </div>
          </div>

        </div>
      </div>}
      <div className="cta_text_panel">
        <div className="i_paragraph">{description}</div>
        <div className="light_text">
          OR
        </div>

        <div className="bottom_cta_container">
          {primaryButtonLabel && (
            <Button
              onClick={onPrimaryButtonClick}>
              {primaryButtonLabel}
            </Button>
          )}
          {secondaryButtonLabel && (
            <Button
              variant="secondary"
              onClick={onSecondaryButtonClick}
            >
              {secondaryButtonLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
