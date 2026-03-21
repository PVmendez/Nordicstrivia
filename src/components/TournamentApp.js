import React, { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import PlayerSetup from './PlayerSetup';
import PhaseManager from './PhaseManager';
import TournamentFinal from './TournamentFinal';
import BuzzerGame from './phases/BuzzerGame';
import ZoomGuessGame from './phases/ZoomGuessGame';
import { FaSignOutAlt } from 'react-icons/fa';
import '../styles/TournamentApp.css';

const TournamentApp = () => {
  const { playersAdded, tournamentFinished, resetTournament } = useTournament();
  const [isPlayerView, setIsPlayerView] = useState(false);
  const [storedPlayers, setStoredPlayers] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [gameNumber, setGameNumber] = useState(null);

  // Detectar si es vista de jugador (parámetro ?player=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playerName = params.get('player');
    const session = params.get('session');
    const game = params.get('game');
    
    if (playerName && session) {
      // Es vista de jugador con ID de sesión
      setSessionId(session);
      setGameNumber(game || '3'); // Default a juego 3 si no se especifica
      setIsPlayerView(true);
    } else if (playerName) {
      // Fallback: intenta cargar del localStorage local (mismo dispositivo)
      const savedTournament = localStorage.getItem('nordicTournament');
      if (savedTournament) {
        try {
          const data = JSON.parse(savedTournament);
          if (data.players && data.players.length > 0) {
            setStoredPlayers(data.players);
            setGameNumber(game || '3'); // Default a juego 3 si no se especifica
            setIsPlayerView(true);
          }
        } catch (error) {
          console.error('Error al recuperar datos:', error);
        }
      }
    }
  }, []);

  const handleAbandonTournament = async () => {
    if (window.confirm('¿Estás seguro de que deseas abandonar el torneo? Se perderá todo el progreso.')) {
      localStorage.removeItem('currentTournamentId');
      await resetTournament();
      window.location.reload();
    }
  };

  // Si es vista de jugador, renderizar el juego correcto
  if (isPlayerView) {
    return (
      <div className="tournament-app">
        <header className="tournament-header">
          <h1>Nordic Trivia Tournament</h1>
        </header>
        <main className="tournament-container">
          {gameNumber === '4' ? (
            <ZoomGuessGame 
              players={storedPlayers} 
              sessionId={sessionId}
            />
          ) : (
            <BuzzerGame 
              players={storedPlayers} 
              sessionId={sessionId}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="tournament-app">
      <header className="tournament-header">
        <h1>Nordic Trivia Tournament</h1>
        {playersAdded && (
          <button
            onClick={handleAbandonTournament}
            className="btn-abandon"
            title="Abandonar torneo (se perderá el progreso)"
          >
            <FaSignOutAlt /> Abandonar
          </button>
        )}
      </header>

      <main className="tournament-container">
        {!playersAdded ? (
          <PlayerSetup />
        ) : tournamentFinished ? (
          <TournamentFinal />
        ) : (
          <PhaseManager sendPlayersToFirebase={true} />
        )}
      </main>
    </div>
  );
};

export default TournamentApp;
