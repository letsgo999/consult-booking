import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, User, Trash2, Edit2, LogOut, BarChart3, Users, Building2,
  CheckCircle, AlertCircle, ArrowLeft, RefreshCw, Search, Filter, Lock
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ROOMS = ['A', 'B', 'C'];
const ROOM_LABELS = { A: '상담실 A', B: '상담실 B', C: '상담실 C' };
const ROOM_COLORS = {
  A: 'bg-blue-500',
  B: 'bg-emerald-500',
  C: 'bg-violet-500',
};

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const formatTimeDisplay = (t) => {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${displayH}:${String(m).padStart(2, '0')}`;
};

const minutesToHours = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
};

const Admin = () => {
  const [session, setSession] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  // 로그인 상태 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAuthorization(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      checkAuthorization(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthorization = async (session) => {
    if (!session) {
      setIsAuthorized(false);
      setChecking(false);
      return;
    }

    // admins 테이블에서 이메일 확인
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .eq('email', session.user.email)
      .maybeSingle();

    setIsAuthorized(!!data && !error);
    setChecking(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (!isAuthorized) return <UnauthorizedScreen email={session.user.email} />;

  return <AdminDashboard email={session.user.email} />;
};

// ====================
// 로그인 화면
// ====================
const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-300/40 mb-4">
            <Lock size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">관리자 로그인</h1>
          <p className="text-sm text-gray-500 mt-1.5">사랑의전화 상담 스케줄</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 border border-gray-100 p-6 space-y-4">
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">이메일</label>
            <input
              type="email"
              required
              className="w-full mt-1 p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">비밀번호</label>
            <input
              type="password"
              required
              className="w-full mt-1 p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <a href="/" className="block text-center text-sm font-bold text-gray-400 hover:text-gray-600 pt-2">
            ← 메인 화면으로
          </a>
        </form>
      </div>
    </div>
  );
};

// ====================
// 권한 없음 화면
// ====================
const UnauthorizedScreen = ({ email }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 max-w-sm text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-red-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">접근 권한이 없습니다</h2>
        <p className="text-sm text-gray-500 mb-1">로그인된 계정: <span className="font-bold text-gray-700">{email}</span></p>
        <p className="text-xs text-gray-400 mb-6">관리자 권한이 등록된 이메일로 로그인해주세요.</p>
        <button
          onClick={handleLogout}
          className="w-full p-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm"
        >
          다른 계정으로 로그인
        </button>
        <a href="/" className="block mt-3 text-sm font-bold text-gray-400">← 메인 화면으로</a>
      </div>
    </div>
  );
};

// ====================
// 관리자 대시보드
// ====================
const AdminDashboard = ({ email }) => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'stats'
  const [message, setMessage] = useState(null);
  const [editingRes, setEditingRes] = useState(null);

  // 필터
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterRoom, setFilterRoom] = useState('all');
  const [filterName, setFilterName] = useState('');

  // 통계 기간 선택
  const [statsRange, setStatsRange] = useState('month'); // 'month' | 'year' | 'all'

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: false })
      .order('start_time', { ascending: true });

    if (!error) setReservations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
    const channel = supabase
      .channel('admin-reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' },
        () => fetchReservations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const showTempMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 예약을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) {
      showTempMessage('삭제 실패', 'error');
    } else {
      showTempMessage('삭제되었습니다', 'success');
    }
  };

  // 필터링된 예약
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      if (filterDateFrom && r.date < filterDateFrom) return false;
      if (filterDateTo && r.date > filterDateTo) return false;
      if (filterRoom !== 'all' && r.room !== filterRoom) return false;
      if (filterName && !r.name.includes(filterName) && !(r.cohort || '').includes(filterName)) return false;
      return true;
    });
  }, [reservations, filterDateFrom, filterDateTo, filterRoom, filterName]);

  // 통계 계산
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const thisYear = today.substring(0, 4);

    let target = reservations;
    if (statsRange === 'month') target = reservations.filter(r => r.date.startsWith(thisMonth));
    else if (statsRange === 'year') target = reservations.filter(r => r.date.startsWith(thisYear));

    // 전체
    const totalCount = target.length;
    const totalMinutes = target.reduce((sum, r) =>
      sum + (timeToMinutes(r.end_time) - timeToMinutes(r.start_time)), 0);

    // 상담원별 누적 시간
    const byCounselor = {};
    target.forEach(r => {
      const key = r.cohort ? `${r.name} (${r.cohort})` : r.name;
      if (!byCounselor[key]) byCounselor[key] = { count: 0, minutes: 0 };
      byCounselor[key].count += 1;
      byCounselor[key].minutes += timeToMinutes(r.end_time) - timeToMinutes(r.start_time);
    });
    const counselorList = Object.entries(byCounselor)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.minutes - a.minutes);

    // 상담실별
    const byRoom = { A: 0, B: 0, C: 0 };
    const byRoomMinutes = { A: 0, B: 0, C: 0 };
    target.forEach(r => {
      byRoom[r.room] = (byRoom[r.room] || 0) + 1;
      byRoomMinutes[r.room] = (byRoomMinutes[r.room] || 0) + (timeToMinutes(r.end_time) - timeToMinutes(r.start_time));
    });

    return {
      totalCount,
      totalMinutes,
      counselorList,
      byRoom,
      byRoomMinutes,
    };
  }, [reservations, statsRange]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
              <ArrowLeft size={18} className="text-gray-600" />
            </a>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-tight">관리자 페이지</h1>
              <p className="text-[10px] text-gray-500 font-bold">{email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>

        {/* 탭 */}
        <div className="max-w-4xl mx-auto mt-3 flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Filter size={14} />
            예약 관리
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'stats' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <BarChart3 size={14} />
            통계
          </button>
        </div>
      </header>

      {message && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold ${
          message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 pt-5">
        {activeTab === 'list' ? (
          <ReservationListTab
            reservations={filteredReservations}
            loading={loading}
            filterDateFrom={filterDateFrom} setFilterDateFrom={setFilterDateFrom}
            filterDateTo={filterDateTo} setFilterDateTo={setFilterDateTo}
            filterRoom={filterRoom} setFilterRoom={setFilterRoom}
            filterName={filterName} setFilterName={setFilterName}
            onDelete={handleDelete}
            onEdit={setEditingRes}
          />
        ) : (
          <StatsTab stats={stats} statsRange={statsRange} setStatsRange={setStatsRange} />
        )}
      </main>

      {editingRes && (
        <EditModal
          reservation={editingRes}
          onClose={() => setEditingRes(null)}
          onSuccess={() => {
            setEditingRes(null);
            showTempMessage('수정되었습니다', 'success');
          }}
          onError={() => showTempMessage('수정 실패', 'error')}
        />
      )}
    </div>
  );
};

// ====================
// 예약 관리 탭
// ====================
const ReservationListTab = ({
  reservations, loading,
  filterDateFrom, setFilterDateFrom, filterDateTo, setFilterDateTo,
  filterRoom, setFilterRoom, filterName, setFilterName,
  onDelete, onEdit,
}) => {
  return (
    <>
      {/* 필터 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">시작일</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">종료일</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">상담실</label>
            <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-300">
              <option value="all">전체</option>
              {ROOMS.map(r => <option key={r} value={r}>{ROOM_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">이름/기수</label>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="검색"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>
      </div>

      {/* 결과 카운트 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
          전체 예약 ({reservations.length}건)
        </span>
        {loading && <RefreshCw size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* 예약 목록 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {reservations.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm font-medium">
            조건에 맞는 예약이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reservations.map(res => (
              <div key={res.id} className="p-4 hover:bg-blue-50/30 transition-colors flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-xs font-black text-gray-500">{res.date}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black text-white ${ROOM_COLORS[res.room]}`}>
                      {ROOM_LABELS[res.room]}
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      {formatTimeDisplay(res.start_time)} ~ {formatTimeDisplay(res.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-900">{res.name}</span>
                    {res.cohort && <span className="text-[10px] font-bold text-gray-400">· {res.cohort}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(res)}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => onDelete(res.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ====================
// 통계 탭
// ====================
const StatsTab = ({ stats, statsRange, setStatsRange }) => {
  const maxRoomMinutes = Math.max(...Object.values(stats.byRoomMinutes), 1);

  return (
    <>
      {/* 기간 선택 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {[
          { key: 'month', label: '이번 달' },
          { key: 'year', label: '올해' },
          { key: 'all', label: '전체' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setStatsRange(opt.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              statsRange === opt.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar size={12} className="text-blue-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">총 상담건수</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.totalCount}<span className="text-sm text-gray-400 ml-1">건</span></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={12} className="text-emerald-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">총 상담시간</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{minutesToHours(stats.totalMinutes)}</div>
        </div>
      </div>

      {/* 상담실별 가동 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Building2 size={14} className="text-gray-500" />
          <span className="text-xs font-black text-gray-700 uppercase tracking-wider">상담실별 가동</span>
        </div>
        <div className="space-y-3">
          {ROOMS.map(room => {
            const minutes = stats.byRoomMinutes[room] || 0;
            const count = stats.byRoom[room] || 0;
            const percent = (minutes / maxRoomMinutes) * 100;
            return (
              <div key={room}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-gray-700">{ROOM_LABELS[room]}</span>
                  <span className="text-xs font-bold text-gray-500">
                    {count}건 · {minutesToHours(minutes)}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${ROOM_COLORS[room]} rounded-full transition-all`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 상담원별 누적 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center gap-1.5">
          <Users size={14} className="text-gray-500" />
          <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
            상담원별 누적 ({stats.counselorList.length}명)
          </span>
        </div>
        {stats.counselorList.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400 font-medium">
            해당 기간에 데이터가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.counselorList.map((c, i) => (
              <div key={c.name} className="px-4 py-3 flex items-center justify-between hover:bg-blue-50/30">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                    i < 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{c.name}</div>
                    <div className="text-[10px] font-bold text-gray-400">{c.count}건</div>
                  </div>
                </div>
                <div className="text-sm font-black text-gray-900">{minutesToHours(c.minutes)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ====================
// 수정 모달
// ====================
const EditModal = ({ reservation, onClose, onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    room: reservation.room,
    date: reservation.date,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    name: reservation.name,
    cohort: reservation.cohort || '',
  });

  const TIME_SLOTS = [];
  for (let h = 0; h < 24; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (timeToMinutes(formData.end_time) <= timeToMinutes(formData.start_time)) {
      return alert('종료 시간이 시작 시간보다 늦어야 합니다.');
    }

    const { error } = await supabase
      .from('reservations')
      .update({
        room: formData.room,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        name: formData.name.trim(),
        cohort: formData.cohort.trim() || null,
      })
      .eq('id', reservation.id);

    if (error) onError();
    else onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-gray-900">예약 수정</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none px-2">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">날짜</label>
            <input type="date" required
              className="w-full mt-1 p-3.5 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-blue-500"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </div>

          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">상담실</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {ROOMS.map(r => (
                <button key={r} type="button"
                  onClick={() => setFormData({ ...formData, room: r })}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    formData.room === r ? `${ROOM_COLORS[r]} text-white shadow-md` : 'bg-gray-50 text-gray-500'
                  }`}>{r}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">시작</label>
              <select className="w-full mt-1 p-3.5 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-blue-500"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{formatTimeDisplay(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">종료</label>
              <select className="w-full mt-1 p-3.5 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-blue-500"
                value={formData.end_time}
                onChange={e => setFormData({ ...formData, end_time: e.target.value })}>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{formatTimeDisplay(t)}</option>)}
                <option value="24:00">자정 (24:00)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">이름</label>
              <input type="text" required
                className="w-full mt-1 p-3.5 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">기수</label>
              <input type="text"
                className="w-full mt-1 p-3.5 bg-gray-50 rounded-xl font-bold border-none focus:ring-2 focus:ring-blue-500"
                value={formData.cohort}
                onChange={e => setFormData({ ...formData, cohort: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button type="button" onClick={onClose} className="flex-1 p-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl">취소</button>
            <button type="submit" className="flex-[2] p-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Admin;
