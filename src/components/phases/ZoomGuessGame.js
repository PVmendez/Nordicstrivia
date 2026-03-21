import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { zoomGuessImages } from '../../data/mockData';
import { createGame, playerPressed, listenToGame, uploadPlayersToFirebase, getPlayersFromFirebase, updateGameQuestion, updatePlayerScore, resetGameStateForNextLevel } from '../../firebase.config';
import PhaseResultScreen from './PhaseResultScreen';
import { FaHandPaper, FaCheck, FaTimes, FaShare, FaCopy, FaExclamationCircle, FaCheckCircle, FaHourglassEnd, FaTrophy, FaImage } from 'react-icons/fa';
import '../../styles/phases/ZoomGuessGame.css';

const ZoomGuessGame = ({ players, onPhaseComplete, sessionId }) => {
  const { updatePhaseScore, finishPhase, startPhase } = useTournament();

  const [gamePlayers, setGamePlayers] = useState(players || []);
  const [gameFinished, setGameFinished] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [playerScores, setPlayerScores] = useState({});
  const [sessionIdState, setSessionIdState] = useState(sessionId || null);

  // Estados específicos del juego de zoom
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentZoomLevel, setCurrentZoomLevel] = useState(1); // 1-5, empezando en 5x (máximo zoom)
  const [showFullImage, setShowFullImage] = useState(false);

  // Actualizar sessionIdState cuando sessionId prop cambia
  useEffect(() => {
    if (sessionId) {
      setSessionIdState(sessionId);
    }
  }, [sessionId]);

  const gameId = sessionIdState ? `game-zoom-${sessionIdState}` : null;

  // Detectar si es jugador o admin por parámetro URL
  const [currentPlayerName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('player');
  });

  // Parámetro game es solo informativo, no restrictivo
  const [gameValidationError] = useState(null);

  const isAdmin = !currentPlayerName;
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    console.log('🎮 ZoomGuessGame State:', {
      isAdmin,
      sessionIdState,
      gameId,
      gamePlayers: gamePlayers.map(p => p.name),
      currentPlayerName,
      currentImageIndex,
      currentZoomLevel
    });
  }, [sessionIdState, gameId, isAdmin, gamePlayers, currentPlayerName, currentImageIndex, currentZoomLevel]);

  // Cargar jugadores desde Firebase
  useEffect(() => {
    if (sessionIdState) {
      const unsubscribe = getPlayersFromFirebase(sessionIdState, (fetchedPlayers) => {
        if (fetchedPlayers) {
          const playersWithScore = fetchedPlayers.map(p => ({
            ...p,
            score: 0
          }));
          setGamePlayers(playersWithScore);
          setPlayerScores(
            playersWithScore.reduce((acc, player) => {
              acc[player.id] = 0;
              return acc;
            }, {})
          );
        }
      });
      return unsubscribe;
    } else if (players && players.length > 0) {
      const playersWithScore = players.map(p => ({
        ...p,
        score: p.score || 0
      }));
      setGamePlayers(playersWithScore);
      setPlayerScores(
        playersWithScore.reduce((acc, player) => {
          acc[player.id] = player.score || 0;
          return acc;
        }, {})
      );
    }
  }, [sessionIdState, players]);

  // Inicializar fase
  useEffect(() => {
    startPhase(4);
  }, [startPhase]);

  // Crear juego en Firebase
  useEffect(() => {
    if (!gameId || gamePlayers.length === 0) {
      return;
    }

    const currentImage = zoomGuessImages[0];
    createGame(gameId, gamePlayers, currentImage.fileName, 0, 1, 0);
  }, [gameId, gamePlayers]);

  // Escuchar cambios en Firebase
  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = listenToGame(gameId, (data) => {
      setGameData(data);

      if (data?.players) {
        const scores = {};
        Object.values(data.players).forEach(player => {
          scores[player.id] = player.score || 0;
        });
        setPlayerScores(scores);
      }

      // Sincronizar el nivel de zoom desde Firebase
      if (data?.currentZoomLevel !== undefined) {
        setCurrentZoomLevel(data.currentZoomLevel);
      }

      // Sincronizar el índice de imagen desde Firebase
      if (data?.currentImageIndex !== undefined) {
        setCurrentImageIndex(data.currentImageIndex);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // Calcular puntos según el nivel
  const getPointsForLevel = (level) => {
    const points = {
      1: 100, // Zoom 5x
      2: 75,  // Zoom 4x
      3: 50,  // Zoom 3x
      4: 30,  // Zoom 2x
      5: 10   // Zoom 1x (completa)
    };
    return points[level] || 0;
  };

  const handlePlayerPressed = async (playerId) => {
    if (!gameData) return;
    if (gameData.status !== 'waiting') return;
    if (gameData.players[playerId]?.pressed) return;

    await playerPressed(gameId, playerId);
  };

  const handleCorrect = async () => {
    if (!gameData) return;

    const pressedPlayers = Object.values(gameData.players).filter(p => p.pressed);
    if (pressedPlayers.length === 0) return;

    const winner = pressedPlayers.reduce((prev, current) =>
      prev.pressedAt < current.pressedAt ? prev : current
    );

    const pointsEarned = getPointsForLevel(currentZoomLevel);
    const newScore = (winner.score || 0) + pointsEarned;

    setPlayerScores(prev => ({
      ...prev,
      [winner.id]: newScore
    }));

    await updatePlayerScore(gameId, winner.id, newScore);
    console.log(`✅ ${winner.name} acertó en nivel ${currentZoomLevel}. Ganó ${pointsEarned} puntos. Total: ${newScore}`);

    // Actualizar gameData localmente para que advanceToNextImage tenga el score correcto
    setGameData(prev => ({
      ...prev,
      players: {
        ...prev.players,
        [winner.id]: {
          ...prev.players[winner.id],
          score: newScore
        }
      }
    }));

    setTimeout(() => {
      setShowFullImage(true);
      setTimeout(() => {
        advanceToNextImage();
      }, 2000);
    }, 500);
  };

  const handleIncorrect = async () => {
    if (!gameData) return;

    const pressedPlayers = Object.values(gameData.players).filter(p => p.pressed);
    if (pressedPlayers.length === 0) return;

    const failedPlayer = pressedPlayers.reduce((prev, current) =>
      prev.pressedAt < current.pressedAt ? prev : current
    );

    const newScore = Math.max(0, (failedPlayer.score || 0) - 10);

    setPlayerScores(prev => ({
      ...prev,
      [failedPlayer.id]: newScore
    }));

    await updatePlayerScore(gameId, failedPlayer.id, newScore);
    console.log(`❌ ${failedPlayer.name} falló. Perdió 10 puntos. Total: ${newScore}`);

    // Actualizar gameData localmente para que advanceZoomLevel tenga el score correcto
    setGameData(prev => ({
      ...prev,
      players: {
        ...prev.players,
        [failedPlayer.id]: {
          ...prev.players[failedPlayer.id],
          score: newScore
        }
      }
    }));

    setTimeout(() => {
      advanceZoomLevel();
    }, 500);
  };

  const advanceZoomLevel = async () => {
    if (currentZoomLevel < 5) {
      // Avanzar al siguiente nivel de zoom
      const nextZoomLevel = currentZoomLevel + 1;
      setCurrentZoomLevel(nextZoomLevel);

      // Resetear el estado del juego sin tocar los scores
      await resetGameStateForNextLevel(gameId, nextZoomLevel, currentImageIndex);
    } else {
      // Ya no hay más niveles, revelar imagen y pasar a la siguiente
      setTimeout(() => {
        advanceToNextImage();
      }, 500);
    }
  };

  const advanceToNextImage = async () => {
    if (currentImageIndex + 1 < zoomGuessImages.length) {
      const nextImageIndex = currentImageIndex + 1;
      setCurrentImageIndex(nextImageIndex);
      setCurrentZoomLevel(1);
      setShowFullImage(false);

      // Resetear el estado del juego sin tocar los scores
      await resetGameStateForNextLevel(gameId, 1, nextImageIndex);
    } else {
      setGameFinished(true);
    }
  };

  const skipLevel = async () => {
    console.log(`⏭️ Saltando nivel ${currentZoomLevel}`);
    await advanceZoomLevel();
  };

  const getPlayerLink = (playerName) => {
    if (!sessionIdState) return '';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?player=${encodeURIComponent(playerName)}&session=${sessionIdState}&game=4`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado al portapapeles 📋');
  };

  const handleShareLinks = async () => {
    if (!sessionIdState && gamePlayers.length > 0) {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        await uploadPlayersToFirebase(gamePlayers, newSessionId);
        setSessionIdState(newSessionId);
        setTimeout(() => setShowLinkModal(true), 500);
      } catch (error) {
        console.error('Error al subir jugadores a Firebase:', error);
        alert('Error al generar links. Intenta de nuevo.');
      }
    } else {
      setShowLinkModal(true);
    }
  };

  if (gamePlayers.length === 0) {
    return <div className="loading-screen">Cargando jugadores...</div>;
  }

  // VISTA DE JUGADOR
  if (!isAdmin) {
    const currentPlayer = gamePlayers.find(p => p.name === currentPlayerName);

    if (!currentPlayer) {
      return (
        <div className="player-view">
          <div className="error-message">
            <h2><FaExclamationCircle /> Jugador no encontrado</h2>
            <p>El nombre "{currentPlayerName}" no existe en la lista</p>
            <a href={window.location.pathname}>← Volver</a>
          </div>
        </div>
      );
    }

    if (gameFinished) {
      return (
        <div className="player-view">
          <div className="game-finished-message">
            <h1><FaTrophy /> Juego Finalizado!</h1>
            <p>Tu puntuación: <strong>{gameData?.players[currentPlayer.id]?.score || playerScores[currentPlayer.id] || 0} puntos</strong></p>
            <a href={window.location.pathname}>← Volver</a>
          </div>
        </div>
      );
    }

    const playerPressed = gameData?.players[currentPlayer.id]?.pressed;
    const pressedPlayers = gameData?.players
      ? Object.values(gameData.players).filter(p => p.pressed).sort((a, b) => a.pressedAt - b.pressedAt)
      : [];
    const winner = pressedPlayers.length > 0 ? pressedPlayers[0] : null;

    return (
      <div className="player-view zoom-player-view">
        <div className="player-header">
          <h1>Adivinar con Zoom</h1>
          <p className="player-name-display">Jugador: <strong>{currentPlayerName}</strong></p>
          <p className="image-position">Imagen {currentImageIndex + 1} de {zoomGuessImages.length} | Nivel {currentZoomLevel}/5</p>
        </div>

        <div className="player-content zoom-content">
          <div className="zoom-image-container" style={{ '--zoom-level': 6 - currentZoomLevel }}>
            <img 
              src={require(`../../assets/imgs/${zoomGuessImages[currentImageIndex].fileName}`)}
              alt="Zoom game"
              className="zoom-image"
              style={{
                transform: showFullImage ? 'scale(1)' : `scale(${6 - currentZoomLevel})`
              }}
            />
          </div>

          <div className="zoom-level-indicator">
            <span>Nivel de Zoom: {currentZoomLevel}x</span>
            <div className="zoom-progress">
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className={`level-dot ${level === currentZoomLevel ? 'active' : ''} ${level < currentZoomLevel ? 'passed' : ''}`} />
              ))}
            </div>
          </div>

          <div className="player-status">
            {playerPressed ? (
              <>
                <div className="status-pressed">
                  <FaCheckCircle /> Fuiste el primero!
                </div>
              </>
            ) : !winner ? (
              <div className="status-waiting"><FaHourglassEnd /> Esperando respuestas...</div>
            ) : (
              <div className="status-other">Otro jugador respondió primero</div>
            )}
          </div>

          <button
            className={`player-big-button ${playerPressed ? 'pressed' : ''}`}
            onClick={() => handlePlayerPressed(currentPlayer.id)}
            disabled={playerPressed || !!winner}
          >
            {playerPressed ? (
              <><FaCheckCircle /> RESPONDISTE</>
            ) : (
              <><FaHandPaper /> RESPONDER</>
            )}
          </button>

          <div className="player-score">
            Tu puntuación: <strong>{gameData?.players[currentPlayer.id]?.score || playerScores[currentPlayer.id] || 0} pts</strong>
          </div>
        </div>
      </div>
    );
  }

  // VISTA DE ADMIN
  if (gameFinished) {
    const formattedScores = {};
    gamePlayers.forEach(player => {
      formattedScores[player.id] = {
        total: playerScores[player.id] || 0
      };
    });

    return (
      <>
        <PhaseResultScreen
          playerScores={formattedScores}
          players={gamePlayers}
          phase={4}
          onContinue={() => {
            gamePlayers.forEach(player => {
              updatePhaseScore(player.id, playerScores[player.id] || 0);
            });

            if (onPhaseComplete) {
              onPhaseComplete();
            } else {
              finishPhase();
            }
          }}
        />
      </>
    );
  }

  const currentImage = zoomGuessImages[currentImageIndex];
  const pressedPlayers = gameData?.players
    ? Object.values(gameData.players).filter(p => p.pressed).sort((a, b) => a.pressedAt - b.pressedAt)
    : [];
  const winner = pressedPlayers.length > 0 ? pressedPlayers[0] : null;

  return (
    <div className="zoom-game">
      {/* MODAL CON LINKS DE JUGADORES */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2><FaShare /> Links para Jugadores</h2>
            <p className="modal-instruction">Copia y pega cada link en WhatsApp para que los jugadores entren:</p>

            <div className="links-container">
              {gamePlayers.map((player, idx) => (
                <div key={player.id} className="link-item">
                  <div>
                    <div className="link-number">{idx + 1}</div>
                    <div className="link-text">{player.name}</div>
                  </div>
                  <div className="link-input-wrapper">
                    <input
                      type="text"
                      readOnly
                      value={getPlayerLink(player.name)}
                      className="link-input"
                    />
                    <button
                      className="btn-copy"
                      onClick={() => copyToClipboard(getPlayerLink(player.name))}
                    >
                      <FaCopy /> Copiar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn-close-modal"
              onClick={() => setShowLinkModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="game-header">
        <h1><FaImage /> ADIVINAR CON ZOOM - Fase 4</h1>
        <div className="quote-counter">
          Imagen {currentImageIndex + 1} of {zoomGuessImages.length} | Nivel de Zoom: {currentZoomLevel}x
        </div>
        <button
          className="btn-share-links"
          onClick={handleShareLinks}
        >
          <FaShare /> Compartir Links
        </button>
      </div>

      <div className="game-layout zoom-layout">
        <div className="image-section">
          <div className="zoom-image-container admin" style={{ '--zoom-level': 6 - currentZoomLevel }}>
            <img 
              src={require(`../../assets/imgs/${currentImage.fileName}`)}
              alt="Zoom game admin"
              className="zoom-image"
              style={{
                transform: showFullImage ? 'scale(1)' : `scale(${6 - currentZoomLevel})`
              }}
            />
          </div>
          <div className="zoom-level-info">
            <strong>Zoom: {currentZoomLevel}x</strong>
            {showFullImage && <span className="full-image-badge">Imagen Completa</span>}
          </div>
        </div>

        <div className="buzzer-section zoom-section">
          <div className="buzzer-status">
            {!winner ? (
              <p className="waiting">Esperando respuesta...</p>
            ) : (
              <div className="winner-display">
                <p className="winner-label">Respondió:</p>
                <p className="winner-name">{winner.name}</p>
                <p className="points-display">Puntos en juego: {getPointsForLevel(currentZoomLevel)}</p>
              </div>
            )}
          </div>

          {winner && (
            <div className="validation-controls zoom-controls">
              <button
                className="btn-correct"
                onClick={handleCorrect}
              >
                <FaCheck /> Correcto
              </button>
              <button
                className="btn-incorrect"
                onClick={handleIncorrect}
              >
                <FaTimes /> Incorrecto
              </button>
            </div>
          )}

          <div className="buttons-grid">
            {gamePlayers.map(player => (
              <button
                key={player.id}
                className={`player-buzzer-btn ${gameData?.players[player.id]?.pressed ? 'pressed' : ''}`}
                onClick={() => handlePlayerPressed(player.id)}
                disabled={gameData?.players[player.id]?.pressed || !!winner}
              >
                <div className="player-name">{player.name}</div>
                <div className="buzzer-icon">
                  {gameData?.players[player.id]?.pressed ? (
                    <FaHandPaper className="pressed-icon" />
                  ) : (
                    <FaHandPaper />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="scores-panel">
          <h3>Puntuación</h3>
          <div className="scores-list">
            {gamePlayers.map(player => (
              <div key={player.id} className="score-item">
                <span>{player.name}</span>
                <span className="points">{playerScores[player.id]} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomGuessGame;
