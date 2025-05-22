import React, { useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 80;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 80;

function getRandomX() {
  return Math.floor(Math.random() * (GAME_WIDTH - OBSTACLE_WIDTH));
}

function App() {
  const [carX, setCarX] = useState(GAME_WIDTH / 2 - CAR_WIDTH / 2);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [name, setName] = useState('');
  const gameRef = useRef();

  // 장애물 생성 및 이동
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setObstacles(obs =>
        obs
          .map(o => ({ ...o, y: o.y + 5 + Math.floor(score / 100) })) // 난이도 상승
          .filter(o => o.y < GAME_HEIGHT)
      );
      if (Math.random() < 0.03 + score / 2000) { // 난이도 상승
        setObstacles(obs => [...obs, { x: getRandomX(), y: -OBSTACLE_HEIGHT }]);
      }
      setScore(s => s + 1);
    }, 20);
    return () => clearInterval(interval);
  }, [gameOver, score]);

  // 충돌 체크
  useEffect(() => {
    for (let o of obstacles) {
      if (
        o.y + OBSTACLE_HEIGHT > GAME_HEIGHT - CAR_HEIGHT - 10 &&
        o.y < GAME_HEIGHT - 10 &&
        o.x < carX + CAR_WIDTH &&
        o.x + OBSTACLE_WIDTH > carX
      ) {
        setGameOver(true);
        break;
      }
    }
  }, [obstacles, carX]);

  // 키보드 조작
  useEffect(() => {
    const handleKeyDown = e => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft') setCarX(x => Math.max(0, x - 20));
      if (e.key === 'ArrowRight') setCarX(x => Math.min(GAME_WIDTH - CAR_WIDTH, x + 20));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  // 점수 제출 및 랭킹 조회
  const submitScore = async () => {
    await fetch('http://localhost:5000/submit_score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
    const res = await fetch('http://localhost:5000/ranking');
    const data = await res.json();
    setRanking(data);
  };

  // 게임 재시작
  const restart = () => {
    setCarX(GAME_WIDTH / 2 - CAR_WIDTH / 2);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setRanking([]);
    setName('');
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>자동차 레이싱 게임</h1>
      <div
        ref={gameRef}
        style={{
          position: 'relative',
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          margin: '0 auto',
          background: '#222',
          overflow: 'hidden',
        }}
      >
        {/* 자동차 */}
        <div
          style={{
            position: 'absolute',
            left: carX,
            top: GAME_HEIGHT - CAR_HEIGHT - 10,
            width: CAR_WIDTH,
            height: CAR_HEIGHT,
            background: 'red',
            borderRadius: 10,
          }}
        />
        {/* 장애물 */}
        {obstacles.map((o, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: o.x,
              top: o.y,
              width: OBSTACLE_WIDTH,
              height: OBSTACLE_HEIGHT,
              background: 'gray',
              borderRadius: 10,
            }}
          />
        ))}
      </div>
      <h2>점수: {score}</h2>
      {gameOver && (
        <div>
          <h2>게임 오버!</h2>
          <input
            placeholder="이름 입력"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={ranking.length > 0}
          />
          <button onClick={submitScore} disabled={!name || ranking.length > 0}>
            점수 제출
          </button>
          <button onClick={restart}>다시 시작</button>
          {ranking.length > 0 && (
            <div>
              <h3>랭킹</h3>
              <ol>
                {ranking.map((r, i) => (
                  <li key={i}>
                    {r.name}: {r.score}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
