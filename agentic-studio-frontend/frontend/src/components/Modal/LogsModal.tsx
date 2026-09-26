import React from 'react';
import type { LogEntry } from '../../types/api';

interface LogsModalProps {
  onClose: () => void;
  title: string;
  logs: LogEntry[] | undefined | null;
}

const LogsModal: React.FC<LogsModalProps> = ({ onClose, title, logs }) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="delete-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-modal" style={{ maxWidth: '800px', width: '90%', padding: '16px' }}>
        <div className="delete-modal__close" onClick={onClose} style={{ cursor: 'pointer' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 style={{ marginTop: 0 }}>{title}</h2>

        <div style={{ maxHeight: '60vh', overflow: 'auto', marginTop: 12 }}>
          {logs && logs.length > 0 ? (
            logs.map((log, idx) => (
              <div key={idx} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(log.timestamp).toLocaleString()}</div>
                <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(log, null, 2)}</pre>
              </div>
            ))
          ) : (
            <div style={{ padding: 8 }}>No logs available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsModal;
