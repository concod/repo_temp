import React, { useState, useEffect } from 'react';
import type { GeoLocationData } from '../../types/api';
import '../../styles/components/ip-details-modal.scss';

interface IPDetailsModalProps {
  onClose: () => void;
  country: string;
  ips: string[];
  geoDataMap: Map<string, GeoLocationData>;
}

const IPDetailsModal: React.FC<IPDetailsModalProps> = ({ 
  onClose, 
  country, 
  ips, 
  geoDataMap 
}) => {
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [selectedGeoData, setSelectedGeoData] = useState<GeoLocationData | null>(null);

  useEffect(() => {
    if (ips.length > 0 && !selectedIP) {
      setSelectedIP(ips[0]);
    }
  }, [ips, selectedIP]);

  useEffect(() => {
    if (selectedIP) {
      const geoData = geoDataMap.get(selectedIP);
      setSelectedGeoData(geoData || null);
    }
  }, [selectedIP, geoDataMap]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleIPClick = (ip: string) => {
    setSelectedIP(ip);
  };

  return (
    <div className="delete-modal-overlay" onClick={handleOverlayClick}>
      <div className="ip-details-modal">
        <div className="ip-details-modal__close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h2 className="ip-details-modal__header">IP Details for {country}</h2>
        
        <div className="ip-details-modal__content">
          {/* IP List */}
          <div className="ip-details-modal__ip-list">
            <h3 className="ip-details-modal__ip-list-header">IP Addresses ({ips.length})</h3>
            <div className="ip-details-modal__ip-list-container">
              {ips.map((ip, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleIPClick(ip)}
                  className={`ip-details-modal__ip-list-item ${selectedIP === ip ? 'ip-details-modal__ip-list-item--selected' : ''}`}
                >
                  <div>{ip}</div>
                  {geoDataMap.get(ip)?.city && (
                    <div className="ip-details-modal__ip-list-item-location">
                      {geoDataMap.get(ip)?.city}, {geoDataMap.get(ip)?.region}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* IP Details and Map */}
          <div className="ip-details-modal__details">
            {selectedGeoData ? (
              <div className="ip-details-modal__details-container">
                <h3 className="ip-details-modal__details-header">Location Details</h3>
                <div className="ip-details-modal__details-info">
                  <div className="ip-details-modal__details-info-item"><strong>IP:</strong> {selectedGeoData.ip}</div>
                  {selectedGeoData.city && <div className="ip-details-modal__details-info-item"><strong>City:</strong> {selectedGeoData.city}</div>}
                  {selectedGeoData.region && <div className="ip-details-modal__details-info-item"><strong>Region:</strong> {selectedGeoData.region}</div>}
                  {selectedGeoData.country && <div className="ip-details-modal__details-info-item"><strong>Country:</strong> {selectedGeoData.country}</div>}
                  {selectedGeoData.org && <div className="ip-details-modal__details-info-item"><strong>Organization:</strong> {selectedGeoData.org}</div>}
                  {selectedGeoData.loc && <div className="ip-details-modal__details-info-item"><strong>Coordinates:</strong> {selectedGeoData.loc}</div>}
                </div>
                
                {selectedGeoData.map_url ? (
                  <div>
                    <h3>Location Map</h3>
                    <div className="ip-details-modal__details-map">
                      <iframe
                        width="100%"
                        height="300"
                        frameBorder="0"
                        src={selectedGeoData.map_url}
                        allowFullScreen
                        title="Location Map"
                      ></iframe>
                    </div>
                  </div>
                ) : (
                  <div>No location data available for map display</div>
                )}
              </div>
            ) : (
              <div className="ip-details-modal__details-placeholder">
                Select an IP address to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPDetailsModal;