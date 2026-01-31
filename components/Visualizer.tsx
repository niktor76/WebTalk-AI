import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
  isTalking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive, isTalking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    // Smooth the volume for visualization
    let currentRadius = 50;
    const baseRadius = 50;
    
    const render = () => {
      // Interpolate radius based on volume (0-255)
      const targetRadius = baseRadius + (volume / 2); 
      currentRadius += (targetRadius - currentRadius) * 0.2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw Main Circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI);
      
      if (isActive) {
        if (isTalking) {
           // Agent Speaking: Blue/Cyan pulsing
           const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, currentRadius);
           gradient.addColorStop(0, '#3b82f6'); // Blue 500
           gradient.addColorStop(1, '#06b6d4'); // Cyan 500
           ctx.fillStyle = gradient;
           ctx.shadowBlur = 30;
           ctx.shadowColor = '#06b6d4';
        } else {
           // Listening (User Speaking/Silence): Green pulsing if loud, or just white ring
           const isUserSpeaking = volume > 20; 
           ctx.fillStyle = isUserSpeaking ? '#22c55e' : '#ffffff'; // Green or White
           ctx.shadowBlur = isUserSpeaking ? 20 : 10;
           ctx.shadowColor = isUserSpeaking ? '#22c55e' : '#ffffff';
        }
      } else {
         // Idle
         ctx.fillStyle = '#475569'; // Slate 600
         ctx.shadowBlur = 0;
      }
      
      ctx.fill();
      
      // Draw concentric ripples if talking
      if (isTalking && volume > 10) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, currentRadius + 20, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(6, 182, 212, ${Math.max(0, 0.5 - (volume/500))})`;
          ctx.lineWidth = 2;
          ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [volume, isActive, isTalking]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-64 h-64 md:w-96 md:h-96"
    />
  );
};

export default Visualizer;
