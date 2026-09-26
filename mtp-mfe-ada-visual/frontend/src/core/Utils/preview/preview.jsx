import { useEffect, useState } from "react";

/**
 * Preview is a component which can be used to
 * display the preview of image/video/audio
 * @param {object} props
 * @returns
 */
export const Preview = (props) => {
  const { file, type } = props;
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setPreview(file);
  }, []);

  return (
    <div>
      {preview ? (
        type === "image" ? (
          <img src={preview} alt="preview" width="135px" height="43px" />
        ) : type === "video" ? (
          <video width="400" controls>
            <source src={preview} type="video/mp4" />
          </video>
        ) : type === "audio" ? (
          <audio controls>
            <source src={preview} type="audio/mpeg" />
          </audio>
        ) : (
          "Loading..."
        )
      ) : (
        "Loading..."
      )}
    </div>
  );
};
