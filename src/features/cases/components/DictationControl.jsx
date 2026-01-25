import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Play, Sparkles, Loader2, RotateCcw, Save, Settings, Plug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AudioVisualizer from './AudioVisualizer';
import DeviceSelector from './DeviceSelector';
import { userService } from '../../../services/userService';
import { useSpeechMike } from '../../../hooks/useSpeechMike';

const DictationControl = ({ onFinalReport }) => {
    const { t, i18n } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [fullTranscript, setFullTranscript] = useState('');
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [audioStream, setAudioStream] = useState(null);

    // We use a REF for the source of truth for "intention" to avoid race conditions
    const statusRef = useRef('idle'); // 'idle' | 'recording' | 'paused'
    const recognitionRef = useRef(null);
    const currentTranscriptRef = useRef('');

    // --- Hardware Integration (SpeechMike) ---
    // We define these helpers first so hook can use them
    const toggleRecording = () => {
        if (statusRef.current === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const { connect: connectMic, isConnected: isMicConnected } = useSpeechMike({
        onRecord: toggleRecording
    });
    // -----------------------------------------

    // Load microphone preference on mount
    useEffect(() => {
        const loadPreference = async () => {
            const savedMicId = await userService.getMicrophonePreference();
            if (savedMicId) {
                console.log("Restoring microphone preference:", savedMicId);
                setSelectedDeviceId(savedMicId);
            }
        };
        loadPreference();

        // DEBUG: Listen for global keydown to check for SpeechMike Keyboard Mode
        const handleKeyDown = (e) => {
            console.log("Key Pressed:", e.code, e.key, e.keyCode);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleDeviceChange = (deviceId) => {
        setSelectedDeviceId(deviceId);
        userService.saveMicrophonePreference(deviceId);
    };

    // Helper for real-time formatting
    const processRealTimeFormatting = (text) => {
        if (!text) return '';
        return text
            .replace(/ nueva línea/gi, '\n')
            .replace(/ nuevo párrafo/gi, '\n\n')
            .replace(/ punto/gi, '.')
            .replace(/ coma/gi, ',');
    };

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = i18n.language.startsWith('en') ? 'en-US' : 'es-ES';

        recognitionRef.current.onresult = (event) => {
            let sessionTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
                sessionTranscript += event.results[i][0].transcript;
            }
            setCurrentTranscript(sessionTranscript);
            currentTranscriptRef.current = sessionTranscript;
        };

        recognitionRef.current.onerror = (event) => {
            if (event.error !== 'no-speech') {
                console.error("Speech Recognition Error:", event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    statusRef.current = 'idle';
                    setIsRecording(false);
                    setIsPaused(false);
                    stopAudioStream();
                    alert("Error in speech recognition: " + event.error);
                }
            }
        };

        recognitionRef.current.onend = () => {
            if (currentTranscriptRef.current) {
                const formattedSegment = processRealTimeFormatting(currentTranscriptRef.current);
                setFullTranscript(prev => (prev + (prev ? ' ' : '') + formattedSegment).trim());
                setCurrentTranscript('');
                currentTranscriptRef.current = '';
            }
            if (statusRef.current === 'recording') {
                try {
                    recognitionRef.current.start();
                } catch (e) { }
            }
        };

        return () => {
            statusRef.current = 'idle';
            if (recognitionRef.current) recognitionRef.current.stop();
            stopAudioStream();
        };
    }, [i18n.language]);

    const stopAudioStream = () => {
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }
    };

    const startAudioStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
                }
            });
            setAudioStream(stream);
            return stream;
        } catch (err) {
            console.error("Error accessing microphone:", err);
            return null;
        }
    };

    // Audio Capture Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        if (statusRef.current === 'recording') return;

        // Ensure stream is active
        let stream = audioStream;
        if (!stream) {
            stream = await startAudioStream();
        }
        if (!stream) return; // Failed to get stream

        statusRef.current = 'recording';
        setIsRecording(true);
        setIsPaused(false);

        // Start Speech Recognition (Visual Feedback)
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error("Start error:", e);
        }

        // Start Audio Recording (Source of Truth)
        try {
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.start(1000); // Collect chunks every second
        } catch (err) {
            console.error("MediaRecorder error:", err);
            // Fallback: We continue with just text if audio fails, 
            // but we might want to alert the user? 
            // For now, silent fallback to text-only mode logic (existing)
        }
    };

    const pauseRecording = () => {
        statusRef.current = 'paused';

        // Stop Speech Recognition
        if (recognitionRef.current) recognitionRef.current.stop();

        // Stop Media Recorder (but keep chunks)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // We DO NOT stop the audio stream here if we want instant resume? 
        // But the previous logic was stopAudioStream(). 
        // To be consistent with "Stop" behavior in this app (releasing mic), we stop it.
        stopAudioStream();

        setIsRecording(false);
        setIsPaused(true);
    };

    const stopRecording = () => {
        statusRef.current = 'idle';

        if (recognitionRef.current) recognitionRef.current.stop();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        stopAudioStream();
        setIsRecording(false);
        setIsPaused(false);
    };

    const handlePauseResume = () => {
        if (isPaused) {
            startRecording();
        } else {
            pauseRecording();
        }
    };

    const handleFinalize = async () => {
        const finalContent = (fullTranscript + (fullTranscript && currentTranscript ? ' ' : '') + currentTranscript).trim();
        // Allow finalize even if text is empty, as long as we have audio?
        // But for safety, let's assume we want at least *some* audio or text.
        const hasAudio = audioChunksRef.current.length > 0;

        if (!finalContent && !hasAudio) return;

        setIsProcessing(true);
        try {
            let audioBase64 = null;
            if (hasAudio) {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result); // This includes data:audio/webm;base64,...
                    reader.readAsDataURL(blob);
                });
            }

            // Pass both text (fallback/context) and audio (source) to parent
            await onFinalReport(finalContent, audioBase64);
        } catch (error) {
            console.error("Error finalizing report:", error);
            alert(t('training.workspace.aiError'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        if (window.confirm(t('dictation.resetConfirm'))) {
            statusRef.current = 'idle';
            setFullTranscript('');
            setCurrentTranscript('');
            currentTranscriptRef.current = '';

            // Clear Audio
            audioChunksRef.current = [];

            setIsPaused(false);
            setIsRecording(false);
            stopAudioStream();
            if (recognitionRef.current) recognitionRef.current.stop();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        }
    };

    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-xs text-red-300">
                {t('dictation.notSupported')}
            </div>
        );
    }

    return (
        <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-gray-600'}`}></div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center">
                        <Mic className="w-4 h-4 mr-2 text-indigo-400" />
                        {t('dictation.title')}
                    </h3>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Hardware Connect Button */}
                    <button
                        onClick={connectMic}
                        className={`p-2 rounded-lg transition-all ${isMicConnected ? 'text-green-400 bg-green-900/20' : 'text-gray-500 hover:text-white hover:bg-gray-700'}`}
                        title={isMicConnected ? t('dictation.micConnected') : t('dictation.connectMic')}
                    >
                        <Plug size={18} />
                    </button>

                    <DeviceSelector
                        selectedDeviceId={selectedDeviceId}
                        onDeviceChange={handleDeviceChange}
                    />
                    {(fullTranscript || currentTranscript) && (
                        <button
                            onClick={handleReset}
                            className="text-gray-500 hover:text-gray-300 transition-colors"
                            title={t('dictation.resetHint')}
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Visualizer Area */}
            {isRecording && audioStream && (
                <div className="overflow-hidden rounded-lg">
                    <AudioVisualizer stream={audioStream} isRecording={isRecording} />
                </div>
            )}

            {/* Transcript Area */}
            <div className="relative">
                <textarea
                    value={fullTranscript}
                    onChange={(e) => setFullTranscript(e.target.value)}
                    className="w-full min-h-[150px] max-h-[300px] p-4 bg-black/40 rounded-xl border border-gray-700/30 font-serif leading-relaxed text-gray-200 text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-y scroll-smooth"
                    placeholder={isRecording ? "" : t('dictation.placeholder')}
                />

                {/* Empty State Overlay */}
                {!fullTranscript && !currentTranscript && !isRecording && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <Mic size={48} className="text-gray-600" />
                    </div>
                )}

                {/* Interim/Live Result Overlay (Small badge or bottom text) */}
                {isRecording && currentTranscript && (
                    <div className="absolute bottom-3 left-3 right-3 p-2 bg-indigo-900/40 backdrop-blur-sm rounded-lg border border-indigo-500/20 text-indigo-200 text-xs italic animate-in fade-in slide-in-from-bottom-1">
                        <span className="font-bold mr-2">{t('dictation.heard')}</span>
                        {currentTranscript}
                        <span className="inline-block w-1 h-3 bg-indigo-500 ml-1 animate-pulse"></span>
                    </div>
                )}

                {isRecording && !currentTranscript && (
                    <div className="absolute bottom-3 left-3 text-[10px] text-gray-500 uppercase tracking-widest flex items-center">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 animate-pulse" />
                        {t('dictation.listening')}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex flex-col space-y-3">
                <div className="flex space-x-2">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`flex-1 flex items-center justify-center py-4 rounded-xl font-bold transition-all duration-300 shadow-xl ${isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                            : isPaused
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                            }`}
                    >
                        {isRecording ? (
                            <>
                                <Square className="w-5 h-5 mr-3 fill-white" />
                                {t('dictation.buttons.stop')}
                            </>
                        ) : isPaused ? (
                            <>
                                <Square className="w-5 h-5 mr-3 fill-white" />
                                {t('dictation.buttons.finalizeSession')}
                            </>
                        ) : (
                            <>
                                <Mic className="w-5 h-5 mr-3" />
                                {t('dictation.buttons.start')}
                            </>
                        )}
                    </button>

                    {(isRecording || isPaused) && (
                        <button
                            onClick={handlePauseResume}
                            className={`flex-[0.4] flex items-center justify-center py-4 rounded-xl font-bold transition-all duration-300 shadow-xl border ${isPaused
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent'
                                : 'bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {isPaused ? <Mic className="w-5 h-5" /> : (
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-4 bg-current rounded-sm" />
                                    <div className="w-1.5 h-4 bg-current rounded-sm" />
                                </div>
                            )}
                        </button>
                    )}
                </div>

                {(fullTranscript || currentTranscript) && !isRecording && !isPaused && (
                    <button
                        onClick={handleFinalize}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all duration-300 disabled:opacity-50 shadow-lg shadow-purple-500/20"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('dictation.buttons.polishing')}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
                                {t('dictation.buttons.generateReport')}
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="flex justify-between items-center pt-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                    PACS AI Dictation v2.0
                </p>
                {selectedDeviceId && (
                    <p className="text-[10px] text-gray-600 truncate max-w-[150px]">
                        Mic: {selectedDeviceId.slice(0, 8)}...
                    </p>
                )}
            </div>
        </div>
    );
};

export default DictationControl;
