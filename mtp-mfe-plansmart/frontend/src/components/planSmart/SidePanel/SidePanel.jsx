import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Panel } from "impact-ui-v3";
import { Box, Tabs, Tab } from "@mui/material";
import TypographyWrapper from "components/material/TypographyWrapper";
import SaveViewIcon from "assets/saveView.svg";
import { colors } from "../../../styles/colors.js";
import {
  SAVE_VIEW_INFO_TEXT,
  SAVE_VIEW_BUTTON_LABEL
} from "./sidePanel.constants.js";
import SaveViewManagementModal from "pages/ViewManagement/components/SaveViewManagement/SaveViewManagementModal.jsx";
import "./style.scss";

const SidePanelComponent = ({
  showPanel,
  tabConfig,
  handleClose,
  panelTitle,
  panelSize = "medium",
  primaryButtonLabel = "",
  secondaryButtonLabel = ""
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);

  const handleChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Panel
      size={panelSize}
      open={showPanel}
      className={"impact_drawer_container MuiPaper-root MuiBackdrop-root"}
      onClose={handleClose}
      title={panelTitle}
      disabled={true}
      primaryButtonLabel={primaryButtonLabel}
      secondaryButtonLabel={secondaryButtonLabel}
    >
      {/* TO DO : "propName:panelAction" move this div component to separate file */}
      <div className="panel-container">
        <div className="typography_wrapper">
          <div
            className="save-view-container"
            onClick={() => setIsSaveViewModalOpen(true)}
          >
            <SaveViewIcon />
            <TypographyWrapper
              variant="body1"
              style={{
                fontWeight: 500,
                color: colors.sapphire,
                lineHeight: "21px"
              }}
              content={SAVE_VIEW_BUTTON_LABEL}
            />
          </div>
          <TypographyWrapper
            sx={{ color: colors.slateGray, fontSize: "12px", fontWeight: 400 }}
            variant="body2"
            component="body2"
            content={
              <span>
                <span style={{ color: "#FF832B" }}>*</span>
                {SAVE_VIEW_INFO_TEXT}
              </span>
            }
          />
        </div>
        <SaveViewManagementModal
          isModalOpen={isSaveViewModalOpen}
          setIsModalOpen={setIsSaveViewModalOpen}
        />
        <section className="parent_container">
          <div className="view_type_container">
            <Tabs value={activeTab} onChange={handleChange}>
              {tabConfig?.map((tab, index) => (
                <Tab
                  className="tab_spacing"
                  //key={tab?.id}// to be updated with api integration
                  icon={React.cloneElement(tab.icon, {
                    fill:
                      activeTab === index ? colors.sapphire : colors.slateGray
                  })}
                  iconPosition="start"
                  label={activeTab === index ? tab.label : null}
                />
              ))}
            </Tabs>
          </div>
          <div className="active-tab-content-container">
            {tabConfig?.map((tab, index) => (
              <div>
                {activeTab === index && (
                  <div>
                    <Box className="box_container">{tab.content}</Box>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
};

SidePanelComponent.propTypes = {
  tabConfig: PropTypes.shape({
    map: PropTypes.func
  }),
  handleClose: PropTypes.func,
  showPanel: PropTypes.bool,
  panelSize: PropTypes.string,
  panelTitle: PropTypes.string,
  primaryButtonLabel: PropTypes.string,
  secondaryButtonLabel: PropTypes.string,
  setIsTableViewPanelOpen: PropTypes.func
};

export default SidePanelComponent;
