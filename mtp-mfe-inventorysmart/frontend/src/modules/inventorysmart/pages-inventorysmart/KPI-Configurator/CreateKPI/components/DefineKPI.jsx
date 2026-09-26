import React, { useEffect, useState } from "react";
import { Input, TextArea, Button } from "impact-ui-v3";
import createKPIImage from "assets/createKPI.png";
import globalStyles from "core/Styles/globalStyles";
import Divider from "@mui/material/Divider";
import "../../KPIConfigurator.css";

export default function DefineKPI({ kpiName, kpiDescription, onCancel, validateName }) {
  const globalClasses = globalStyles();
  const [formData, setFormData] = useState({
    kpiName: "",
    description: "",
  });

  useEffect(() => {
    setFormData({
      kpiName: kpiName || "",
      description: kpiDescription || "",
    });
  }, [kpiName, kpiDescription]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleClear = () => {
    setFormData({
      kpiName: "",
      description: "",
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async (e) => {
    await validateName(formData.kpiName, formData);
  };

  const isFormValid = formData.kpiName.trim() !== "";

  return (
    <div className="define-kpi-wrapper">
      <div className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.verticalAlignStart} define-kpi-main-container`}>
        <div className={`height_80 ${globalClasses.marginAuto} ${globalClasses.flexColumn} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.mainBody} ${globalClasses.h_100}`}>
          <div>
          <div className={globalClasses.pageHeader}>Create KPI</div>
          <div className={globalClasses.inputLabel}>
            Create and manage custom KPIs using a no-code formula builder and map them to supported modules.
          </div>
          </div>
          <img
            src={createKPIImage}
            alt="Create KPI illustration"
          />
        </div>

        <Divider orientation="vertical" flexItem />

        <div className={`height_80 ${globalClasses.marginAuto} ${globalClasses.flexColumn} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.mainBody} ${globalClasses.h_100}`}>
          <div>
            <h3 className={globalClasses.marginBottom}>
              Basic details
            </h3>

            <div className={globalClasses.marginBottom}>
              <Input
                label="KPI name"
                name="kpiName"
                placeholder="Enter here..."
                width="380px"
                isRequired
                value={formData.kpiName}
                onChange={handleChange}
              />
            </div>

            <div className={globalClasses.marginBottom}>
              <TextArea
                label="KPI description"
                name="description"
                placeholder="Enter Description"
                characterLimit={300}
                value={formData.description}
                onChange={handleChange}
                width="600px"
                maxRows={3}
              />
            </div>
          </div>
          <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
            <div>
              <Button variant="secondary" sx={{ marginRight: '1rem' }} onClick={handleCancel}>Cancel</Button>
              <Button variant="secondary" onClick={handleClear} disabled={!isFormValid}>
                Clear all fields
              </Button>
            </div>
            <Button variant="primary" onClick={handleSubmit} disabled={!isFormValid}>
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
