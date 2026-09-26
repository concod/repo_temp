import React, { useState, useEffect } from "react";
import { ButtonGroup } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import ClusterStoreIcon from "assets/IS_icons/IS_ClusterStore.svg";
import ProductIcon from "assets/IS_icons/IS_product.svg";
import S2SSummaryStoreTable from "./S2SSummaryStoreTable";
import S2SSummaryStyleTable from "./S2SSummaryStyleTable";

const S2SToggleSummary = (props) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const globalClasses = globalStyles();

  useEffect(() => {
    if (props.selectedOption === "view") {
      setSelectedOption(0);
    }
  }, [props.selectedOption]);

  const onButtonGroupChange = (event, newValue) => {
    setSelectedOption(newValue);
  };

  return (
    <div>
      <div
        className={`${globalClasses.centerAlign} ${globalClasses.verticalAlignCenter} ${globalClasses.marginBottom}`}
      >
        <ButtonGroup
          onChange={onButtonGroupChange}
          selectedOption={selectedOption}
          options={[
            {
              label: "Store",
              value: 0,
              icon: <ClusterStoreIcon />,
            },
            {
              label: "Style",
              value: 1,
              icon: <ProductIcon />,
            },
          ]}
        />
      </div>
      <div>
        {selectedOption === 0 && <S2SSummaryStoreTable />}
        {selectedOption === 1 && <S2SSummaryStyleTable />}
      </div>
    </div>
  );
};

export default S2SToggleSummary;
