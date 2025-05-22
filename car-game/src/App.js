import React, { useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 80;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 80;
const STAR_SIZE = 40;
const STAR_SPAWN_RATE = 0.005;
const LINE_SPACING = 100;
const LINE_WIDTH = 6;
const LINE_HEIGHT = 40;

const DIFFICULTY_SETTINGS = {
  // 난이도별 속도와 생성 확률을 더 크게 구분
  easy: { speed: 2, spawn: 0.004 },
  normal: { speed: 4, spawn: 0.008 },
  hard: { speed: 6, spawn: 0.013 },
};

const LANE_COUNT = 4;
const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
const LANE_POSITIONS = Array.from({ length: LANE_COUNT }, (_, i) =>
  i * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2
);

function getRandomX() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  return LANE_POSITIONS[lane];
}

function spawnObstacles() {
  const emptyLane = Math.floor(Math.random() * LANE_COUNT);
  return [...Array(LANE_COUNT).keys()]
    .filter(lane => lane !== emptyLane)
    .map(lane => ({
      x: LANE_POSITIONS[lane],
      y: -OBSTACLE_HEIGHT,
    }));
}

function spawnStar() {
  const lane = Math.floor(Math.random() * LANE_COUNT);
  return { x: LANE_POSITIONS[lane], y: -STAR_SIZE };
}

// 좀 더 세련된 자동차 컴포넌트
function Car({ x }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: GAME_HEIGHT - CAR_HEIGHT - 10,
        width: CAR_WIDTH,
        height: CAR_HEIGHT,
        transition: 'left 0.1s ease-out',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: CAR_HEIGHT - 22,
          background: 'linear-gradient(to bottom, #ff6b6b, #ee4d4d)',
          borderRadius: '8px 8px 4px 4px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          top: 6,
          height: 22,
          background: '#c0e0ff',
          borderRadius: 4,
          boxShadow: 'inset 0 0 3px rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: 5,
          width: 16,
          height: 16,
          background: '#222',
          borderRadius: '50%',
          boxShadow: '0 0 2px rgba(0,0,0,0.6) inset',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          right: 5,
          width: 16,
          height: 16,
          background: '#222',
          borderRadius: '50%',
          boxShadow: '0 0 2px rgba(0,0,0,0.6) inset',
        }}
      />
    </div>
  );
}

function App() {
  const [laneIndex, setLaneIndex] = useState(Math.floor(LANE_COUNT / 2) - 1);
  const carX = LANE_POSITIONS[laneIndex];
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [ranking, setRanking] = useState([]);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('normal');
  const initialLines = Array.from({ length: Math.ceil(GAME_HEIGHT / LINE_SPACING) + 1 }, (_, i) => i * LINE_SPACING);
  const TOTAL_LINE_LENGTH = LINE_SPACING * initialLines.length;
  const [lines, setLines] = useState(initialLines);
  const gameRef = useRef();
  const scoreRef = useRef(0);
  const [stars, setStars] = useState([]);

  // 장애물과 도로선 이동 및 점수 증가
  useEffect(() => {
    if (gameOver) return;
    const { speed, spawn } = DIFFICULTY_SETTINGS[difficulty];
    const interval = setInterval(() => {
      setObstacles(obs =>
        obs
          .map(o => ({
            ...o,
            y: o.y + speed + Math.floor(scoreRef.current / 500),
          }))
          .filter(o => o.y < GAME_HEIGHT)
      );
      setStars(st =>
        st
          .map(s => ({ ...s, y: s.y + speed + Math.floor(scoreRef.current / 500) }))
          .filter(s => s.y < GAME_HEIGHT)
      );
      if (Math.random() < spawn + scoreRef.current / 8000) {
        setObstacles(obs => [...obs, ...spawnObstacles()]);
      }
      if (scoreRef.current > 100 && Math.random() < STAR_SPAWN_RATE) {
        setStars(st => [...st, spawnStar()]);
      }
      setLines(ls =>
        ls.map(y =>
          y + speed + 3 >= GAME_HEIGHT
            ? y + speed + 3 - TOTAL_LINE_LENGTH
            : y + speed + 3
        )
      );
      setScore(prev => {
        const newScore = prev + 1;
        scoreRef.current = newScore;
        return newScore;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [gameOver, difficulty]);

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
    setStars(st => {
      const remain = [];
      let gained = false;
      for (let s of st) {
        if (
          s.y + STAR_SIZE > GAME_HEIGHT - CAR_HEIGHT - 10 &&
          s.y < GAME_HEIGHT - 10 &&
          s.x < carX + CAR_WIDTH &&
          s.x + STAR_SIZE > carX
        ) {
          gained = true;
        } else {
          remain.push(s);
        }
      }
      if (gained) setScore(sc => sc + 10);
      return remain;
    });
  }, [obstacles, stars, laneIndex]);

  // 키보드 조작
  useEffect(() => {
    const handleKeyDown = e => {
      if (gameOver) return;
      if (e.key === 'ArrowLeft') setLaneIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setLaneIndex(i => Math.min(LANE_COUNT - 1, i + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  // 랭킹 불러오기
  const fetchRanking = async () => {
    const res = await fetch('http://localhost:5000/ranking');
    const data = await res.json();
    setRanking(data);
  };

  // 점수 제출 후 랭킹 갱신
  const submitScore = async () => {
    await fetch('http://localhost:5000/submit_score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: scoreRef.current }),
    });
    setName('');
    fetchRanking();
  };

  // 초기 로딩 시 랭킹 조회
  useEffect(() => {
    fetchRanking();
  }, []);

  // 게임 재시작
  const restart = () => {
    setLaneIndex(Math.floor(LANE_COUNT / 2) - 1);
    setObstacles([]);
    setStars([]);
    setScore(0);
    scoreRef.current = 0;
    setLines(initialLines);
    setGameOver(false);
    setName('');
    fetchRanking();
  };

  return (
    <div style={{ textAlign: 'center', position: 'relative', paddingBottom: '80px' }}>
      <h1>자동차 레이싱 게임</h1>
      <div style={{ marginBottom: '10px' }}>
        <label>
          난이도:
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            style={{ marginLeft: '8px' }}
          >
            <option value="easy">쉬움</option>
            <option value="normal">보통</option>
            <option value="hard">어려움</option>
          </select>
        </label>
      </div>
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
        {/* 도로 중앙선 */}
        {lines.map((y, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: GAME_WIDTH / 2 - LINE_WIDTH / 2,
              top: y,
              width: LINE_WIDTH,
              height: LINE_HEIGHT,
              background: '#fff',
              opacity: 0.7,
            }}
          />
        ))}
        {/* 별 아이템 */}
        {stars.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: STAR_SIZE,
              height: STAR_SIZE,
              background: 'yellow',
              borderRadius: '50%',
              boxShadow: '0 0 5px rgba(255,255,0,0.8)',
            }}
          />
        ))}
        {/* 자동차 */}
        <Car x={carX} />
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
              background: 'linear-gradient(to bottom, #a0a0a0, #888888)',
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
          />
          <button onClick={submitScore} disabled={!name}>
            점수 제출
          </button>
          <button onClick={restart}>다시 시작</button>
        </div>
      )}

      {/* 항상 하단에 랭킹 표시 */}
      <div style={{
        position: 'fixed',
        left: '10px',
        bottom: '10px',
        width: '220px',
        background: '#444',
        color: '#fff',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>순위</h3>
        <ol style={{
          listStyle: 'none',
          padding: 0,
          margin: 0
        }}>
          {ranking.map((r, i) => (
            <li key={i} style={{ marginBottom: '4px', fontWeight: 'bold' }}>
              {r.name}: {r.score}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default App;
