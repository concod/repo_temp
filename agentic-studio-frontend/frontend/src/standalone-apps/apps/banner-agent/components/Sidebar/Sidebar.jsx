import { useEffect, useRef, useState } from 'react'
import './Sidebar.scss'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useBannerChatStore } from '../../store/chatStore'
import { useStandaloneCreativeConfig } from '../../../../shared/packages/marketingCreativeCore/provider'
import { useAssetUpload } from '../../hooks/useAssetUpload'

function Sidebar({ activeItem = 'Assets' }) {
    const navigate = useNavigate()
    const profileRef = useRef(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const { userName, userEmail, logout } = useAuthStore()
    const {
        branding: {
            createAssetButtonSrc,
            logoSrc,
            logoutIconSrc,
            sidebarNavItems,
        },
    } = useStandaloneCreativeConfig()

    const displayName = userName || 'Gerald Williams'
    const displayEmail = userEmail || 'williamsgerald@PSP.com'
    const displayInitial = (displayName?.trim()?.[0] || 'G').toUpperCase()

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (!profileRef.current) return
            if (!profileRef.current.contains(event.target)) {
                setIsProfileOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
        }
    }, [])

    const handleLogout = () => {
        useBannerChatStore.getState().clearAllSessions()
        logout()
        setIsProfileOpen(false)
        navigate('../login', { replace: true, relative: 'path' })
    }

    return (
        <aside className="assets-sidebar" aria-label="Assets navigation">
            <div className="assets-sidebar__top">
                <div className="assets-sidebar__logo">
                    <img src={logoSrc} alt="App logo" />
                </div>

                <UploadAssetButton />

                <nav className="assets-sidebar__nav">
                    {sidebarNavItems.map((item) => {
                        const isActive = item.label === activeItem
                        const iconSrc = isActive ? item.iconSelected : item.icon

                        return (
                            <button
                                key={item.label}
                                type="button"
                                className={`assets-sidebar__nav-item ${isActive ? 'is-active' : ''}`}
                                onClick={() => {
                                    if (!item.route) return
                                    navigate(item.route, { relative: 'path' })
                                }}
                                disabled={!item.route}
                            >
                                <span className="assets-sidebar__icon">
                                    <img src={iconSrc} alt="" aria-hidden="true" />
                                </span>
                                <span className="assets-sidebar__label">{item.label}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>

            <div className="assets-sidebar__bottom">
                {/* <button type="button" className="assets-sidebar__help">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M9.8 9.4a2.2 2.2 0 1 1 4.4 0c0 1.4-1.7 1.9-2.2 2.9" />
                        <circle cx="12" cy="16.6" r="0.7" />
                    </svg>
                    <span className="assets-sidebar__label">Help</span>
                </button> */}

                <div className="assets-sidebar__profile-wrap" ref={profileRef}>
                    {isProfileOpen ? (
                        <div className="assets-sidebar__profile-modal" role="dialog" aria-label="Profile options">
                            <div className="assets-sidebar__profile-summary">
                                <span className="assets-sidebar__avatar assets-sidebar__avatar--large">{displayInitial}</span>
                                <div>
                                    <p className="assets-sidebar__profile-name">{displayName}</p>
                                    <p className="assets-sidebar__profile-email">{displayEmail}</p>
                                </div>
                            </div>

                            <button type="button" className="assets-sidebar__logout" onClick={handleLogout}>
                                <img src={logoutIconSrc} alt="" aria-hidden="true" />
                                <span>Logout</span>
                            </button>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        className="assets-sidebar__profile"
                        onClick={() => setIsProfileOpen((prev) => !prev)}
                        aria-expanded={isProfileOpen}
                        aria-haspopup="dialog"
                    >
                        <span className="assets-sidebar__avatar">{displayInitial}</span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 10l5 5 5-5" />
                        </svg>
                    </button>
                </div>
            </div>
        </aside>
    )
}

function UploadAssetButton() {
    const { uploadState, error, triggerUpload } = useAssetUpload()
    const isUploading = uploadState === 'uploading'

    return (
        <button
            type="button"
            className="assets-sidebar__create-btn"
            onClick={triggerUpload}
            disabled={isUploading}
            title={error || undefined}
        >
            {isUploading ? (
                <span className="assets-sidebar__spinner" aria-hidden="true" />
            ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                        d="M8 12V3M8 3L4.5 6.5M8 3L11.5 6.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M2.5 13.5H13.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </svg>
            )}
            <span>{isUploading ? 'Uploading…' : 'Upload Asset'}</span>
        </button>
    )
}

export default Sidebar