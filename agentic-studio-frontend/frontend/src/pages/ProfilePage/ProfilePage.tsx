import React from 'react';
import { PageHeader } from '../../components/Header';
import AuthService from '../../services/authService';
// import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const userInfo = AuthService.getUserInfo();
  // const navigate = useNavigate();
  return (
    <div className="profile-page">
      <PageHeader 
        title="Profile"
        description="Manage your account, company details, and subscription."
        onSearch={() => {}} // No search functionality needed for profile
        onResetSearch={() => {}} // No search functionality needed for profile
        buttons={[]} // No action buttons needed for profile
        showSearchBar={false} // Hide search bar for profile page
        showResetButton={false} // Hide reset button for profile page
      />
      
      <div className="profile-page__content">
        <div className="profile-page__account-info">
          <h2 className="profile-page__account-info-title">Profile Information</h2>
          
          <div className="profile-page__boxes">
            {/* Account Details Box */}
            <div className="profile-page__box">
              <div className="profile-page__box-item">
                <h3 className="profile-page__box-item-title">Name</h3>
                <p className="profile-page__box-item-value">{userInfo?.name}</p>
                <button className="profile-page__box-item-action">Edit profile</button>
              </div>
              
              <div className="profile-page__box-item">
                <h3 className="profile-page__box-item-title">Email</h3>
                <p className="profile-page__box-item-value" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '90%'
                }}>{userInfo?.email}</p>
                <button className="profile-page__box-item-action">Edit profile</button>
              </div>
              
              <div className="profile-page__box-item">
                <h3 className="profile-page__box-item-title">Subscription</h3>
                <p className="profile-page__box-item-value">Your current plan : <span className="plan-highlight">Pro plan</span></p>
                <button className="profile-page__box-item-action">Manage subscription</button>
              </div>
            </div>
            
            {/* API & Preferences Box */}
            {/* <div className="profile-page__box">
              <div className="profile-page__box-item">
                <h3 className="profile-page__box-item-title">API Keys & Integrations</h3>
                <p className="profile-page__box-item-value">Manage connections to external services.</p>
                <button className="profile-page__box-item-action" onClick={() => navigate('/api-keys')}>Manage Integrations</button>
              </div>
              
              <div className="profile-page__box-item">
                <h3 className="profile-page__box-item-title">Preferences</h3>
                <p className="profile-page__box-item-value">Theme : <span className="theme-highlight">Default (system)</span></p>
                <button className="profile-page__box-item-action">Save preferences</button>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
