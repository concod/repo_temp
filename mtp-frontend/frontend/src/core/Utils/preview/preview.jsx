import { useEffect, useState } from "react";
import { giveBackFileType } from "../functions/utils";
import ExcelImage from "assets/excelImage.png";

/**
 * Preview is a component which can be used to
 * display the preview of image/video/audio
 * @param {object} props
 * @returns
 */
export const Preview = (props) => {
  const [fileType, setFileType] = useState(null);
  const { file, type } = props;
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setPreview(file);
    setFileType(giveBackFileType(type));
  }, []);

  return (
    <div>
      {preview ? (
        fileType === "image" ? (
          <img src={preview} alt="preview" width="135px" height="43px" />
        ) : fileType === "video" ? (
          <video width="400" controls>
            <source src={preview} type="video/mp4" />
          </video>
        ) : fileType === "audio" ? (
          <audio controls>
            <source src={preview} type="audio/mpeg" />
          </audio>
        ) : fileType === "excel" ? (
          <img src={ExcelImage} alt="preview" width="135px" height="43px" />
        ) : (
          "Loading..."
        )
      ) : (
        "Loading..."
      )}
    </div>
  );
};
