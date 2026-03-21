import React, { useState, useEffect } from 'react';
import { FaUsers, FaCheck, FaRandom } from 'react-icons/fa';
import { createRandomTeams } from '../data/mockData';
import '../styles/TeamSetup.css';

const TeamSetup = ({ players, onTeamsCreated }) => {
  const [teams, setTeams] = useState([]);

  // Generar automáticamente los 2 equipos al cargar
  useEffect(() => {
    if (players && players.length > 0) {
      const randomTeams = createRandomTeams(players);
      setTeams(randomTeams);
    }
  }, [players]);

  const handleRegenerateTeams = () => {
    const randomTeams = createRandomTeams(players);
    setTeams(randomTeams);
  };

  const handleStartGame = () => {
    if (teams.length !== 2) {
      alert('Debe haber exactamente 2 equipos para jugar');
      return;
    }

    const playersInTeams = new Set(teams.flatMap(t => t.players.map(p => p.id)));
    if (playersInTeams.size !== players.length) {
      alert('Todos los jugadores deben estar en un equipo');
      return;
    }

    onTeamsCreated(teams);
  };

  return (
    <div className="team-setup">
      <div className="setup-card">
        <h2><FaUsers /> Equipos Aleatorios - Pasapalabras</h2>
        <p className="subtitle">Los equipos se han formado aleatoriamente</p>

        <div className="setup-content">
          <div className="teams-section">
            <h3>Equipos Formados ({teams.length}/2)</h3>
            <div className="teams-list">
              {teams.length === 0 ? (
                <p className="no-teams">Generando equipos...</p>
              ) : (
                teams.map(team => (
                  <div key={team.id} className="team-card">
                    <div className="team-info">
                      <div className="team-number">Equipo {team.id}</div>
                      <div className="team-name">{team.name}</div>
                      <div className="team-members">
                        {team.players.map(p => (
                          <span key={p.id} className="member-badge">
                            {p.name}
                          </span>
                        ))}
                      </div>
                      <div className="team-size">
                        {team.players.length} {team.players.length === 1 ? 'jugador' : 'jugadores'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {teams.length === 2 && (
              <button 
                onClick={handleRegenerateTeams} 
                className="btn-regenerate-teams"
              >
                <FaRandom /> Generar Nuevos Equipos
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleStartGame}
          className="btn-start-game"
          disabled={teams.length !== 2}
        >
          Iniciar Pasapalabras
        </button>
      </div>
    </div>
  );
};

export default TeamSetup;
