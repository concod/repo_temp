import React from 'react'
import './AvatarHeader.scss'
import avatarImage from '../../../../../assets/images/avatar.svg'

function AvatarHeader() {
    return (
        <div className="avatar-header" aria-hidden="true">
            <div className="avatar-header__ring">
                <img src={avatarImage} alt="" className="avatar-header__image" />
            </div>
        </div>
    )
}

export default AvatarHeader