import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DateRangePicker } from '../../components/DatePicker';
import Spinner from '../../components/Spinner/Spinner';
import { useMonitoring } from '../../hooks/useMonitoring';
import { ExecutiveOverview, SafetySection, PerformanceSection, ClientAnalyticsSection, CostSection} from '../../components/MonitoringSections';
import { IPDetailsModal } from '../../components/Modal';
import type { GeoLocationData } from '../../types/api'; // Import type

const APIMonitoringPage: React.FC = () => {
  // --- State & Setup ---
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString());
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const { data: dashboardData, loading, error, fetchMonitoringData } = useMonitoring();
  
  // UI State
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isIPDetailsModalOpen, setIsIPDetailsModalOpen] = useState(false);

  // Memoize the geoDataMap transformation (moved to top to fix hook order issue)
  const geoDataMap = useMemo(() => {
    if (!dashboardData?.ipGeoData) return new Map<string, GeoLocationData>();
    return new Map(Object.entries(dashboardData.ipGeoData));
  }, [dashboardData]);

  // --- Effects ---
  useEffect(() => {
    fetchMonitoringData(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close DatePicker on outside click
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen]);

  // --- Handlers ---
  const handleDateRangeSelect = (start: Date | null, end: Date | null) => {
    if (start && end) {
      const fromD = new Date(start); fromD.setHours(0,0,0,0);
      const toD = new Date(end);
      
      const isToday = toD.toDateString() === new Date().toDateString();
      if (!isToday) toD.setHours(23,59,59,999);
      else toD.setTime(new Date().getTime());

      const fromISO = fromD.toISOString();
      const toISO = toD.toISOString();

      setFromDate(fromISO.split('T')[0]);
      setToDate(toISO);
      fetchMonitoringData(fromISO, toISO);
      setIsDatePickerOpen(false);
    }
  };

  const handleCountryClick = (country: string) => {
    setSelectedCountry(country);
    setIsIPDetailsModalOpen(true);
  };

  const refetch = () => {
    fetchMonitoringData(fromDate, toDate);
  };

  const formatDateDisplay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to extract IPs for a specific country from the GeoData Map
  const getIPsForCountry = (countryName: string, geoMap: Map<string, GeoLocationData>): string[] => {
    const ips: string[] = [];
    geoMap.forEach((data, ip) => {
      if (data.country === countryName) {
        ips.push(ip);
      }
    });
    return ips;
  };

  // --- Render ---
  if (loading && !dashboardData) {
    return (
      <div className="loading-overlay">
        <Spinner className="spinner--large" />
      </div>
    );
  }

  const showEmptyState = !loading && !dashboardData && !error;

  return (
    <div className="page api-monitoring">
      <div className="monitoring-header">
        <div className="header-left">
          <h1 className="headline-1">API Monitoring</h1>
          <p className="subtitle body-medium">Real-time monitoring and analytics for your API infrastructure</p>
        </div>
        <div className="header-actions">
          <div className="filter-controls" ref={pickerRef} style={{ position: 'relative' }}>
            <button 
              className="filter-dropdown date-range-button"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              disabled={loading}
              style={{
                padding: '8px 16px', background: 'white', border: '1px solid #e6e9ee',
                borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px',
                minWidth: '240px', justifyContent: 'space-between', cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <span>{formatDateDisplay(fromDate)} - {formatDateDisplay(toDate.split('T')[0])}</span>
              <span style={{ opacity: 0.6 }}>📅</span>
            </button>
            {isDatePickerOpen && (
              <DateRangePicker open={true} onClose={() => setIsDatePickerOpen(false)} onDone={handleDateRangeSelect} />
            )}
          </div>
          <button className="btn-secondary" onClick={refetch} disabled={loading}>
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-download'}`}></i>
            {loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
      </div>

      {showEmptyState ? (
        <div className="empty-state"><div className="empty-state-content"><h3>No monitoring data available</h3></div></div>
      ) : error ? (
        <div className="empty-state"><div className="empty-state-content"><h3>Unable to load dashboard data</h3><p>{error}</p><button className="retry-button" onClick={refetch}>Try Again</button></div></div>
      ) : dashboardData ? (
        <div className="monitoring-content">
          <ExecutiveOverview 
            metrics={dashboardData.metrics}
            fromDate={dashboardData.fromISO}
            toDate={dashboardData.toISO}
          />
          <SafetySection
            safetyData={dashboardData.safetyData}
            blockedLogs={dashboardData.blockedLogs}
          />
          <PerformanceSection 
            charts={dashboardData.performanceCharts}
            metrics={dashboardData.metrics}
            errorLogs={dashboardData.errorLogs}
          />
          <ClientAnalyticsSection 
            clientAnalytics={dashboardData.clientAnalytics}
            clientAnalyticsLoading={false}
            onCountryClick={handleCountryClick}
          />
          <CostSection 
            charts={dashboardData.costCharts}
            metrics={dashboardData.metrics}
            fromISO={dashboardData.fromISO}
            toISO={dashboardData.toISO}
          />
        </div>
      ) : null}

      {isIPDetailsModalOpen && selectedCountry && (
        <IPDetailsModal
          onClose={() => setIsIPDetailsModalOpen(false)}
          country={selectedCountry}
          ips={getIPsForCountry(selectedCountry, geoDataMap)} // Helper function to filter IPs
          geoDataMap={geoDataMap} // Pass the transformed Map
        />
      )}
    </div>
  );
};

export default APIMonitoringPage;