import React, { createContext, useContext, useState, useEffect } from 'react';
import { createEmptyScores } from '../data/mockData';
import { createTournament, saveTournamentState, listenToTournament, updateTournamentPhase, finishTournament, resetTournamentFirebase } from '../firebase.config';

const TournamentContext = createContext();

export const TournamentProvider = ({ children }) => {
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentPhase, setCurrentPhase] = useState(0);
  const [tournamentFinished, setTournamentFinished] = useState(false);
  const [playersAdded, setPlayersAdded] = useState(false);
  const [tournamentId, setTournamentId] = useState(null);

  // Generar o recuperar tournament ID
  useEffect(() => {
    let storedTournamentId = localStorage.getItem('currentTournamentId');
    if (!storedTournamentId) {
      storedTournamentId = `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('currentTournamentId', storedTournamentId);
    }
    setTournamentId(storedTournamentId);
  }, []);

  // Escuchar cambios del torneo en Firebase
  useEffect(() => {
    if (!tournamentId) return;

    console.log('🔄 Sincronizando torneo desde Firebase:', tournamentId);
    
    const unsubscribe = listenToTournament(tournamentId, (data) => {
      if (data) {
        console.log('📡 Datos del torneo recibidos:', data);
        
        // Convertir players object a array si es necesario
        let playersList = [];
        if (data.players) {
          playersList = Object.values(data.players);
        }
        
        setPlayers(playersList);
        setScores(data.scores || {});
        setCurrentPhase(data.currentPhase || 0);
        setTournamentFinished(data.tournamentFinished || false);
        setPlayersAdded(data.playersAdded || false);
      }
    });

    return () => unsubscribe();
  }, [tournamentId]);

  const addPlayers = async (playerNames) => {
    if (playerNames.length === 0 || !tournamentId) return;
    
    const newPlayers = playerNames.map((name, index) => ({
      id: index + 1,
      name: name.trim()
    }));
    
    const newScores = createEmptyScores(newPlayers);
    
    // Guardar en Firebase con los scores iniciales
    await createTournament(tournamentId, newPlayers, newScores);
    
    // Actualizar estado local
    setPlayers(newPlayers);
    setScores(newScores);
    setPlayersAdded(true);
    
    console.log('✅ Jugadores agregados a Firebase');
  };

  const updatePhaseScore = async (playerId, points) => {
    if (!tournamentId) return;
    
    const newScores = {
      ...scores,
      [playerId]: {
        ...scores[playerId],
        [`phase${currentPhase}`]: points,
        total: calculateTotal(scores[playerId], currentPhase, points)
      }
    };
    
    setScores(newScores);
    
    // Guardar en Firebase
    await saveTournamentState(tournamentId, {
      scores: newScores,
      currentPhase,
      tournamentFinished
    });
    
    console.log(`💾 Puntuación actualizada para jugador ${playerId}`);
  };

  const calculateTotal = (playerScore, phase, newPoints) => {
    const phases = ['phase1', 'phase2', 'phase3', 'phase4'];
    let total = 0;
    phases.forEach((p, index) => {
      if (index + 1 === phase) {
        total += newPoints;
      } else {
        total += playerScore[p] || 0;
      }
    });
    return total;
  };

  const startPhase = async (phaseNumber) => {
    if (!tournamentId) return;
    
    setCurrentPhase(phaseNumber);
    
    // Guardar fase actual en Firebase
    await updateTournamentPhase(tournamentId, phaseNumber);
    
    console.log(`🎮 Fase ${phaseNumber} iniciada`);
  };

  const finishPhase = async () => {
    if (!tournamentId) return;
    
    if (currentPhase >= 3) {
      await finishTournament(tournamentId);
      setTournamentFinished(true);
    } else {
      const newPhase = currentPhase + 1;
      await updateTournamentPhase(tournamentId, newPhase);
      setCurrentPhase(newPhase);
    }
    
    console.log(`✅ Fase completada.`);
  };

  const resetTournament = async () => {
    if (!tournamentId) return;
    
    console.log('🔄 Reseteando torneo...');
    
    // Resetear en Firebase
    await resetTournamentFirebase(tournamentId);
    
    // Limpiar estado local
    setPlayers([]);
    setScores({});
    setCurrentPhase(0);
    setTournamentFinished(false);
    setPlayersAdded(false);
    
    // Generar nuevo tournament ID
    const newTournamentId = `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('currentTournamentId', newTournamentId);
    setTournamentId(newTournamentId);
  };

  const getWinner = () => {
    if (Object.keys(scores).length === 0) return null;
    let winner = null;
    let maxPoints = -1;
    
    Object.values(scores).forEach(playerScore => {
      if (playerScore.total > maxPoints) {
        maxPoints = playerScore.total;
        winner = playerScore;
      }
    });
    
    return winner;
  };

  const getRanking = () => {
    return Object.values(scores)
      .sort((a, b) => b.total - a.total)
      .map((score, index) => ({
        ...score,
        position: index + 1
      }));
  };

  const value = {
    players,
    addPlayers,
    scores,
    updatePhaseScore,
    currentPhase,
    startPhase,
    finishPhase,
    tournamentFinished,
    playersAdded,
    getWinner,
    getRanking,
    resetTournament,
    tournamentId
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament debe ser usado dentro de TournamentProvider');
  }
  return context;
};
