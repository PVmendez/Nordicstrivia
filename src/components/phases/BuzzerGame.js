import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { whoSaidThis } from '../../data/mockData';
import { createGame, playerPressed, listenToGame, uploadPlayersToFirebase, getPlayersFromFirebase, updateGameQuestion, updatePlayerScore } from '../../firebase.config';
import PhaseResultScreen from './PhaseResultScreen';
import { FaHandPaper, FaCheck, FaTimes, FaShare, FaCopy, FaExclamationCircle, FaCheckCircle, FaHourglassEnd, FaTrophy } from 'react-icons/fa';
import '../../styles/phases/BuzzerGame.css';

const BuzzerGame = ({ players, onPhaseComplete, sessionId }) => {
  const { updatePhaseScore, finishPhase, startPhase } = useTournament();

  const [gamePlayers, setGamePlayers] = useState(players || []);
  const [gameFinished, setGameFinished] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [playerScores, setPlayerScores] = useState({});
  const [sessionIdState, setSessionIdState] = useState(sessionId || null);

  // Actualizar sessionIdState cuando sessionId prop cambia
  useEffect(() => {
    if (sessionId) {
      setSessionIdState(sessionId);
    }
  }, [sessionId]);

  // El gameId se calcula dinamicamente basado en sessionIdState actual
  const gameId = sessionIdState ? `game-${sessionIdState}` : null;

  // currentQuoteIndex ahora viene de Firebase (en gameData)
  const currentQuoteIndex = gameData?.currentQuoteIndex ?? 0;

  // Detectar si es jugador o admin por parámetro URL
  const [currentPlayerName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('player');
  });

  // Parámetro game es solo informativo, no restrictivo
  const [gameValidationError] = useState(null);

  const isAdmin = !currentPlayerName;
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Actualizar gameId cuando sessionIdState cambia
  useEffect(() => {
    console.log('🎮 BuzzerGame State:', {
      isAdmin,
      sessionIdState,
      gameId,
      gamePlayers: gamePlayers.map(p => p.name),
      currentPlayerName,
      gameDataPlayers: gameData ? Object.keys(gameData.players) : 'no gameData'
    });
  }, [sessionIdState, gameId, isAdmin, gamePlayers, gameData, currentPlayerName]);

  // Si tiene sessionIdState, cargar jugadores desde Firebase
  useEffect(() => {
    if (sessionIdState) {
      const unsubscribe = getPlayersFromFirebase(sessionIdState, (fetchedPlayers) => {
        if (fetchedPlayers) {
          // Agregar score inicial a los jugadores
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
    startPhase(3);
  }, [startPhase]);

  // Crear juego en Firebase cuando monta el componente o cuando gameId cambia
  useEffect(() => {
    if (!gameId || gamePlayers.length === 0) {
      return;
    }
    
    // Solo crear el juego la primera vez que gameId se establece
    const currentQuote = whoSaidThis[0]; // Always start with the first quote
    createGame(gameId, gamePlayers, currentQuote.quote, 0);
  }, [gameId, gamePlayers]);

  // Escuchar cambios en Firebase
  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = listenToGame(gameId, (data) => {
      setGameData(data);
      
      // Sincronizar puntuaciones desde Firebase
      if (data?.players) {
        const scores = {};
        Object.values(data.players).forEach(player => {
          scores[player.id] = player.score || 0;
        });
        setPlayerScores(scores);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  const handlePlayerPressed = async (playerId) => {
    console.log('handlePlayerPressed called', { playerId, gameDataStatus: gameData?.status, pressed: gameData?.players[playerId]?.pressed, gameId });
    
    if (!gameData) {
      console.log('No gameData available yet');
      return;
    }
    
    if (gameData.status !== 'waiting') {
      console.log('Game status is not waiting:', gameData.status);
      return;
    }
    
    if (gameData.players[playerId]?.pressed) {
      console.log('Player already pressed');
      return;
    }

    // Verificar si el jugador está bloqueado después de haber errado en esta frase
    if (gameData.blockedPlayers?.[playerId]) {
      console.log('Player is blocked - they already failed this round');
      return;
    }

    console.log('Sending playerPressed to Firebase');
    await playerPressed(gameId, playerId);
  };

  const handleCorrect = async () => {
    if (!gameData) return;

    const pressedPlayers = Object.values(gameData.players).filter(p => p.pressed);
    if (pressedPlayers.length === 0) return;

    const winner = pressedPlayers.reduce((prev, current) =>
      prev.pressedAt < current.pressedAt ? prev : current
    );

    const newScore = (winner.score || 0) + 10;
    
    // Actualizar puntos en estado local
    setPlayerScores(prev => ({
      ...prev,
      [winner.id]: newScore
    }));

    // Guardar puntos en Firebase para que el jugador lo vea
    await updatePlayerScore(gameId, winner.id, newScore);
    console.log(`✅ ${winner.name} conseguió 10 puntos. Total: ${newScore}`);

    setTimeout(async () => {
      if (currentQuoteIndex + 1 < whoSaidThis.length) {
        // CORRECTO: Avanzar a la siguiente frase
        // IMPORTANTE: Pasar los jugadores actualizados con sus scores desde Firebase
        const updatedPlayers = Object.values(gameData.players).map(p => ({
          ...p,
          score: p.id === winner.id ? newScore : (p.score || 0) // Asegurar que el ganador tiene el score actualizado
        }));
        const nextQuote = whoSaidThis[currentQuoteIndex + 1];
        await updateGameQuestion(gameId, updatedPlayers, nextQuote.quote, currentQuoteIndex + 1);
      } else {
        setGameFinished(true);
      }
    }, 500);
  };

  const handleRebote = async () => {
    // REBOTE: El jugador que respondió mal debe bloquearse para esta frase
    if (!gameData) return;

    // Obtener el jugador que respondió primero (el que erró)
    const pressedPlayers = Object.values(gameData.players).filter(p => p.pressed).sort((a, b) => a.pressedAt - b.pressedAt);
    let failedPlayerId = null;
    
    if (pressedPlayers.length > 0) {
      const failedPlayer = pressedPlayers[0];
      failedPlayerId = failedPlayer.id;
      console.log(`🚫 Bloqueando a ${failedPlayer.name} tras rebote`);
    }

    // Actualizar el juego sin cambiar el índice de frase, pero bloquear al jugador que erró
    // Usar jugadores actualizados desde gameData para preservar scores
    const updatedPlayers = Object.values(gameData.players);
    const currentQuote = whoSaidThis[currentQuoteIndex];
    await updateGameQuestion(gameId, updatedPlayers, currentQuote.quote, currentQuoteIndex, failedPlayerId);
  };

  const getPlayerLink = (playerName) => {
    if (!sessionIdState) return '';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?player=${encodeURIComponent(playerName)}&session=${sessionIdState}&game=3`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado al portapapeles 📋');
  };

  const handleShareLinks = async () => {
    if (!sessionIdState && gamePlayers.length > 0) {
      // Generar ID de sesión único
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Subir jugadores a Firebase
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
    const isPlayerBlocked = gameData?.blockedPlayers?.[currentPlayer.id];
    const pressedPlayers = gameData?.players
      ? Object.values(gameData.players).filter(p => p.pressed).sort((a, b) => a.pressedAt - b.pressedAt)
      : [];
    const winner = pressedPlayers.length > 0 ? pressedPlayers[0] : null;

    return (
      <div className="player-view">
        <div className="player-header">
          <h1>¿Quién Dijo Esto?</h1>
          <p className="player-name-display">Jugador: <strong>{currentPlayerName}</strong></p>
          <p className="quote-position">Quote {currentQuoteIndex + 1} of {whoSaidThis.length}</p>
        </div>

        <div className="player-content">
          <div className="player-quote">
            <p>\"{whoSaidThis[currentQuoteIndex].quote}\"</p>
          </div>

          <div className="player-status">
            {isPlayerBlocked ? (
              <div className="status-blocked">
                <FaExclamationCircle /> Erraste! No puedes responder
              </div>
            ) : playerPressed ? (
              <>
                <div className="status-pressed">
                  <FaCheckCircle /> Respondiste!
                </div>
                {winner?.id === currentPlayer.id && (
                  <div className="status-winner"><FaTrophy /> ¡Fuiste el primero!</div>
                )}
              </>
            ) : !winner ? (
              <div className="status-waiting"><FaHourglassEnd /> Esperando respuestas...</div>
            ) : (
              <div className="status-other">Otro jugador respondió primero</div>
            )}
          </div>

          <button
            className={`player-big-button ${playerPressed ? 'pressed' : ''} ${isPlayerBlocked ? 'blocked' : ''}`}
            onClick={() => handlePlayerPressed(currentPlayer.id)}
            disabled={playerPressed || !!winner || isPlayerBlocked}
          >
            {isPlayerBlocked ? (
              <><FaExclamationCircle /> BLOQUEADO</>
            ) : playerPressed ? (
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
    // Convertir scores al formato esperado por PhaseResultScreen
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
          phase={3}
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

  const currentQuote = whoSaidThis[currentQuoteIndex];
  const pressedPlayers = gameData?.players
    ? Object.values(gameData.players).filter(p => p.pressed).sort((a, b) => a.pressedAt - b.pressedAt)
    : [];
  const winner = pressedPlayers.length > 0 ? pressedPlayers[0] : null;

  return (
    <div className="buzzer-game">
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
        <h1><FaHandPaper /> QUIEN DIJO ESTO? - Fase 3</h1>
        <div className="quote-counter">
          Quote {currentQuoteIndex + 1} of {whoSaidThis.length}
        </div>
        <button
          className="btn-share-links"
          onClick={handleShareLinks}
        >
          <FaShare /> Compartir Links
        </button>
      </div>

      <div className="game-layout">
        <div className="quote-section">
          <div className="quote-text">"{currentQuote.quote}"</div>
        </div>

        <div className="buzzer-section">
          <div className="buzzer-status">
            {!winner ? (
              <p className="waiting">Esperando respuesta...</p>
            ) : (
              <div className="winner-display">
                <p className="winner-label">Respondió:</p>
                <p className="winner-name">{winner.name}</p>
              </div>
            )}
          </div>

          {winner && (
            <div className="validation-controls">
              <button
                className="btn-correct"
                onClick={handleCorrect}
              >
                <FaCheck /> Correcto
              </button>
              <button
                className="btn-rebote"
                onClick={handleRebote}
              >
                <FaTimes /> Rebote
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

export default BuzzerGame;
