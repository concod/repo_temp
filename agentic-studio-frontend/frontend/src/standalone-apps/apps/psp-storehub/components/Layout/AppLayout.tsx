import React, { useEffect } from "react";
import { GlobalHeader } from "./GlobalHeader";
import { SidebarNav } from "./SidebarNav";
import { Overlay } from "./Overlay";
import { useDistrictStore } from "../../store/districtStore";
import Error from "../Utils/Error";
import Spinner from "../../../../../components/Spinner/Spinner";
import { useAuthStore } from "../../store/authStore";
import { useDateRangeStore } from "../../store/dateRangeStore";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { district } = useAuthStore();
  const {
    loading: storesLoading,
    error: storesError,
    fetchStores,
  } = useDistrictStore();
  const {
    loading: dateRangeLoading,
    error: dateRangeError,
    fetchDateRangeLimits,
  } = useDateRangeStore();

  useEffect(() => {
    fetchStores(district || "Test");
    fetchDateRangeLimits();
  }, [fetchStores, district, fetchDateRangeLimits]);

  if (storesLoading || dateRangeLoading) {
    return (
      <div className="app-layout">
        <div className="app-layout__loading">
          <Spinner />
        </div>
      </div>
    );
  }

  if (storesError || dateRangeError) {
    return (
      <div className="app-layout">
        <Error message={storesError || dateRangeError || "Unknown error"} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <SidebarNav />

      <div className="app-layout__main">
        <GlobalHeader />

        <main className="app-layout__content">{children}</main>
      </div>

      <Overlay />
    </div>
  );
};
