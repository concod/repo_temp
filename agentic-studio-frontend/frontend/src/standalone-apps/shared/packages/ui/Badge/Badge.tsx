import "./Badge.scss";

export interface BadgeProps {
  className?: string;
  text: string;
}

export const Badge = ({ className = "", text }: BadgeProps) => {
  return (
    <div className={`ui-badge ${className}`}>
      {text && <span className="ui-badge__text">{text}</span>}
    </div>
  );
};
