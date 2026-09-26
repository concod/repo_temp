import { useMemo } from "react";
import { Breadcrumb } from "./Breadcrumb";
import { Avatar } from "./Avatar";
import { Badge } from "../../../../shared/packages/ui";
import { useDashboardStore } from "../../store/dashboardStore";

export const GlobalHeader = ({
  openSidebar,
}: {
  openSidebar: () => void;
}) => {
  const { dataTimeDetail } = useDashboardStore();

  // Format the date badge text from dataTimeDetail
  const badgeText = useMemo(() => {
    if (!dataTimeDetail?.details?.dates) {
      return "";
    }

    const { details } = dataTimeDetail;
    const { number, dates } = details;

    // Format dates from "2025-10-12" to "10/12/2025"
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const startDate = formatDate(dates.start);
    const endDate = formatDate(dates.end);
    const granularity =
      dataTimeDetail.dataDisplayValue || dataTimeDetail.granularity;

    return `Data for ${granularity} ${number}: ${startDate} - ${endDate}`;
  }, [dataTimeDetail]);

  return (
    <header className="global-header global-header--with-sidebar">
      <div className="header-left">
        <button className="hamburger" onClick={openSidebar}>
          <i className="fa-solid fa-bars"></i>
        </button>
        <Breadcrumb />
      </div>

      <div className="header-right">
        {badgeText && <Badge text={badgeText} className="date-badge" />}
        <Avatar />
      </div>
    </header>
  );
};
