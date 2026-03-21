import React, { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import PasapalabrasGame from './phases/PasapalabrasGame';
import NordicosDicenGame from './phases/NordicosDicenGame';
import BuzzerGame from './phases/BuzzerGame';
import TeamSetup from './TeamSetup';
import GlobalScoreBoard from './GlobalScoreBoard';
import { FaListUl, FaMicrophone, FaLock, FaCheckCircle, FaHandPaper } from 'react-icons/fa';
import '../styles/PhaseManager.css';

const PhaseManager = () => {
  const { currentPhase, startPhase, players } = useTournament();
  const [phaseStarted, setPhaseStarted] = useState(currentPhase > 0);
  const [teams, setTeams] = useState(null);
  const [completedPhases, setCompletedPhases] = useState(new Set());

  // Recuperar teams del localStorage si existen
  useEffect(() => {
    console.log('PhaseManager - useEffect para recuperar teams de localStorage');
    const savedGameState = localStorage.getItem('nordicPasapalabrasGame');
    if (savedGameState) {
      try {
        const state = JSON.parse(savedGameState);
        console.log('Teams encontrados en localStorage:', state.teams);
        if (state.teams && Array.isArray(state.teams) && state.teams.length > 0) {
          setTeams(state.teams);
        }
      } catch (error) {
        console.error('Error al recuperar teams de localStorage:', error);
      }
    }
  }, []);

  const handleStartPhase = (phaseNumber) => {
    startPhase(phaseNumber);
    setPhaseStarted(true);
  };

  const handleTeamsCreated = (createdTeams) => {
    console.log('handleTeamsCreated:', createdTeams);
    setTeams(createdTeams);
  };

  const handlePhaseComplete = (completedPhaseNumber) => {
    setCompletedPhases(prev => new Set(prev).add(completedPhaseNumber));
    setPhaseStarted(false);
  };

  const renderPhase = () => {
    if (currentPhase === 0) {
      return null;
    }
    if (currentPhase === 1) {
      // Mostrar TeamSetup si no hay equipos, si no mostrar Pasapalabras
      if (!teams) {
        return <TeamSetup players={players} onTeamsCreated={handleTeamsCreated} />;
      }
      return <PasapalabrasGame teams={teams} players={players} onPhaseComplete={() => handlePhaseComplete(1)} />;
    }
    if (currentPhase === 2) {
      // Los Nórdicos Dicen - Todos contra todos (sin equipos)
      return <NordicosDicenGame players={players} onPhaseComplete={() => handlePhaseComplete(2)} />;
    }
    if (currentPhase === 3) {
      // ¿Quién dijo esto? - Buzzer
      return <BuzzerGame players={players} onPhaseComplete={() => handlePhaseComplete(3)} />;
    }
    // Future phases will be added here
    return <div className="phase-placeholder">Fase {currentPhase} - Próximamente</div>;
  };

  if (phaseStarted && currentPhase > 0) {
    return renderPhase();
  }

  return (
    <div className="phase-manager">
      <div className="phase-manager-layout">
        <div className="phases-navigation">
          <h2><FaListUl /> Fases del Torneo</h2>
          
          <div className="phases-grid">
            <button
              className={`phase-btn phase-1 ${completedPhases.has(1) ? 'completed' : 'active'}`}
              onClick={() => handleStartPhase(1)}
            >
              <div className="phase-number">Fase 1</div>
              <div className="phase-name">Pasapalabras</div>
              <div className="phase-icon">
                {completedPhases.has(1) ? <FaCheckCircle /> : <FaMicrophone />}
              </div>
            </button>

            <button
              className={`phase-btn phase-2 ${completedPhases.has(2) ? 'completed' : 'active'}`}
              onClick={() => handleStartPhase(2)}
            >
              <div className="phase-number">Fase 2</div>
              <div className="phase-name">Los Nórdicos Dicen</div>
              <div className="phase-icon">
                {completedPhases.has(2) ? <FaCheckCircle /> : <FaMicrophone />}
              </div>
            </button>

            <button
              className={`phase-btn phase-3 ${completedPhases.has(3) ? 'completed' : 'active'}`}
              onClick={() => handleStartPhase(3)}
            >
              <div className="phase-number">Fase 3</div>
              <div className="phase-name">¿Quién Dijo Esto?</div>
              <div className="phase-icon">
                {completedPhases.has(3) ? <FaCheckCircle /> : <FaHandPaper />}
              </div>
            </button>

            <button
              className="phase-btn phase-4 disabled"
              disabled
            >
              <div className="phase-number">Fase 4</div>
              <div className="phase-name">Próximamente</div>
              <div className="phase-icon"><FaLock /></div>
            </button>
          </div>

          <div className="phase-info">
            <h3>Instrucciones</h3>
            <p>Puedes acceder a cualquier fase en el orden que prefieras</p>
            <p>Haz clic en cualquier "Fase" para comenzar a jugar</p>
          </div>
        </div>

        <div className="scoreboard-section">
          <GlobalScoreBoard compact={true} />
        </div>
      </div>
    </div>
  );
};

export default PhaseManager;
