
type Props = {
  className: string;
  imageUrl: string;
  imageClassName?: string;
  imageAlt?: string;
};

const Badge = ({
    className,
    imageUrl,
    imageClassName,
    imageAlt,
}: Props) => {
  return (
    <div className={className}>
        <img src={imageUrl} alt={imageAlt} className={imageClassName} />
    </div>
  )
}

export default Badge