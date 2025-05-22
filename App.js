import React, { useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const CAR_WIDTH = 50;
const CAR_HEIGHT = 80;
const OBSTACLE_WIDTH = 50;
const OBSTACLE_HEIGHT = 80;
const LINE_SPACING = 100;
const LINE_WIDTH = 6;
const LINE_HEIGHT = 40;

const DIFFICULTY_SETTINGS = {
  // 난이도별 속도와 등장 확률을 확실히 구분
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
  const lanes = [...Array(LANE_COUNT).keys()];
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  const count = Math.floor(Math.random() * (LANE_COUNT - 1)) + 1;
  return lanes.slice(0, count).map(lane => ({
    x: LANE_POSITIONS[lane],
    y: -OBSTACLE_HEIGHT,
  }));
}

// 자동차 컴포넌트 (좀 더 현실적인 형태)
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
          height: CAR_HEIGHT - 20,
          background: 'linear-gradient(to bottom, #ff6b6b, #ee4d4d)',
          borderRadius: 8,
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          top: 5,
          height: 20,
          background: '#c0e0ff',
          borderRadius: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: 5,
          width: 14,
          height: 14,
          background: '#222',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          right: 5,
          width: 14,
          height: 14,
          background: '#222',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

function App() {
  const [carX, setCarX] = useState(GAME_WIDTH / 2 - CAR_WIDTH / 2);
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
      if (Math.random() < spawn + scoreRef.current / 8000) {
        setObstacles(obs => [...obs, ...spawnObstacles()]);
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
  const fetchRanking = async () => {
    const res = await fetch('http://localhost:5000/ranking');
    const data = await res.json();
    setRanking(data);
  };

  const submitScore = async () => {
    await fetch('http://localhost:5000/submit_score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: scoreRef.current }),
    });
    setName('');
    fetchRanking();
  };

  useEffect(() => {
    fetchRanking();
  }, []);

  // 게임 재시작
  const restart = () => {
    setCarX(GAME_WIDTH / 2 - CAR_WIDTH / 2);
    setObstacles([]);
    setScore(0);
    scoreRef.current = 0;
    setLines(initialLines);
    setGameOver(false);
    setName('');
    fetchRanking(); // 재시작 시 랭킹 다시 불러오기 (이미 하단에 표시되지만 혹시 몰라 추가)
  };

  return (
    <div style={{
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif', // 현대적인 폰트 적용
      backgroundColor: '#f0f0f0', // 배경색 변경
      minHeight: '100vh', // 전체 높이 채우기
      padding: '20px 0', // 상하 패딩
      position: 'relative', // 랭킹 푸터를 위해 필요
      paddingBottom: '80px', // 푸터 높이만큼 패딩
    }}>
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
          margin: '20px auto',
          background: 'linear-gradient(to bottom, #6a6a6a, #444444)', // 그라데이션 배경 변경
          overflow: 'hidden',
          border: '5px solid #777', // 테두리 변경
          boxShadow: '0 0 15px rgba(0,0,0,0.6)', // 그림자 강화
          borderRadius: '12px', // 모서리 더 둥글게
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
        {/* 플레이어 자동차 */}
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
              background: 'linear-gradient(to bottom, #a0a0a0, #888888)', // 장애물 색상 그라데이션
              borderRadius: 10,
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // 장애물 그림자
            }}
          />
        ))}
      </div>
      <h2 style={{ color: '#333', marginTop: '10px' }}>점수: {score}</h2>
      {gameOver && (
        <div>
          <h2>게임 오버!</h2>
          <input
            placeholder="이름 입력"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              marginRight: '10px',
              padding: '10px 12px', // 패딩 증가
              borderRadius: '6px', // 모서리 더 둥글게
              border: '1px solid #ccc',
              fontSize: '1rem', // 폰트 크기
            }}
          />
          <button onClick={submitScore} disabled={!name}
            style={{
              padding: '10px 20px', // 패딩 증가
              backgroundColor: '#28a745', // 녹색 계열 버튼
              color: 'white',
              border: 'none',
              borderRadius: '6px', // 모서리 둥글게
              cursor: 'pointer',
              fontSize: '1rem', // 폰트 크기
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // 버튼 그림자
              transition: 'background-color 0.2s ease', // 호버 효과 준비
            }}
          >
            점수 제출
          </button>
          <button onClick={restart}
            style={{
              padding: '10px 20px', // 패딩 증가
              backgroundColor: '#007bff', // 파란색 계열 버튼
              color: 'white',
              border: 'none',
              borderRadius: '6px', // 모서리 둥글게
              cursor: 'pointer',
              fontSize: '1rem', // 폰트 크기
              marginLeft: '10px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // 버튼 그림자
              transition: 'background-color 0.2s ease', // 호버 효과 준비
            }}
          >
            다시 시작
          </button>
        </div>
      )}

      {/* 항상 하단에 랭킹 표시 */}
      <div style={{
        position: 'fixed',
        left: '10px',
        bottom: '10px',
        width: '240px',
        background: '#444', // 배경색
        color: '#fff',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 1000,
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)', // 그림자
      }}>
        <h3 style={{margin: '0 0 8px 0'}}>순위</h3>
        <ol style={{
          listStyle: 'none', // 기본 목록 스타일 제거
          padding: 0,
          margin: 0,
        }}>
          {/* 랭킹 데이터 매핑 */}
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
