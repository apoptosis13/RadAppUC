import React, { useRef, useEffect } from 'react';

const AudioVisualizer = ({ stream, isRecording }) => {
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!stream || !isRecording) {
            // Cleanup if stopped
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Setup Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioCtx = audioContextRef.current;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgb(20, 20, 30)'; // Dark background matching theme
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                // Gradient color
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#818cf8'); // Indigo-400
                gradient.addColorStop(1, '#4f46e5'); // Indigo-600

                ctx.fillStyle = gradient;

                // Draw rounded bars? Just rects for now
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            // Do not close AudioContext immediately as it might be reused or cause lag, 
            // but we should probably handle simple disconnect.
        };
    }, [stream, isRecording]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={60}
            className="w-full h-16 rounded-lg bg-gray-900/50 border border-gray-700/50"
        />
    );
};

export default AudioVisualizer;
