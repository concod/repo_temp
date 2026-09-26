import { Breadcrumb } from "./Breadcrumb";
import { Avatar } from "./Avatar";
import DateRangePicker from "./DateRangePicker/DateRangePicker";

export const GlobalHeader = () => {
  return (
    <header className="global-header global-header--with-sidebar">
      <div className="header-left">
        <Breadcrumb />
      </div>

      <div className="header-right">
        <DateRangePicker />
        <Avatar />
      </div>
    </header>
  );
};
