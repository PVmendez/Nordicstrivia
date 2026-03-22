import React, { useState, useEffect, useCallback } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { patterns } from '../../data/mockData';
import Rosco from './Rosco';
import QuestionCard from './QuestionCard';
import PhaseResultScreen from './PhaseResultScreen';
import GlobalScoreBoard from '../GlobalScoreBoard';
import { FaMicrophone, FaChartBar } from 'react-icons/fa';
import '../../styles/phases/PasapalabrasGame.css';

const PasapalabrasGame = ({ teams, players, onPhaseComplete }) => {
  const { updatePhaseScore, finishPhase, startPhase } = useTournament();
  
  // Asegurar que solo hay 2 equipos
  let gameTeams = teams;
  if (!gameTeams || !Array.isArray(gameTeams) || gameTeams.length === 0) {
    const savedGameState = localStorage.getItem('nordicPasapalabrasGame');
    if (savedGameState) {
      try {
        const state = JSON.parse(savedGameState);
        if (state.teams && Array.isArray(state.teams)) {
          gameTeams = state.teams;
        }
      } catch (error) {
        console.error('Error al recuperar equipos de localStorage:', error);
      }
    }
  }

  // Only use the first 2 patterns
  const availablePatterns = [patterns[0], patterns[1]];
  
  // Función para obtener estado inicial del juego
  const getInitialGameState = () => {
    const savedGameState = localStorage.getItem('nordicPasapalabrasGame');
    if (savedGameState) {
      try {
        const state = JSON.parse(savedGameState);
        return state;
      } catch (error) {
        console.error('Error al recuperar estado del juego:', error);
      }
    }
    
    const teamScores = {};
    const patternLettersPerTeam = {};
    const currentLetterIndexPerTeam = {};
    const teamTimers = {};
    const INITIAL_TIME = 400; // 6 minutos
    
    if (gameTeams && Array.isArray(gameTeams)) {
      gameTeams.forEach((team, index) => {
        teamScores[team.id] = { correct: 0, incorrect: 0, total: 0 };
        currentLetterIndexPerTeam[team.id] = 0;
        teamTimers[team.id] = INITIAL_TIME;
        // Assign a different pattern to each team (only the first 2)
        const patternIndex = Math.min(index, availablePatterns.length - 1);
        patternLettersPerTeam[team.id] = availablePatterns[patternIndex].map(item => ({ ...item, status: 'pending' }));
      });
    }

    return {
      patternLettersPerTeam: patternLettersPerTeam,
      currentLetterIndexPerTeam: currentLetterIndexPerTeam,
      currentTeamIndex: 0,
      teamScores: teamScores,
      teamTimers: teamTimers,
      passedLetters: [],
      gameFinished: false,
      showScoreBoard: false,
      incorrectAnswers: [],
      teams: gameTeams
    };
  };

  const initialState = getInitialGameState();
  
  const [currentTeamIndex, setCurrentTeamIndex] = useState(initialState.currentTeamIndex);
  const [patternLettersPerTeam, setPatternLettersPerTeam] = useState(initialState.patternLettersPerTeam);
  const [currentLetterIndexPerTeam, setCurrentLetterIndexPerTeam] = useState(initialState.currentLetterIndexPerTeam);
  const [teamScores, setTeamScores] = useState(initialState.teamScores);
  const [teamTimers, setTeamTimers] = useState(initialState.teamTimers);
  const [gameFinished, setGameFinished] = useState(initialState.gameFinished);
  const [showScoreBoard, setShowScoreBoard] = useState(initialState.showScoreBoard);
  const [passedLetters, setPassedLetters] = useState(initialState.passedLetters);
  const [incorrectAnswers, setIncorrectAnswers] = useState(initialState.incorrectAnswers || []);
  const [gameTeamsState] = useState(initialState.teams || gameTeams);

  const currentTeam = gameTeamsState[currentTeamIndex];
  const currentLetterIndex = currentTeam?.id ? currentLetterIndexPerTeam[currentTeam.id] : 0;
  const currentPattern = currentTeam?.id ? patternLettersPerTeam[currentTeam.id] : null;
  const currentLetter = currentPattern ? currentPattern[currentLetterIndex] : null;

  // Inicializar la fase cuando el componente se monta
  useEffect(() => {
    startPhase(1);
  }, [startPhase]);

  // Save game state to localStorage when it changes
  useEffect(() => {
    const gameState = {
      patternLettersPerTeam,
      currentLetterIndexPerTeam,
      currentTeamIndex,
      teamScores,
      teamTimers,
      passedLetters,
      gameFinished,
      showScoreBoard,
      teams: gameTeamsState,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('nordicPasapalabrasGame', JSON.stringify(gameState));
  }, [patternLettersPerTeam, currentLetterIndexPerTeam, currentTeamIndex, teamScores, teamTimers, passedLetters, gameFinished, showScoreBoard, gameTeamsState]);

  // Timer per team
  useEffect(() => {
    if (gameFinished || !gameTeamsState[currentTeamIndex]?.id) return;

    const timer = setInterval(() => {
      setTeamTimers((prevTimers) => {
        const newTimers = { ...prevTimers };
        const currentTeamId = gameTeamsState[currentTeamIndex]?.id;
        
        if (currentTeamId && newTimers[currentTeamId] > 0) {
          newTimers[currentTeamId] -= 1;
          
          if (newTimers[currentTeamId] === 0) {
            // When time runs out, switch to next team that has time
            setTimeout(() => {
              setCurrentTeamIndex((prev) => {
                let nextIndex = (prev + 1) % gameTeamsState.length;
                // If next team has no time, skip to the other
                if (newTimers[gameTeamsState[nextIndex].id] === 0) {
                  nextIndex = (nextIndex + 1) % gameTeamsState.length;
                }
                return nextIndex;
              });
            }, 500);
          }
        }
        return newTimers;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTeamIndex, gameTeamsState, gameFinished]);

  // Validate if there are pending letters
  const hasPendingLetters = useCallback(() => {
    if (!patternLettersPerTeam || Object.keys(patternLettersPerTeam).length === 0) return false;
    
    return Object.values(patternLettersPerTeam).some(pattern => 
      pattern.some(letter => letter.status === 'pending')
    );
  }, [patternLettersPerTeam]);

  // Handle correct answer
  const handleCorrectAnswer = () => {
    if (!currentPattern || !currentTeam) return;
    if (teamTimers[currentTeam.id] === 0) return;
    
    const newPatternLettersPerTeam = { ...patternLettersPerTeam };
    const newPattern = [...currentPattern];
    newPattern[currentLetterIndex].status = 'correct';
    newPatternLettersPerTeam[currentTeam.id] = newPattern;
    setPatternLettersPerTeam(newPatternLettersPerTeam);

    const newScores = { ...teamScores };
    if (currentTeam && currentTeam.id) {
      newScores[currentTeam.id].correct += 1;
      newScores[currentTeam.id].total += 10;
      setTeamScores(newScores);
    }

    moveToNextLetter();
  };

  // Handle incorrect answer
  const handleIncorrectAnswer = (answerData) => {
    if (!currentPattern || !currentTeam) return;
    if (teamTimers[currentTeam.id] === 0) return;
    
    // If answer information comes, save it
    if (answerData) {
      setIncorrectAnswers([...incorrectAnswers, {
        ...answerData,
        teamId: currentTeam.id,
        teamName: currentTeam.name
      }]);
    }
    
    const newPatternLettersPerTeam = { ...patternLettersPerTeam };
    const newPattern = [...currentPattern];
    newPattern[currentLetterIndex].status = 'incorrect';
    newPatternLettersPerTeam[currentTeam.id] = newPattern;
    setPatternLettersPerTeam(newPatternLettersPerTeam);

    const newScores = { ...teamScores };
    if (currentTeam && currentTeam.id) {
      newScores[currentTeam.id].incorrect += 1;
      setTeamScores(newScores);
    }

    let nextIndex = (currentLetterIndex + 1) % newPattern.length;
    let attempts = 0;
    while (newPattern[nextIndex].status !== 'pending' && attempts < newPattern.length) {
      nextIndex = (nextIndex + 1) % newPattern.length;
      attempts++;
    }

    if (newPattern[nextIndex].status === 'pending') {
      const newLetterIndexPerTeam = { ...currentLetterIndexPerTeam };
      newLetterIndexPerTeam[currentTeam.id] = nextIndex;
      setCurrentLetterIndexPerTeam(newLetterIndexPerTeam);
    }

    // Switch to next team
    let nextTeamIndex = (currentTeamIndex + 1) % gameTeamsState.length;
    // If next team has no time, skip to the other
    if (teamTimers[gameTeamsState[nextTeamIndex].id] === 0) {
      nextTeamIndex = (nextTeamIndex + 1) % gameTeamsState.length;
    }
    setCurrentTeamIndex(nextTeamIndex);
  };

  // Handle pass word
  const handlePassWord = () => {
    if (!currentPattern || !currentTeam) return;
    if (teamTimers[currentTeam.id] === 0) return;
    
    const newPatternLettersPerTeam = { ...patternLettersPerTeam };
    const newPattern = [...currentPattern];
    newPattern[currentLetterIndex].status = 'pending';
    newPatternLettersPerTeam[currentTeam.id] = newPattern;
    setPatternLettersPerTeam(newPatternLettersPerTeam);

    if (!passedLetters.includes(currentLetterIndex)) {
      setPassedLetters([...passedLetters, currentLetterIndex]);
    }

    let nextIndex = (currentLetterIndex + 1) % newPattern.length;
    let attempts = 0;
    while (newPattern[nextIndex].status !== 'pending' && attempts < newPattern.length) {
      nextIndex = (nextIndex + 1) % newPattern.length;
      attempts++;
    }

    if (newPattern[nextIndex].status === 'pending') {
      const newLetterIndexPerTeam = { ...currentLetterIndexPerTeam };
      newLetterIndexPerTeam[currentTeam.id] = nextIndex;
      setCurrentLetterIndexPerTeam(newLetterIndexPerTeam);
    }

    // Switch to next team
    let nextTeamIndex = (currentTeamIndex + 1) % gameTeamsState.length;
    // If next team has no time, skip to the other
    if (teamTimers[gameTeamsState[nextTeamIndex].id] === 0) {
      nextTeamIndex = (nextTeamIndex + 1) % gameTeamsState.length;
    }
    setCurrentTeamIndex(nextTeamIndex);
  };

  // Move to next letter
  const moveToNextLetter = () => {
    if (!currentPattern || !currentTeam) return;
    
    let nextIndex = (currentLetterIndex + 1) % currentPattern.length;
    let attempts = 0;

    while (currentPattern[nextIndex].status !== 'pending' && attempts < currentPattern.length) {
      nextIndex = (nextIndex + 1) % currentPattern.length;
      attempts++;
    }

    if (currentPattern[nextIndex].status === 'pending') {
      const newLetterIndexPerTeam = { ...currentLetterIndexPerTeam };
      newLetterIndexPerTeam[currentTeam.id] = nextIndex;
      setCurrentLetterIndexPerTeam(newLetterIndexPerTeam);
    }
  };

  const finishGameLogic = useCallback(() => {
    if (!hasPendingLetters()) {
      // Async function to wait for updates
      const distributePointsAndFinish = async () => {
        // Find winning team
        let winningTeamId = null;
        let maxPoints = -1;
        
        Object.entries(teamScores).forEach(([teamId, score]) => {
          if (score.total > maxPoints) {
            maxPoints = score.total;
            winningTeamId = parseInt(teamId);
          }
        });

        const winningTeam = gameTeamsState.find(t => t.id === winningTeamId);
        const winningScore = teamScores[winningTeamId];

        // Divide points among winning team players
        const pointsPerPlayer = Math.floor(winningScore.total / winningTeam.players.length);

        console.log(`Team ${winningTeam.name} won with ${winningScore.total} points`);
        console.log(`Points per player: ${pointsPerPlayer}`);

        // Update score for each winning player and wait
        const updatePromises = winningTeam.players.map(player =>
          updatePhaseScore(player.id, pointsPerPlayer)
        );
        
        try {
          // Wait for all updates to complete
          await Promise.all(updatePromises);
          console.log('✅ All points have been synced with Firebase');
        } catch (error) {
          console.error('❌ Error syncing points:', error);
        }

        setGameFinished(true);
      };

      distributePointsAndFinish();
    }
  }, [hasPendingLetters, teamScores, gameTeamsState, updatePhaseScore]);

  // Effect to check if both teams ran out of time
  useEffect(() => {
    if (gameTeamsState.length > 0 && Object.values(teamTimers).every(t => t === 0)) {
      setGameFinished(true);
    }
  }, [teamTimers, gameTeamsState]);

  // Effect to check if game finished
  useEffect(() => {
    if (!hasPendingLetters()) {
      finishGameLogic();
    }
  }, [patternLettersPerTeam, hasPendingLetters, finishGameLogic]);

  if (!gameTeamsState || gameTeamsState.length === 0) {
    return <div className="loading-screen">Loading teams...</div>;
  }

  if (!currentTeam) {
    return <div className="loading-screen">Loading teams...</div>;
  }

  if (gameFinished) {
    return (
      <>
        <PhaseResultScreen
          teamScores={teamScores}
          teams={gameTeamsState}
          players={players}
          phase={1}
          incorrectAnswers={incorrectAnswers}
          onContinue={() => {
            localStorage.removeItem('nordicPasapalabrasGame');
            if (onPhaseComplete) {
              onPhaseComplete();
            } else {
              finishPhase();
            }
          }}
        />
        {showScoreBoard && <GlobalScoreBoard />}
      </>
    );
  }

  return (
    <div className="pasapalabras-game">
      <div className="game-header">
        <h1><FaMicrophone /> PASAPALABRAS - Fase 1</h1>
        <button 
          className="btn-scoreboard"
          onClick={() => setShowScoreBoard(!showScoreBoard)}
        >
          <FaChartBar /> {showScoreBoard ? 'Ocultar' : 'Ver'} Puntuación
        </button>
      </div>

      {showScoreBoard && <GlobalScoreBoard />}

      <div className="game-layout">
        <div className="rosco-section">
          <Rosco 
            letters={currentPattern || []} 
            currentIndex={currentLetterIndex}
          />
        </div>

        <div className="question-section">
          <div className="player-indicator">
            <div className="player-name">
              Turno de: <span>{currentTeam?.name || 'Cargando...'}</span>
            </div>
            <div className="player-score">
              Puntos del Equipo: {currentTeam?.id && teamScores[currentTeam.id] ? teamScores[currentTeam.id].total : 0}
            </div>
            <div className={`timer ${currentTeam?.id && teamTimers[currentTeam.id] <= 30 ? 'warning' : ''}`}>
              ⏱️ {currentTeam?.id && teamTimers[currentTeam.id] !== undefined ? `${Math.floor(teamTimers[currentTeam.id] / 60)}:${(teamTimers[currentTeam.id] % 60).toString().padStart(2, '0')}` : '0:00'}
            </div>
          </div>

          {currentTeam?.id && teamTimers[currentTeam.id] === 0 ? (
            <div className="time-expired-message">
              <h2>¡Tiempo agotado!</h2>
              <p>El equipo {currentTeam.name} terminó</p>
              <p>Esperando al otro equipo...</p>
            </div>
          ) : currentLetter && (
            <QuestionCard
              letter={currentLetter.letter}
              question={currentLetter.question}
              correctAnswer={currentLetter.answer}
              onAnswerCorrect={handleCorrectAnswer}
              onAnswerIncorrect={handleIncorrectAnswer}
              onPass={handlePassWord}
              disabled={currentTeam?.id && teamTimers[currentTeam.id] === 0}
            />
          )}

          <div className="game-stats">
            <div className="stat">
              <span>Pending:</span>
              <strong>{currentPattern ? currentPattern.filter(l => l.status === 'pending').length : 0}</strong>
            </div>
            <div className="stat">
              <span>Correct:</span>
              <strong>{currentPattern ? currentPattern.filter(l => l.status === 'correct').length : 0}</strong>
            </div>
            <div className="stat">
              <span>Failed:</span>
              <strong>{currentPattern ? currentPattern.filter(l => l.status === 'incorrect').length : 0}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="players-scores-mini">
        <h3>Puntuación Actual</h3>
        {gameTeamsState.map(team => (
          <div key={team.id} className="player-score-item">
            <span>{team.name}</span>
            <span className="score">{teamScores[team.id].total} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasapalabrasGame;
