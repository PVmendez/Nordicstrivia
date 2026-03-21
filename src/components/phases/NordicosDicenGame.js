import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { nordicsSayThemes } from '../../data/mockData';
import PhaseResultScreen from './PhaseResultScreen';
import GlobalScoreBoard from '../GlobalScoreBoard';
import { FaChartBar, FaLightbulb } from 'react-icons/fa';
import '../../styles/phases/NordicosDicenGame.css';

const NordicosDicenGame = ({ players, onPhaseComplete }) => {
  const { finishPhase, updatePhaseScore, startPhase } = useTournament();

  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [currentPlayerTurnIndex, setCurrentPlayerTurnIndex] = useState(0);
  const [themeStartPlayerIndex, setThemeStartPlayerIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [gamePlayers] = useState(players || []);
  const [gameFinished, setGameFinished] = useState(false);
  const [showScoreBoard, setShowScoreBoard] = useState(false);

  // Inicializar la fase cuando el componente se monta
  useEffect(() => {
    startPhase(2);
  }, [startPhase]);
  const [playerScores, setPlayerScores] = useState(
    gamePlayers.reduce((acc, player) => {
      acc[player.id] = { correct: 0, total: 0 };
      return acc;
    }, {})
  );

  // Estado para los intentos por tema
  const [themeAttempts, setThemeAttempts] = useState(
    nordicsSayThemes.map(theme => ({
      themeId: theme.id,
      attempts: gamePlayers.map(player => ({
        playerId: player.id,
        answered: false,
        correct: false,
        guessedIndex: -1
      })),
      revealedPositions: new Set()
    }))
  );

  // Normalizar texto igual al pasapalabras
  const normalizeText = (text) => {
    if (!text) return '';
    let normalized = text.toLowerCase().trim();
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    normalized = normalized.replace(/[.,;:!?"'"-]/g, '');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
  };

  // Obtener el jugador actual
  const getCurrentPlayer = () => {
    return gamePlayers[currentPlayerTurnIndex % gamePlayers.length];
  };

  // Obtener el tema actual
  const getCurrentTheme = () => {
    return nordicsSayThemes[currentThemeIndex];
  };

  // Validar respuesta
  const validateAnswer = (userAnswer, themeIndex) => {
    const theme = nordicsSayThemes[themeIndex];
    const normalizedAnswer = normalizeText(userAnswer);

    for (let i = 0; i < theme.answers.length; i++) {
      const normalizedOption = normalizeText(theme.answers[i].name);
      if (normalizedAnswer === normalizedOption) {
        return { correct: true, position: i };
      }
    }

    return { correct: false, position: -1 };
  };

  // Manejar envío de respuesta
  const handleSubmit = () => {
    if (!answer.trim()) return;

    const result = validateAnswer(answer, currentThemeIndex);
    const currentPlayer = getCurrentPlayer();
    let themeComplete = false;

    if (result.correct) {
      const theme = getCurrentTheme();
      const points = theme.noPoints ? 0 : Math.round(theme.answers[result.position].percentage);

      // Actualizar puntuación del jugador
      setPlayerScores(prev => ({
        ...prev,
        [currentPlayer.id]: {
          ...prev[currentPlayer.id],
          correct: prev[currentPlayer.id].correct + 1,
          total: prev[currentPlayer.id].total + points
        }
      }));

      // Marcar como contestado
      setThemeAttempts(prev => {
        const updated = [...prev];
        const currentAttempt = updated[currentThemeIndex];
        const playerAttemptIndex = currentAttempt.attempts.findIndex(
          a => a.playerId === currentPlayer.id
        );
        if (playerAttemptIndex !== -1) {
          currentAttempt.attempts[playerAttemptIndex].answered = true;
          currentAttempt.attempts[playerAttemptIndex].correct = true;
          currentAttempt.attempts[playerAttemptIndex].guessedIndex = result.position;
          currentAttempt.revealedPositions.add(result.position);
        }
        // Verificar si todas las respuestas han sido reveladas
        themeComplete = currentAttempt.revealedPositions.size === 4;
        return updated;
      });
    } else {
      // Marcar como contestado pero incorrecto
      setThemeAttempts(prev => {
        const updated = [...prev];
        const currentAttempt = updated[currentThemeIndex];
        const playerAttemptIndex = currentAttempt.attempts.findIndex(
          a => a.playerId === currentPlayer.id
        );
        if (playerAttemptIndex !== -1) {
          currentAttempt.attempts[playerAttemptIndex].answered = true;
        }
        return updated;
      });
    }

    setAnswer('');

    // Pasar al siguiente jugador
    setTimeout(() => {
      if (themeComplete) {
        // Si todas las respuestas fueron adivinadas, pasar al siguiente tema
        const nextThemeIndex = currentThemeIndex + 1;
        if (nextThemeIndex < nordicsSayThemes.length) {
          const startPlayer = nextThemeIndex % gamePlayers.length;
          setCurrentThemeIndex(nextThemeIndex);
          setThemeStartPlayerIndex(startPlayer);
          setCurrentPlayerTurnIndex(startPlayer);
        } else {
          // Juego terminado
          setGameFinished(true);
        }
      } else {
        // Aún hay respuestas sin adivinar, continuar pidiendo respuestas
        const nextPlayerIndex = (currentPlayerTurnIndex + 1) % gamePlayers.length;
        
        // Verificar si completamos una ronda (volvimos al jugador que comenzó el tema)
        if (nextPlayerIndex === themeStartPlayerIndex && currentPlayerTurnIndex !== themeStartPlayerIndex) {
          // Fin de la ronda - revelar respuestas restantes y pasar al siguiente tema
          revealRemainingAnswers();
          const nextThemeIndex = currentThemeIndex + 1;
          if (nextThemeIndex < nordicsSayThemes.length) {
            const startPlayer = nextThemeIndex % gamePlayers.length;
            setCurrentThemeIndex(nextThemeIndex);
            setThemeStartPlayerIndex(startPlayer);
            setCurrentPlayerTurnIndex(startPlayer);
          } else {
            setGameFinished(true);
          }
        } else {
          // Continuar con el siguiente jugador en la misma ronda
          setCurrentPlayerTurnIndex(nextPlayerIndex);
        }
      }
    }, 1500);
  };

  // Revelar respuestas no adivinadas
  const revealRemainingAnswers = () => {
    setThemeAttempts(prev => {
      const updated = [...prev];
      const currentAttempt = updated[currentThemeIndex];

      // Encontrar respuestas no reveladas
      for (let i = 0; i < 4; i++) {
        if (!currentAttempt.revealedPositions.has(i)) {
          currentAttempt.revealedPositions.add(i);
        }
      }

      return updated;
    });
  };

  // Obtener cuadros a mostrar
  const getBoxes = () => {
    const theme = getCurrentTheme();
    const revealed = themeAttempts[currentThemeIndex].revealedPositions;

    return theme.answers.map((answer, index) => ({
      ...answer,
      index,
      revealed: revealed.has(index)
    }));
  };

  if (gamePlayers.length === 0) {
    return <div className="loading-screen">Cargando jugadores...</div>;
  }

  if (gameFinished) {
    return (
      <>
        <PhaseResultScreen
          playerScores={playerScores}
          players={gamePlayers}
          phase={2}
          onContinue={() => {
            // Actualizar puntos de cada jugador en la tabla general
            gamePlayers.forEach(player => {
              updatePhaseScore(player.id, playerScores[player.id].total);
            });
            
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

  const currentPlayer = getCurrentPlayer();
  const currentTheme = getCurrentTheme();
  const boxes = getBoxes();
  const playersAnswered = themeAttempts[currentThemeIndex].attempts.filter(a => a.answered).length;

  return (
    <div className="nordicos-dicen-game">
      <div className="game-header">
        <h1><FaLightbulb /> LOS NÓRDICOS DICEN - Fase 2</h1>
        <button
          className="btn-scoreboard"
          onClick={() => setShowScoreBoard(!showScoreBoard)}
        >
          <FaChartBar /> {showScoreBoard ? 'Ocultar' : 'Ver'} Puntuación
        </button>
      </div>

      {showScoreBoard && <GlobalScoreBoard />}

      <div className="game-layout">
        <div className="theme-section">
          <div className="theme-number">Tema {currentThemeIndex + 1} de {nordicsSayThemes.length}</div>
          <h2 className="theme-question">{currentTheme.question}</h2>

          <div className="boxes-grid">
            {boxes.map((box, index) => (
              <div
                key={index}
                className={`answer-box ${box.revealed ? 'revealed' : 'hidden'}`}
              >
                {box.revealed ? (
                  <>
                    <div className="position">{index + 1}</div>
                    <div className="name">{box.name}</div>
                    <div className="percentage">{box.percentage}%</div>
                  </>
                ) : (
                  <div className="question-mark">?</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="game-controls-card">
          <div className="player-turn">
            <div className="current-player">
              <span>Turno de:</span>
              <strong>{currentPlayer.name}</strong>
            </div>
            <div className="progress">
              {playersAnswered} de {gamePlayers.length} jugadores han respondido
            </div>
          </div>

          <div className="answer-section">
            <div className="input-wrapper">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Escribe tu respuesta..."
                className="answer-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && answer.trim()) {
                    handleSubmit();
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                className="btn-submit"
                disabled={!answer.trim()}
              >
                Enviar
              </button>
            </div>
          </div>

          <div className="scores-section">
            <h3>Puntuación Actual</h3>
            <div className="scores-list">
              {gamePlayers.map(player => (
                <div key={player.id} className="score-item">
                  <span>{player.name}</span>
                  <span className="points">{playerScores[player.id].total} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NordicosDicenGame;
