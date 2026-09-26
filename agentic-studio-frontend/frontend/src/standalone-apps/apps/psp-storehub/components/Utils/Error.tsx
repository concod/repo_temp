import "./Error.scss";

interface ErrorProps {
  message?: string;
}

function Error({ message = "Something went wrong" }: ErrorProps) {
  return (
    <div className="psp-error">
      <div className="psp-error__content">
        <i className="fa-solid fa-triangle-exclamation psp-error__icon"></i>
        <p className="psp-error__message">{message}</p>
      </div>
    </div>
  );
}

export default Error;