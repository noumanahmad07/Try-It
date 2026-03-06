import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, X, ChevronLeft, RefreshCw, Sparkles } from 'lucide-react';
import { Pose } from '@mediapipe/pose';
import * as drawingUtils from '@mediapipe/drawing_utils';
import { vibrate } from '../lib/utils';

interface CameraModeProps {
  onBack: () => void;
}

export default function CameraMode({ onBack }: CameraModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let pose: Pose | null = null;

    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 720, height: 1280 },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraReady(true);
        }
      } catch (err) {
        console.error(err);
        setError("Camera access denied. Please enable camera permissions.");
      }
    };

    const setupPose = () => {
      pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results) => {
        if (!canvasRef.current || !videoRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw video frame
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvasRef.current.width, 0);
        ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.restore();

        // Draw landmarks (optional, for debugging)
        // drawingUtils.drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS);
        // drawingUtils.drawLandmarks(ctx, results.poseLandmarks);

        // AR Overlay Logic would go here
        // For MVP, we show the camera feed with pose detection active
      });
    };

    setupCamera();
    setupPose();

    const processFrame = async () => {
      if (videoRef.current && pose && isCameraReady) {
        await pose.send({ image: videoRef.current });
      }
      requestAnimationFrame(processFrame);
    };

    if (isCameraReady) {
      processFrame();
    }

    return () => {
      stream?.getTracks().forEach(track => track.stop());
      pose?.close();
    };
  }, [isCameraReady]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera Feed */}
      <div className="relative flex-1 bg-neutral-900 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        <canvas
          ref={canvasRef}
          width={720}
          height={1280}
          className="w-full h-full object-cover mirror"
        />

        {/* Overlay UI */}
        <div className="absolute inset-0 flex flex-col pointer-events-none">
          <header className="p-6 flex items-center justify-between pointer-events-auto">
            <button onClick={() => { vibrate(); onBack(); }} className="p-2 bg-black/40 backdrop-blur-md rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Live AR</span>
            </div>
            <button className="p-2 bg-black/40 backdrop-blur-md rounded-full">
              <RefreshCw className="w-6 h-6" />
            </button>
          </header>

          <div className="flex-1 flex items-center justify-center">
            {!isCameraReady && !error && (
              <div className="text-center space-y-4">
                <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                <p className="text-gray-400">Starting camera...</p>
              </div>
            )}
            {error && (
              <div className="text-center px-12 space-y-4">
                <X className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-red-400">{error}</p>
                <button onClick={() => window.location.reload()} className="btn-secondary py-2 px-6">Retry</button>
              </div>
            )}
          </div>

          <footer className="p-12 flex flex-col items-center space-y-8 pointer-events-auto">
            <div className="flex space-x-6 overflow-x-auto pb-4 max-w-full no-scrollbar">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} className="w-16 h-16 rounded-2xl glass flex-shrink-0 border-2 border-transparent hover:border-indigo-500 transition-all overflow-hidden">
                  <img src={`https://picsum.photos/seed/cloth${i}/100/100`} className="w-full h-full object-cover" alt="Cloth" />
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => vibrate()}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform"
            >
              <div className="w-full h-full bg-white rounded-full" />
            </button>
          </footer>
        </div>
      </div>
      
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
