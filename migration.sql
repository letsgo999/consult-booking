-- ============================================
-- v1.2 데이터베이스 마이그레이션 스크립트
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ============================================

-- 1. 기존 reservations 테이블 삭제 (테스트 데이터만 있으니 안전)
DROP TABLE IF EXISTS reservations CASCADE;

-- 2. 새 reservations 테이블 생성
CREATE TABLE reservations (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 예약 기본 정보
  room TEXT NOT NULL,              -- 'A' | 'B' | 'C'
  date TEXT NOT NULL,              -- 'YYYY-MM-DD'
  start_time TEXT NOT NULL,        -- 'HH:MM' (30분 단위)
  end_time TEXT NOT NULL,          -- 'HH:MM' (30분 단위)
  
  -- 예약자 정보
  name TEXT NOT NULL,              -- 상담원 이름
  cohort TEXT,                     -- 상담원 기수 (예: '12기')
  
  -- 상태 관리
  status TEXT DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'cancelled'
  
  -- 식별자 (브라우저별 고유 ID, 본인 예약 수정/삭제 권한 확인용)
  user_id TEXT NOT NULL
);

-- 3. 인덱스 추가 (조회 속도 향상)
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_room_date ON reservations(room, date);
CREATE INDEX idx_reservations_name ON reservations(name);

-- 4. RLS 비활성화 (개발 단계)
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;

-- 5. 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;

-- ============================================
-- 6. 관리자 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- 7. 관리자 이메일 등록 (실제 관리자 이메일로 교체!)
-- 아래 3줄의 이메일을 실제 관리자분들 이메일로 바꿔주세요.
-- INSERT INTO admins (email) VALUES ('admin1@example.com');
-- INSERT INTO admins (email) VALUES ('admin2@example.com');
-- INSERT INTO admins (email) VALUES ('admin3@example.com');

-- ============================================
-- 완료! 결과 확인:
-- ============================================
SELECT 'reservations 테이블 생성 완료' AS status;
SELECT 'admins 테이블 생성 완료' AS status;
