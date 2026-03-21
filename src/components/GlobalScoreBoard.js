import React from 'react';
import { useTournament } from '../context/TournamentContext';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import '../styles/GlobalScoreBoard.css';

const GlobalScoreBoard = ({ compact = false }) => {
  const { getRanking } = useTournament();
  const ranking = getRanking();

  if (compact) {
    return (
      <div className="global-scoreboard compact">
        <div className="scoreboard-container">
          <div className="scoreboard-header">
            <h2><FaTrophy /> Puntuación <FaTrophy /></h2>
          </div>

          <div className="scoreboard-table">
            <div className="table-head">
              <div className="col col-position">Pos</div>
              <div className="col col-name">Jugador</div>
              <div className="col col-total">Puntos</div>
            </div>

            <div className="table-body">
              {ranking.map((score) => (
                <div key={score.playerId} className={`table-row position-${score.position}`}>
                  <div className="col col-position">
                    <span className="position-badge">
                      {score.position === 1 && <FaMedal className="medal gold" title="1er lugar" />}
                      {score.position === 2 && <FaMedal className="medal silver" title="2do lugar" />}
                      {score.position === 3 && <FaMedal className="medal bronze" title="3er lugar" />}
                      {score.position > 3 && score.position}
                    </span>
                  </div>
                  <div className="col col-name">
                    <span className="player-name">{score.playerName}</span>
                  </div>
                  <div className="col col-total">
                    <span className="total-score">{score.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="global-scoreboard">
      <div className="scoreboard-container">
        <div className="scoreboard-header">
          <h2><FaTrophy /> Tabla General de Puntos <FaTrophy /></h2>
        </div>

        <div className="scoreboard-table">
          <div className="table-head">
            <div className="col col-position">Pos</div>
            <div className="col col-name">Jugador</div>
            <div className="col col-phase">Fase 1</div>
            <div className="col col-phase">Fase 2</div>
            <div className="col col-phase">Fase 3</div>
            <div className="col col-total">Total</div>
          </div>

          <div className="table-body">
            {ranking.map((score) => (
              <div key={score.playerId} className={`table-row position-${score.position}`}>
                <div className="col col-position">
                  <span className="position-badge">
                    {score.position === 1 && <FaMedal className="medal gold" title="1er lugar" />}
                    {score.position === 2 && <FaMedal className="medal silver" title="2do lugar" />}
                    {score.position === 3 && <FaMedal className="medal bronze" title="3er lugar" />}
                    {score.position > 3 && score.position}
                  </span>
                </div>
                <div className="col col-name">
                  <span className="player-name">{score.playerName}</span>
                </div>
                <div className="col col-phase">
                  <span className={score.phase1 > 0 ? 'has-score' : ''}>
                    {score.phase1 > 0 ? score.phase1 : '—'}
                  </span>
                </div>
                <div className="col col-phase">
                  <span className={score.phase2 > 0 ? 'has-score' : ''}>
                    {score.phase2 > 0 ? score.phase2 : '—'}
                  </span>
                </div>
                <div className="col col-phase">
                  <span className={score.phase3 > 0 ? 'has-score' : ''}>
                    {score.phase3 > 0 ? score.phase3 : '—'}
                  </span>
                </div>
                <div className="col col-total">
                  <span className="total-score">{score.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalScoreBoard;
