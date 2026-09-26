import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { IBAgentService } from "../../services/ibAgentService";

interface AudioRecorderProps {
  onTranscribe: (text: string) => void;
}

const ibAgentService = new IBAgentService();

const BAR_WIDTH = 4;
const BAR_GAP = 2;

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscribe }) => {
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
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = Math.min(Math.max(rms * 4, 0.15), 1);

      if (waveformRef.current.length) {
        waveformRef.current.shift();
        waveformRef.current.push(level);
      }

      if (waveRef.current) {
        const bars = waveRef.current.children;
        waveformRef.current.forEach((v, i) => {
          const bar = bars[i] as HTMLElement;
          if (bar) bar.style.transform = `scaleY(${v})`;
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
    analyserRef.current = null;
    audioContextRef.current?.close();
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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
    } catch {
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

  const submitTranscription = async () => {
    if (!mediaRecorderRef.current) return;

    setIsTranscribing(true);

    mediaRecorderRef.current.onstop = async () => {
      const wavBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      audioChunksRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;

      try {
        const text = await ibAgentService.getAudioTranscription(wavBlob);
        onTranscribe(text ?? "");
      } catch {
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
    <div className="ib-landing__audio-container">
      <div className="ib-landing__audio-record-indicator">
        <div className="ib-landing__audio-wave" ref={waveRef}>
          {Array.from({ length: barCount }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
      <motion.button
        type="button"
        onClick={cancelAudioRecording}
        className="ib-landing__audio-cancel"
        disabled={isTranscribing}
        aria-label="Cancel recording"
      >
        <i className="fa-solid fa-x" />
      </motion.button>
      <motion.button
        type="button"
        className="ib-landing__audio-submit"
        onClick={submitTranscription}
        disabled={isTranscribing}
        aria-label="Submit recording"
      >
        {isTranscribing ? (
          <span className="ib-landing__loader" aria-hidden />
        ) : (
          <i className="fa-solid fa-check" />
        )}
      </motion.button>
    </div>
  );
};
