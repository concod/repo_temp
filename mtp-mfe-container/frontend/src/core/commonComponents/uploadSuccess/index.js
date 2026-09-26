import "./style.scss";

const UploadSuccess = ({ children }) => {
  return (
    <div className="upload-success">
      <div className="success-checkmark">
        <div className="check-icon">
          <span className="icon-line line-tip" />
          <span className="icon-line line-long" />
          <div className="icon-circle" />
          <div className="icon-fix" />
        </div>
      </div>
      {children}
    </div>
  );
};

export default UploadSuccess;
