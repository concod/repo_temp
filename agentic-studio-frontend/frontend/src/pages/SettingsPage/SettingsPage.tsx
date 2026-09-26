import React from 'react';
import { PageHeader } from '../../components/Header';
import AuthService from '../../services/authService';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const userInfo = AuthService.getUserInfo();
  const navigate = useNavigate();
  return (
    <div className="settings-page">
      <PageHeader 
        title="Settings"
        description="Manage your account, company details, and subscription."
        onSearch={() => {}} // No search functionality needed for settings
        onResetSearch={() => {}} // No search functionality needed for settings
        buttons={[]} // No action buttons needed for settings
        showSearchBar={false} // Hide search bar for settings page
        showResetButton={false} // Hide reset button for settings page
      />
      
      <div className="settings-page__content">
        <div className="settings-page__account-info">
          <h2 className="settings-page__account-info-title">Account Information</h2>
          
          <div className="settings-page__boxes">
            {/* Account Details Box */}
            <div className="settings-page__box">
              <div className="settings-page__box-item">
                <h3 className="settings-page__box-item-title">Company name</h3>
                <p className="settings-page__box-item-value">YourCompany Inc.</p>
                <button className="settings-page__box-item-action">Edit profile</button>
              </div>
              
              <div className="settings-page__box-item">
                <h3 className="settings-page__box-item-title">Email</h3>
                <p className="settings-page__box-item-value" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '90%'
                }}>{userInfo?.email}</p>
                <button className="settings-page__box-item-action">Edit profile</button>
              </div>
              
              <div className="settings-page__box-item">
                <h3 className="settings-page__box-item-title">Subscription</h3>
                <p className="settings-page__box-item-value">Your current plan : <span className="plan-highlight">Pro plan</span></p>
                <button className="settings-page__box-item-action">Manage subscription</button>
              </div>
            </div>
            
            {/* API & Preferences Box */}
            <div className="settings-page__box">
              <div className="settings-page__box-item">
                <h3 className="settings-page__box-item-title">API Keys & Integrations</h3>
                <p className="settings-page__box-item-value">Manage connections to external services.</p>
                <button className="settings-page__box-item-action" onClick={() => navigate('/api-keys')}>Manage Integrations</button>
              </div>
              
              <div className="settings-page__box-item">
                <h3 className="settings-page__box-item-title">Preferences</h3>
                <p className="settings-page__box-item-value">Theme : <span className="theme-highlight">Default (system)</span></p>
                <button className="settings-page__box-item-action">Save preferences</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
