import { Step, StepButton, Stepper, Typography } from "@mui/material";
import { useState } from "react";
import { useLocation } from "react-router";
import { useNavigate } from "react-router-dom-v5-compat";
import globalStyles from "core/Styles/globalStyles";
import SchedulerSelection from "./SchedulerSelection";
import StoreSelection from "./StoreSelection";
import {
  CONFIGURATION,
  CREATE_STORE_ALLOCATION_RULES_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { AUTO_ALLOCATION_RULE_STEPS } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

const StoreMappingToScheduler = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const globalClasses = globalStyles();

  const [activeStep, setActiveStep] = useState(0);
  const [storeSelectionData, setStoreSelectionData] = useState({});
  const [requestBody, setRequestBody] = useState([]);
  const [selectedStoresCount, setSelectedStoresCount] = useState(0);

  const handleStoreSelectionComplete = (count) => {
    setSelectedStoresCount(count);
  };

  const routeOptions = [
    {
      label: `Material Rules`,
      id: 1,
      action: () => {
        navigate(CONFIGURATION, {
          state: CREATE_STORE_ALLOCATION_RULES_MAPPING,
        });
      },
    },
    {
      label: `Add Store`,
      id: 2,
    },
  ];

  const { filters, rowData, checkAll } = location.state;

  const handleNext = (data) => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setStoreSelectionData(data);
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <StoreSelection
              payload={filters}
              rowData={rowData}
              checkAll={checkAll}
              requestBody={requestBody}
              handleNext={handleNext}
              setRequestBody={setRequestBody}
              onStoreSelectionComplete={handleStoreSelectionComplete}
            />
          </>
        );
      case 1:
        return (
          <>
            <SchedulerSelection
              requestBody={requestBody}
              storeData={storeSelectionData}
              setActiveStep={setActiveStep}
              selectedStoresCount={selectedStoresCount}
            />
          </>
        );
      default:
        return;
    }
  };

  return (
    <>
      <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>
      <div className={globalClasses.marginAround}>
        <Typography variant="h4" className={globalClasses.paddingHorizontal}>
          Add Store
        </Typography>

        <Stepper activeStep={activeStep} className={globalClasses.centerAlign}>
          {AUTO_ALLOCATION_RULE_STEPS.map((label, index) => (
            <Step key={label}>
              <StepButton
                onClick={() => {
                  if (index < activeStep) return;
                  else setActiveStep(index);
                }}
              >
                {label}
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </div>
      <div className={globalClasses.marginAround}>{getStepContent()}</div>
    </>
  );
};

export default StoreMappingToScheduler;
