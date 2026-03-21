import React from 'react';
import { useTournament } from '../context/TournamentContext';
import GlobalScoreBoard from './GlobalScoreBoard';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import '../styles/TournamentFinal.css';

const TournamentFinal = () => {
  const { getWinner, getRanking, resetTournament } = useTournament();
  const winner = getWinner();
  const ranking = getRanking();

  const handleNewTournament = async () => {
    await resetTournament();
    window.location.reload();
  };

  return (
    <div className="tournament-final">
      <div className="final-container">
        <div className="winner-section">
          <h1>¡TORNEO FINALIZADO!</h1>
          
          <div className="winner-card">
            <div className="winner-badge"><FaTrophy /></div>
            <h2>Ganador del Torneo</h2>
            <div className="winner-name">{winner?.playerName}</div>
            <div className="winner-score">{winner?.total} Puntos</div>
          </div>

          <div className="podium">
            <div className="podium-item second">
              <div className="medal"><FaMedal className="podium-medal silver" /></div>
              <div className="rank-name">{ranking[1]?.playerName || '—'}</div>
              <div className="rank-score">{ranking[1]?.total || 0} pts</div>
            </div>

            <div className="podium-item first">
              <div className="medal"><FaMedal className="podium-medal gold" /></div>
              <div className="rank-name">{ranking[0]?.playerName}</div>
              <div className="rank-score">{ranking[0]?.total} pts</div>
            </div>

            <div className="podium-item third">
              <div className="medal"><FaMedal className="podium-medal bronze" /></div>
              <div className="rank-name">{ranking[2]?.playerName || '—'}</div>
              <div className="rank-score">{ranking[2]?.total || 0} pts</div>
            </div>
          </div>
        </div>

        <div className="ranking-section">
          <GlobalScoreBoard />
        </div>

        <button
          onClick={handleNewTournament}
          className="btn-restart"
        >
          <FaMedal /> Nuevo Torneo
        </button>
      </div>
    </div>
  );
};

export default TournamentFinal;
