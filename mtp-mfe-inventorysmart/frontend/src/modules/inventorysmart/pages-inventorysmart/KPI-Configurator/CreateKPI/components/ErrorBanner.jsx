import CloseIcon from "../../../../../../assets/closeIcon.svg";

import globalStyles from "core/Styles/globalStyles";

const ErrorBanner = ({ errors, onClose }) => {
    const globalClasses = globalStyles();

    return (
        <div className={`formula-canvas-error-banner ${globalClasses.marginAuto}`}>
            <span className="formula-canvas-error-icon">×</span>
            <div className="formula-canvas-error-text">
                {errors[0]}
            </div>
            <div className={globalClasses.cursorPointer}>
                <CloseIcon fontSize="small" onClick={onClose} />
            </div>
        </div>
    )
}

export default ErrorBanner;