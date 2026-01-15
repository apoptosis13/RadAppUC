import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, Trophy, Play, XCircle, AlertCircle } from 'lucide-react';
import Confetti from 'react-confetti';
import { statsService } from '../../../services/statsService';
import { useAuth } from '../../../context/AuthContext';
import IdentifyMode from './IdentifyMode';
import LocateMode from './LocateMode';

const QUESTIONS_PER_ROUND = 10;
const TIME_LIMIT = 30; // seconds

const AnatomyQuiz = ({ module, onClose, onViewerUpdate, userClickTrigger }) => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const currentLang = i18n.language;

    // Game State
    const [gameState, setGameState] = useState('start'); // start, playing, summary
    const [gameMode, setGameMode] = useState(null); // 'identify', 'locate'
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
    const [feedback, setFeedback] = useState(null); // { type: 'correct' | 'wrong', message: '' }

    // Stats
    const [correctCount, setCorrectCount] = useState(0);

    const timerRef = useRef(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // --- GAME LOOP ---

    // State for full list of structures (for autocomplete pool)
    const [allModuleStructures, setAllModuleStructures] = useState([]);

    const startGame = (mode) => {
        console.log("Starting Game Mode:", mode);
        // Flatten all structures from all series/images
        let allStructures = [];
        const isSeriesMode = module.series && module.series.length > 0;

        if (isSeriesMode) {
            // 1. From series structures
            module.series.forEach(s => {
                if (s.structures) {
                    // Only add structures that HAVE LOCATIONS defined
                    const validStructures = s.structures.filter(st => st.locations && Object.keys(st.locations).length > 0);
                    allStructures.push(...validStructures);
                }
            });
        } else {
            // 2. From stand-alone image annotations (Legacy)
            if (module.annotations) allStructures.push(...module.annotations);
        }

        // Dedup by ID
        const unique = Array.from(new Map(allStructures.map(item => [item.id, item])).values());

        // Filter out items without proper labels
        const validItems = unique.filter(s => s.label && s.label.trim().length > 0);

        // Store full pool for autocomplete
        setAllModuleStructures(validItems);

        // Group by Label to avoid duplicates in the same round (e.g. "Femur" appearing twice)
        const itemsByLabel = {};
        validItems.forEach(item => {
            const label = (currentLang === 'en' && item.labelEn) ? item.labelEn : item.label;
            if (!itemsByLabel[label]) {
                itemsByLabel[label] = [];
            }
            itemsByLabel[label].push(item);
        });

        const uniqueLabels = Object.keys(itemsByLabel);

        if (uniqueLabels.length < 5) {
            alert(t('quiz.notEnoughData', 'No hay suficientes estructuras para un quiz.'));
            return;
        }

        // Shuffle Labels and pick 10 unique labels
        const shuffledLabels = uniqueLabels.sort(() => 0.5 - Math.random()).slice(0, QUESTIONS_PER_ROUND);

        // For each selected label, pick one random instance (e.g. specific slice)
        const selectedQuestions = shuffledLabels.map(label => {
            const instances = itemsByLabel[label];
            // Pick random instance for this label
            return instances[Math.floor(Math.random() * instances.length)];
        });

        console.log("Quiz Questions Generated:", selectedQuestions.length, selectedQuestions);

        setQuestions(selectedQuestions);
        setGameMode(mode);
        setCurrentIndex(0);
        setScore(0);
        setCorrectCount(0);
        setGameState('playing');
        setFeedback(null);
        isProcessing.current = false;
        startTimer();
    };

    const startTimer = () => {
        setTimeLeft(TIME_LIMIT);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeOut = () => {
        console.log("Timeout triggered");
        clearInterval(timerRef.current);
        handleAnswer(false, null, true); // timeOut = true
    };

    // --- INTERACTION HANDLING ---

    // Effect: Update Viewer based on current question
    useEffect(() => {
        if (gameState !== 'playing') {
            // Reset viewer to normal
            onViewerUpdate({
                controlledSelection: false,
                selectedId: null,
                hideLabels: false,
                dimUnselected: false
            });
            return;
        };

        // SAFETY CHECK: If we somehow get out of bounds, end the game immediately
        if (!questions[currentIndex]) {
            console.error("Quiz Index Out of Bounds (Safety Trigger) - Index:", currentIndex, "Length:", questions.length);
            endGame(score, correctCount);
            return;
        }

        const currentQ = questions[currentIndex];
        console.log(`Showing Question ${currentIndex + 1}/${questions.length}:`, currentQ.id);

        if (gameMode === 'identify') {
            // Find a series/slice where this structure exists
            let targetSlice = null;
            let targetSeriesId = null;

            if (currentQ.locations) {
                // Search in current active series first if possible, or any series
                const seriesIds = Object.keys(module.series || {}).map(k => module.series[k].id);
                for (const sId of seriesIds) {
                    const series = module.series.find(s => s.id === sId);
                    if (series?.structures) {
                        const struct = series.structures.find(s => s.id === currentQ.id);
                        if (struct?.locations) {
                            const slices = Object.keys(struct.locations).map(Number);
                            if (slices.length > 0) {
                                targetSlice = slices[0];
                                targetSeriesId = sId;
                                break;
                            }
                        }
                    }
                }
            }

            onViewerUpdate({
                controlledSelection: true,
                selectedId: currentQ.id, // Highlight the target
                hideLabels: true, // Hide answer
                forceSlice: targetSlice,
                forceSeriesId: targetSeriesId,
                isHighIntensity: true,
                dimUnselected: true // Isolate target structure
            });
        } else if (gameMode === 'locate') {
            // NEW: Auto-switch sequence for Locate Mode too
            let targetSeriesId = null;
            if (currentQ.locations) {
                const seriesIds = Object.keys(module.series || {}).map(k => module.series[k].id);
                for (const sId of seriesIds) {
                    const series = module.series.find(s => s.id === sId);
                    if (series?.structures) {
                        const struct = series.structures.find(s => s.id === currentQ.id);
                        if (struct?.locations && Object.keys(struct.locations).length > 0) {
                            targetSeriesId = sId;
                            break;
                        }
                    }
                }
            }

            onViewerUpdate({
                controlledSelection: true,
                selectedId: null, // Nothing highlighted initially
                hideLabels: true, // Hide labels
                forceSeriesId: targetSeriesId // Switch to correct plane!
            });
        }
    }, [gameState, gameMode, currentIndex, questions, onViewerUpdate]);

    // Effect: Listen for Locate Mode Clicks
    useEffect(() => {
        if (gameState === 'playing' && gameMode === 'locate' && userClickTrigger && !feedback) {
            // User clicked something in Locate mode!
            const targetId = questions[currentIndex]?.id;
            const clickedId = userClickTrigger.id;
            console.log("Locate Click - Target:", targetId, "Clicked:", clickedId);

            const isCorrect = clickedId === targetId;
            handleAnswer(isCorrect);
        }
    }, [userClickTrigger]); // Triggered when parent updates this prop


    const isProcessing = useRef(false);

    const handleAnswer = (isCorrect, textInput = null, isTimeOut = false) => {
        if (isProcessing.current) return; // Prevent double submission
        isProcessing.current = true;
        console.log("Answer Received:", isCorrect, "TimeOut:", isTimeOut);

        if (timerRef.current) clearInterval(timerRef.current);

        let points = 0;
        let finalScore = score;
        let finalCorrect = correctCount;

        if (isCorrect) {
            // Base 100 + Time Bonus (Max 30)
            points = 100 + timeLeft;
            finalScore += points;
            finalCorrect += 1;

            setScore(finalScore);
            setCorrectCount(finalCorrect);
            setFeedback({ type: 'correct', message: t('quiz.correct', '¡Correcto!') + ` +${points} pts` });
        } else {
            const correctLabel = questions[currentIndex]?.label || '???';
            const message = isTimeOut
                ? t('quiz.timeOut', '¡Tiempo Agotado!')
                : t('quiz.incorrect', 'Incorrecto. Era: ') + correctLabel;

            setFeedback({ type: 'wrong', message });

            // Should we show the correct answer?
            if (gameMode === 'locate' && !isTimeOut) {
                // Determine logic to show correct answer on map? 
                // Maybe flash it.
                onViewerUpdate({
                    controlledSelection: true,
                    selectedId: questions[currentIndex].id,
                    hideLabels: false
                });
            }
        }

        // Wait then Next
        setTimeout(() => {
            console.log("Advancing... Current Index was:", currentIndex);
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(p => {
                    console.log("Setting Index to:", p + 1);
                    return p + 1;
                });
                setFeedback(null);
                // Timer will be restarted by useEffect (if logic moved there) OR manually here.
                // Since useEffect depends on currentIndex, do we start timer there? 
                // StartTimer relies on updated state. 
                // Better to start it here after state update or in effect.
                // Let's call startTimer directly but maybe with slight delay or let effect handle it?
                // Actually startTimer resets state, it is safe.
                startTimer();
                isProcessing.current = false; // Release lock for next question
            } else {
                console.log("End of Game Reached");
                endGame(finalScore, finalCorrect);
                // Lock remains true to prevent post-game interaction until restart
            }
        }, 2000);
    };

    const endGame = async (finalScore, finalCorrect) => {
        console.log("Game Ended. Score:", finalScore, "Correct:", finalCorrect);
        setGameState('summary');
        if (timerRef.current) clearInterval(timerRef.current);

        // Save Score
        if (user) {
            try {
                await statsService.saveAnatomyScore(user.uid, module.id, {
                    score: finalScore,
                    totalQuestions: QUESTIONS_PER_ROUND,
                    correctCount: finalCorrect,
                    mode: gameMode,
                    timeSpent: QUESTIONS_PER_ROUND * TIME_LIMIT, // Approximation or track real time
                    moduleTitle: module.title
                });

                // --- LOG ACTIVITY FOR ANALYTICS ---
                try {
                    await activityLogService.logActivity('COMPLETE_ANATOMY_QUIZ', {
                        moduleId: module.id,
                        moduleTitle: module.title,
                        score: finalScore,
                        correctCount: finalCorrect,
                        totalQuestions: QUESTIONS_PER_ROUND,
                        mode: gameMode
                    });
                } catch (logErr) {
                    console.error("Failed to log quiz activity", logErr);
                }
                // ----------------------------------
            } catch (e) {
                console.error("Failed to save score", e);
            }
        }
    };

    // --- RENDERERS ---

    if (gameState === 'start') {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center">
                    <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">{t('quiz.anatomyChallenge', 'Desafío de Anatomía')}</h2>
                    <p className="text-gray-400 mb-8">{t('quiz.chooseMode', 'Selecciona tu modo de juego')}</p>

                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => startGame('identify')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-bold text-lg flex items-center justify-center transition-transform hover:scale-105"
                        >
                            <AlertCircle className="w-6 h-6 mr-3" />
                            {t('quiz.modeIdentify', 'Identificar Estructura')}
                            <span className="ml-2 text-xs font-normal text-indigo-200 bg-indigo-800 px-2 py-1 rounded">¿Qué es esto?</span>
                        </button>
                        <button
                            onClick={() => startGame('locate')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl font-bold text-lg flex items-center justify-center transition-transform hover:scale-105"
                        >
                            <Play className="w-6 h-6 mr-3" />
                            {t('quiz.modeLocate', 'Localizar Estructura')}
                            <span className="ml-2 text-xs font-normal text-emerald-200 bg-emerald-800 px-2 py-1 rounded">¿Dónde está...?</span>
                        </button>
                    </div>

                    <button onClick={onClose} className="mt-8 text-gray-500 hover:text-white underline text-sm">
                        {t('common.cancel', 'Cancelar')}
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'summary') {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in zoom-in-95">
                {score > 500 && <Confetti recycle={false} numberOfPieces={500} />}
                <div className="text-center">
                    <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-4xl font-extrabold text-white mb-2">{t('quiz.completed', '¡Quiz Completado!')}</h2>
                    <p className="text-xl text-gray-400 mb-8">
                        {gameMode === 'identify' ? 'Modo Identificación' : 'Modo Localización'}
                    </p>

                    <div className="grid grid-cols-2 gap-8 mb-10">
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-2">Puntaje</p>
                            <p className="text-5xl font-black text-indigo-400">{score}</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                            <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-2">Aciertos</p>
                            <p className="text-5xl font-black text-emerald-400">{correctCount}/{QUESTIONS_PER_ROUND}</p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => setGameState('start')}
                            className="bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors"
                        >
                            {t('quiz.playAgain', 'Jugar de Nuevo')}
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-transparent border border-gray-600 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
                        >
                            {t('common.exit', 'Salir')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // PLAYING State
    const currentQuestion = questions[currentIndex];

    // Recalculate target info for debug display (or store in state)
    let targetSeriesId = null;
    if (currentQuestion && currentQuestion.locations && module.series) {
        const seriesIds = Object.keys(module.series).map(k => module.series[k].id);
        for (const sId of seriesIds) {
            const series = module.series.find(s => s.id === sId);
            const struct = series.structures.find(s => s.id === currentQuestion.id);
            if (struct?.locations && Object.keys(struct.locations).length > 0) {
                targetSeriesId = sId;
                break;
            }
        }
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-6">
            {/* Top Bar: Timer & Score */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="flex space-x-3">
                    <div className="bg-gray-900/80 backdrop-blur text-white px-4 py-2 rounded-full font-mono font-bold text-xl border border-gray-700 flex items-center shadow-lg">
                        <Timer className={`w-5 h-5 mr-2 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`} />
                        <span className={timeLeft < 10 ? 'text-red-500' : ''}>{timeLeft}s</span>
                    </div>

                    <div className="bg-gray-900/80 backdrop-blur text-white px-4 py-2 rounded-full font-bold border border-gray-700 shadow-lg">
                        Score: <span className="text-yellow-400">{score}</span>
                    </div>
                </div>

                {/* DEBUG INFO */}
                {import.meta.env.DEV && (
                    <div className="bg-black/50 text-xs text-white px-2 py-1 rounded mx-2 flex flex-col">
                        <span>ID: {currentQuestion?.id} | Series: {targetSeriesId || 'N/A'}</span>
                        <span>Q: {currentIndex + 1} / {questions.length}</span>
                    </div>
                )}

                {/* Cancel Button */}
                <button
                    onClick={() => {
                        if (window.confirm(t('quiz.confirmExit', '¿Seguro que quieres salir? Perderás tu progreso.'))) {
                            onClose();
                        }
                    }}
                    className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-colors shadow-lg"
                    title={t('common.cancel', 'Cancelar')}
                >
                    <XCircle className="w-6 h-6" />
                </button>
            </div>

            {/* Middle Feedback Toast */}
            {feedback && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className={`
                        px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center animate-in zoom-in duration-300
                        ${feedback.type === 'correct' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}
                    `}>
                        {feedback.type === 'correct' ? <CheckCircleIcon className="w-12 h-12 mb-2" /> : <XCircleIcon className="w-12 h-12 mb-2" />}
                        <span className="text-2xl font-black">{feedback.message}</span>
                    </div>
                </div>
            )}

            {/* Bottom Interaction Area */}
            <div className="flex justify-center pb-8 pointer-events-auto">
                {gameMode === 'identify' ? (
                    <IdentifyMode
                        currentStructure={currentQuestion}
                        allStructures={allModuleStructures} // Use full pool for autocomplete
                        onAnswer={(isCorrect, ans) => handleAnswer(isCorrect, ans)}
                        disabled={!!feedback}
                    />
                ) : (
                    <LocateMode
                        currentStructure={currentQuestion}
                    />
                )}
            </div>
        </div>
    );
};

// Simple Icons for Toast
const CheckCircleIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
const XCircleIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
);

export default AnatomyQuiz;
