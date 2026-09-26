import React from "react";
import { useSelector } from "react-redux";
import FiltersSummary from "core/commonComponents/filterModal/filters-summary";

const AdaFiltersSummary = () => {
  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const filtersSummary = {
    Channel:
      adaDashboardReducer?.channel?.length && adaDashboardReducer.channel,
    Daterange: [
      {
        label: `${adaDashboardReducer?.fiscalDates?.start_date} to ${adaDashboardReducer?.fiscalDates?.end_date}`,
      },
    ],
    Products: adaDashboardReducer?.product?.map((level) => level?.values),
    Stores: adaDashboardReducer?.store?.map((level) => level?.values),
  };

  return <FiltersSummary filtersSummary={filtersSummary} />;
};

export default AdaFiltersSummary;
