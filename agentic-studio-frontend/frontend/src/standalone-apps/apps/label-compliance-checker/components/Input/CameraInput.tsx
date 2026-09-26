import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const useCanFlipCamera = (stream: MediaStream | null) => {
  const [canFlip, setCanFlip] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const updateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");

        setCanFlip(videoInputs.length > 1);
      } catch {
        setCanFlip(false);
      }
    };

    updateDevices();
  }, [stream]);

  return canFlip;
};

const CameraInput = ({
  setUploadedFile,
  closeModal,
}: {
  setUploadedFile: React.Dispatch<React.SetStateAction<File | null>>;
  closeModal: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  useEffect(() => {
    let isMounted = true;
    const videoRefElement = videoRef.current;

    const startCamera = async () => {
      try {
        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        });

        // Only set the stream if component is still mounted
        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Force video to load
          videoRef.current.load();
        }
      } catch {
        if (isMounted) {
          toast.error("Enable camera access");
          closeModal();
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRefElement) {
        videoRefElement.srcObject = null;
      }
    };
  }, [closeModal, facingMode]);

  const canFlip = useCanFlipCamera(streamRef.current);

  const handleVideoPlaying = () => {
    // Extra safety: verify video is actually ready
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      setIsVideoReady(true);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video dimensions not ready");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
    }

    setImageSrc(canvas.toDataURL("image/jpeg"));

    streamRef.current?.getTracks().forEach((track) => track.stop());
  };

  const retakePhoto = async () => {
    setImageSrc(null);
    setIsVideoReady(false);

    // Clean up old stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
      });

      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.load();
      }
    } catch {
      toast.error("Failed to restart camera");
    }
  };

  const flipCamera = async () => {
    setIsVideoReady(false);

    // Stop current stream
    streamRef.current?.getTracks().forEach((track) => track.stop());

    // Toggle camera
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const proceed = async () => {
    if (!imageSrc || !canvasRef.current) return;

    try {
      // Convert canvas to blob using Promise
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob(resolve, "image/jpeg");
      });

      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        setUploadedFile(file);
      }
    } catch (error) {
      console.error("Error converting image to file:", error);
      toast.error("Failed to process image");
    } finally {
      // Clean up
      streamRef.current?.getTracks().forEach((track) => track.stop());
      closeModal();
    }
  };

  return (
    <>
      <button
        className="close"
        onClick={() => {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          closeModal();
        }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
      {!imageSrc ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onPlaying={handleVideoPlaying}
          />
          {!isVideoReady && (
            <div className="camera-loading">Initializing Camera...</div>
          )}
          <button
            className="capture-btn"
            onClick={capturePhoto}
            disabled={!isVideoReady}
          >
            <i className="fa fa-camera" />
          </button>
          {canFlip && (
            <button className="flip-camera" onClick={flipCamera}>
              <i className="fa-solid fa-camera-rotate" />
            </button>
          )}
        </>
      ) : (
        <>
          <img src={imageSrc} alt="Captured" className="preview" />

          <div className="actions">
            <button className="retake" onClick={retakePhoto}>
              <i className="fa fa-rotate-left" /> Retake
            </button>

            <button className="proceed" onClick={proceed}>
              <i className="fa fa-check" /> Proceed
            </button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} hidden />
    </>
  );
};

export default CameraInput;
