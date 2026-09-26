import React, { useState, useRef, useEffect } from 'react';
import { useReports } from '../../hooks/useReports';
import { PageHeader } from '../../components/Header';
import type { LogEntry } from '../../types/api';
import { DateRangePicker } from '../../components/DatePicker';

// Log Details Modal Component
interface LogDetailsModalProps {
  log: LogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

const LogDetailsModal: React.FC<LogDetailsModalProps> = ({ log, isOpen, onClose }) => {
  if (!isOpen || !log) return null;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const parseResponse = (responseString: string) => {
    try {
      const parsed = JSON.parse(responseString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return responseString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log Details</h2>
          <button className="close-modal" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="log-detail-section">
            <h3>Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Execution ID:</strong>
                <span className="execution-id">{log.execution_id}</span>
              </div>
              <div className="detail-item">
                <strong>Timestamp:</strong>
                <span className="timestamp">{formatTimestamp(log.timestamp)}</span>
              </div>
              <div className="detail-item">
                <strong>Agent:</strong>
                <span className="agent-name">{log.agent_name}</span>
              </div>
              <div className="detail-item">
                <strong>Session ID:</strong>
                <span className="session-id">{log.session_id}</span>
              </div>
              <div className="detail-item">
                <strong>User:</strong>
                <span className="user-email">{log.user || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <strong>Execution Time:</strong>
                <span className="execution-time">{log.execution_time_seconds?.toFixed(2)}s</span>
              </div>
              <div className="detail-item">
                <strong>IP Address:</strong>
                <span>{log.ip_address}</span>
              </div>
            </div>
          </div>

          <div className="log-detail-section">
            <h3>User Input</h3>
            <div className="code-block">
              <pre>{log.user_input}</pre>
            </div>
          </div>

          <div className="log-detail-section">
            <h3>Response</h3>
            <div className="code-block">
              <pre>{parseResponse(log.response)}</pre>
            </div>
          </div>

          <div className="log-detail-section">
            <h3>Technical Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Method:</strong>
                <span>{log.method}</span>
              </div>
              <div className="detail-item">
                <strong>Endpoint:</strong>
                <span className="endpoint">{log.endpoint}</span>
              </div>
              <div className="detail-item">
                <strong>User Agent:</strong>
                <span className="user-agent">{log.user_agent}</span>
              </div>
              <div className="detail-item">
                <strong>Created At:</strong>
                <span>{formatTimestamp(log.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportsPage: React.FC = () => {
  const {
    // Data
    logs,
    stats,
    agentNames,
    
    // Pagination
    total,
    currentPage,
    limit,
    
    // Filters
    fromDate,
    toDate,
    selectedAgent,
    
    // Loading states
    isLoadingLogs,
    isLoadingStats,
    isLoadingAgents,
    
    // Error states
    logsError,
    statsError,
    
    // Actions
    setDateRange,
    setSelectedAgent,
    applyFilters,
    clearFilters,
    goToNextPage,
    goToPrevPage,
  } = useReports();

  // Modal state
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const handleViewLog = (log: LogEntry) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  // Handle click outside to close date picker (match APIMonitoringPage behavior)
  useEffect(() => {
    if (!isDatePickerOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePickerOpen]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="reports">
      <PageHeader 
        title="Reports"
        description="Generate and view reports on agent performance and usage."
        onSearch={() => {}} // No search functionality needed for reports
        onResetSearch={() => {}} // No search functionality needed for reports
        buttons={[]} // No action buttons needed for reports
        showSearchBar={false} // Hide search bar for reports page
        showResetButton={false} // Hide reset button for reports page
      />

      <div className="reports-content">
        {/* Filters Section */}
        <div className="reports-filters">
          <div className="reports-filters__group">
            <label htmlFor="agent-select">Agent:</label>
            <select
              id="agent-select"
              className="reports-filters__select"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={isLoadingAgents}
            >
              <option value="">All Agents</option>
              {agentNames.map((agentName: string) => (
                <option key={agentName} value={agentName}>
                  {agentName}
                </option>
              ))}
            </select>
          </div>
          <div className="reports-filters__actions">
            <div className="reports-filters__date-inline" style={{ position: 'relative', marginRight: 12 }} ref={pickerRef}>
              <button
                type="button"
                className="reports-filters__input reports-filters__date-button"
                onClick={() => setIsDatePickerOpen(prev => !prev)}
                disabled={isLoadingLogs}
              >
                <span>{fromDate} - {toDate}</span>
                <span style={{ marginLeft: 8, opacity: 0.6 }}>📅</span>
              </button>

              {isDatePickerOpen && (
                <DateRangePicker
                  open={isDatePickerOpen}
                  onClose={() => setIsDatePickerOpen(false)}
                  onDone={(start: Date | null, end: Date | null) => {
                    if (start && end) {
                      const startFormatted = start.toISOString().split('T')[0];
                      const endFormatted = end.toISOString().split('T')[0];
                      setDateRange(startFormatted, endFormatted);
                      applyFilters();
                      setIsDatePickerOpen(false);
                    }
                  }}
                />
              )}
            </div>

            <button
              className="reports-filters__btn reports-filters__btn--primary"
              onClick={applyFilters}
              disabled={isLoadingLogs || isLoadingStats}
            >
              Apply Filters
            </button>
            <button
              className="reports-filters__btn reports-filters__btn--secondary"
              onClick={clearFilters}
              disabled={isLoadingLogs || isLoadingStats}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="reports-stats">
          <div className="reports-stats__card">
            <h3 className="reports-stats__card-title">Total Executions</h3>
            <div className="reports-stats__card-value">
              {isLoadingStats ? (
                <div className="loading"></div>
              ) : statsError ? (
                <span className="error">Error</span>
              ) : (
                <span className="value">{stats?.total_executions?.toLocaleString() || 0}</span>
              )}
            </div>
          </div>
          <div className="reports-stats__card">
            <h3 className="reports-stats__card-title">Unique Sessions</h3>
            <div className="reports-stats__card-value">
              {isLoadingStats ? (
                <div className="loading"></div>
              ) : statsError ? (
                <span className="error">Error</span>
              ) : (
                <span className="value">{stats?.unique_sessions?.toLocaleString() || 0}</span>
              )}
            </div>
          </div>
          <div className="reports-stats__card">
            <h3 className="reports-stats__card-title">Unique Agents</h3>
            <div className="reports-stats__card-value">
              {isLoadingStats ? (
                <div className="loading"></div>
              ) : statsError ? (
                <span className="error">Error</span>
              ) : (
                <span className="value">{stats?.unique_agents?.toLocaleString() || 0}</span>
              )}
            </div>
          </div>
          <div className="reports-stats__card">
            <h3 className="reports-stats__card-title">Avg Execution Time</h3>
            <div className="reports-stats__card-value">
              {isLoadingStats ? (
                <div className="loading"></div>
              ) : statsError ? (
                <span className="error">Error</span>
              ) : (
                <span className="value">{stats?.avg_execution_time?.toFixed(1) || 0}s</span>
              )}
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="reports-logs">
          <div className="reports-logs__header">
            <h2 className="reports-logs__header-title">Agent Execution Logs</h2>
            <div className="reports-logs__header-info">
              <span>
                Showing {logs.length > 0 ? (currentPage - 1) * limit + 1 : 0} to{' '}
                {Math.min(currentPage * limit, total)} of {total.toLocaleString()} results
              </span>
            </div>
          </div>

          <div className="reports-logs__table-container">
            <table className="reports-logs__table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Agent Name</th>
                  <th>Session ID</th>
                  <th>User</th>
                  <th>User Input</th>
                  <th>Execution Time</th>
                  <th>IP Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={8} className="reports-logs__table-loading">
                      <div className="reports-logs__table-loading-content">
                        <div className="loading"></div>
                        <span>Loading logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : logsError ? (
                  <tr>
                    <td colSpan={8} className="reports-logs__table-error">
                      <div className="reports-logs__table-error-content">
                        <span>Error loading logs: {logsError}</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="reports-logs__table-empty">
                      <div className="reports-logs__table-empty-content">
                        <span>No logs found for the selected filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log: LogEntry) => (
                    <tr key={log.id}>
                      <td className="reports-logs__table-timestamp">{formatTimestamp(log.timestamp)}</td>
                      <td className="reports-logs__table-agent">{log.agent_name}</td>
                      <td className="reports-logs__table-session">{log.session_id}</td>
                      <td className="reports-logs__table-user">{log.user || ''}</td>
                      <td className="reports-logs__table-input" title={log.user_input}>
                        {truncateText(log.user_input, 50)}
                      </td>
                      <td className="reports-logs__table-time">{log.execution_time_seconds?.toFixed(2)}s</td>
                      <td>{log.ip_address}</td>
                      <td>
                        <button
                          className="reports-logs__table-btn"
                          onClick={() => handleViewLog(log)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="reports-logs__pagination">
            <button
              className="reports-filters__btn reports-filters__btn--secondary"
              onClick={goToPrevPage}
              disabled={currentPage <= 1 || isLoadingLogs}
            >
              Previous
            </button>
            <span className="reports-logs__pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="reports-filters__btn reports-filters__btn--secondary"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages || isLoadingLogs}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Log Details Modal */}
      <LogDetailsModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default ReportsPage;
