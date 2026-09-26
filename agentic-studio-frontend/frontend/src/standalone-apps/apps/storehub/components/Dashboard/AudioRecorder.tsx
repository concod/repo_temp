import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { pspService } from "../../services/PspStoreHubService";

interface AudioRecorderProps {
  onTranscribe: (data: string) => void;
}

const AudioRecorder = ({ onTranscribe }: AudioRecorderProps) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const waveformRef = useRef<number[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [barCount, setBarCount] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const BAR_WIDTH = 4;
  const BAR_GAP = 2;

  const startAudioAnalysis = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 512;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const animate = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Waveform calculation
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      const level = Math.min(Math.max(rms * 4, 0.15), 1);

      // Shift waveform left
      if (waveformRef.current.length) {
        waveformRef.current.shift();
        waveformRef.current.push(level);
      }

      // Render waveform
      if (waveRef.current) {
        const bars = waveRef.current.children;

        waveformRef.current.forEach((v, i) => {
          const bar = bars[i] as HTMLElement;
          if (bar) {
            bar.style.transform = `scaleY(${v})`;
          }
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    analyserRef.current?.disconnect();
    audioContextRef.current?.close();

    analyserRef.current = null;
    audioContextRef.current = null;
  };

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      startAudioAnalysis(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch {
      toast.error("Enable mic access");
      onTranscribe("");
    }
  }, [onTranscribe]);

  const cancelAudioRecording = () => {
    audioChunksRef.current = [];
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      onTranscribe("");
    };

    mediaRecorderRef.current.stop();
    stopAudioAnalysis();
  };

  const generateAudioTranscription = async () => {
    if (!mediaRecorderRef.current) return;

    setIsTranscribing(true);

    mediaRecorderRef.current.onstop = async () => {
      const wavBlob = new Blob(audioChunksRef.current, {
        type: "audio/wav",
      });

      audioChunksRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      try {
        const transcription: string = await pspService.getAudioTranscription(
          wavBlob
        );
        onTranscribe(transcription);
      } catch {
        toast.error("Something went wrong");
        onTranscribe("");
      } finally {
        setIsTranscribing(false);
      }
    };

    mediaRecorderRef.current.stop();
    stopAudioAnalysis();
  };

  useEffect(() => {
    startAudioRecording();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [startAudioRecording]);

  useEffect(() => {
    if (!waveRef.current) return;

    const rect = waveRef.current.getBoundingClientRect();
    const count = Math.floor(rect.width / (BAR_WIDTH + BAR_GAP));

    setBarCount(count);
    waveformRef.current = Array(count).fill(0.2);
  }, []);

  return (
    <div className="audio-container">
      <div className="audio-record-indicator">
        <div className="wave" ref={waveRef}>
          {Array.from({ length: barCount }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
      <motion.button
        onClick={cancelAudioRecording}
        className="audio-cancel"
        disabled={isTranscribing}
      >
        <i className="fa-solid fa-x"></i>
      </motion.button>
      <motion.button
        className="audio-transcribe"
        onClick={generateAudioTranscription}
        disabled={isTranscribing}
      >
        {isTranscribing ? (
          <div className="spinner" style={{ width: "16px", height: "16px" }} />
        ) : (
          <i className="fa-solid fa-check"></i>
        )}
      </motion.button>
    </div>
  );
};

export default AudioRecorder;
