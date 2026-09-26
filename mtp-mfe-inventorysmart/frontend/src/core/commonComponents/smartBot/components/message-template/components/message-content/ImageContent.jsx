import { TextRenderer } from "core/commonComponents/smartBot/components/TextRenderer";

const ImageContent = ({ bodyText }) => {
  const { gcs_uri, caption } = bodyText || {};

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
      }}
    >
      {gcs_uri && (
        <img
          src={gcs_uri}
          alt={caption || "Image"}
          style={{
            maxWidth: "100%",
            borderRadius: "8px",
            objectFit: "contain",
          }}
        />
      )}
      {caption && (
        <div>
          <TextRenderer text={caption} />
        </div>
      )}
    </div>
  );
};

export default ImageContent;
