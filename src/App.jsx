import React, { useState, useEffect } from 'react';
import { Calendar, User, Trash2, Plus, CheckCircle, AlertCircle, RefreshCw, Edit2, Settings, Phone, Heart } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase 초기 설정 ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 상수 정의 ---
const ROOMS = ['A', 'B', 'C'];
const ROOM_LABELS = { A: '상담실 A', B: '상담실 B', C: '상담실 C' };
const ROOM_COLORS = {
  A: 'bg-blue-500',
  B: 'bg-emerald-500',
  C: 'bg-violet-500',
};
const ROOM_LIGHT = {
  A: 'bg-blue-50 text-blue-700 border-blue-200',
  B: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  C: 'bg-violet-50 text-violet-700 border-violet-200',
};

// 30분 단위 슬롯 생성 (00:00 ~ 23:30)
const TIME_SLOTS = [];
for (let h = 0; h < 24; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

// 시간을 분 단위 숫자로 변환 (정렬/계산용)
const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// 시간 표시 포맷 (24시간 → "오전 9:00" 형태)
const formatTimeDisplay = (t) => {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${displayH}:${String(m).padStart(2, '0')}`;
};

// 두 시간 슬롯이 겹치는지 확인
const isOverlapping = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
};

// 사용자 ID (브라우저 고유)
const getUserId = () => {
  let userId = localStorage.getItem('consult_user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('consult_user_id', userId);
  }
  return userId;
};

const App = () => {
  const [userId] = useState(getUserId());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // 수정 모드일 때 해당 예약 ID
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRoom, setSelectedRoom] = useState('A');
  const [formData, setFormData] = useState({
    room: 'A',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '11:00',
    name: '',
    cohort: '',
  });
  const [message, setMessage] = useState(null);

  // 예약 불러오기
  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Fetch Error:', error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  // 초기 로드 + 실시간 동기화
  useEffect(() => {
    fetchReservations();
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showTempMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // 예약 추가/수정 모달 열기
  const openAddModal = (slot = null) => {
    setEditingId(null);
    setFormData({
      room: selectedRoom,
      date: selectedDate,
      start_time: slot || '10:00',
      end_time: slot ? addMinutes(slot, 60) : '11:00',
      name: '',
      cohort: '',
    });
    setShowModal(true);
  };

  const openEditModal = (res) => {
    setEditingId(res.id);
    setFormData({
      room: res.room,
      date: res.date,
      start_time: res.start_time,
      end_time: res.end_time,
      name: res.name,
      cohort: res.cohort || '',
    });
    setShowModal(true);
  };

  const addMinutes = (time, minutes) => {
    const total = timeToMinutes(time) + minutes;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 예약 저장 (추가/수정)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showTempMessage('이름을 입력해주세요.', 'error');
    if (timeToMinutes(formData.end_time) <= timeToMinutes(formData.start_time)) {
      return showTempMessage('종료 시간이 시작 시간보다 늦어야 합니다.', 'error');
    }

    // 중복 체크 (수정 모드면 자기 자신은 제외)
    const conflict = reservations.find(r =>
      r.id !== editingId &&
      r.room === formData.room &&
      r.date === formData.date &&
      isOverlapping(r.start_time, r.end_time, formData.start_time, formData.end_time)
    );

    if (conflict) {
      return showTempMessage(
        `${formatTimeDisplay(conflict.start_time)} ~ ${formatTimeDisplay(conflict.end_time)} ${conflict.name}님 예약과 겹칩니다.`,
        'error'
      );
    }

    if (editingId) {
      // 수정
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
        .eq('id', editingId);

      if (error) {
        showTempMessage('수정 실패. 다시 시도해주세요.', 'error');
      } else {
        setShowModal(false);
        showTempMessage('예약이 수정되었습니다.', 'success');
      }
    } else {
      // 추가
      const { error } = await supabase
        .from('reservations')
        .insert([{
          room: formData.room,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          name: formData.name.trim(),
          cohort: formData.cohort.trim() || null,
          user_id: userId,
          status: 'scheduled',
        }]);

      if (error) {
        showTempMessage('저장 실패. 다시 시도해주세요.', 'error');
      } else {
        setShowModal(false);
        showTempMessage('예약이 완료되었습니다.', 'success');
      }
    }
  };

  // 예약 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('예약을 취소하시겠습니까?')) return;
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) {
      showTempMessage('삭제 실패.', 'error');
    } else {
      showTempMessage('예약이 삭제되었습니다.', 'success');
    }
  };

  // 현재 화면에 보일 예약 필터링
  const visibleReservations = reservations.filter(
    r => r.room === selectedRoom && r.date === selectedDate
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 text-gray-900 font-sans pb-24">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-20 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
              <Heart size={18} className="text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 leading-tight">사랑의전화</h1>
              <p className="text-[10px] text-gray-500 font-bold tracking-wider">상담 스케줄</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {loading && <RefreshCw size={16} className="animate-spin text-gray-400" />}
            <a
              href="/admin"
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
              title="관리자 페이지"
            >
              <Settings size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* 토스트 메시지 */}
      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'} animate-bounce max-w-[90%]`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">{message.text}</span>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-5">
        {/* 날짜 선택 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              <span className="text-sm font-bold text-gray-600">날짜 선택</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
            />
          </div>
        </div>

        {/* 상담실 탭 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {ROOMS.map(room => {
            const count = reservations.filter(r => r.room === room && r.date === selectedDate).length;
            const isActive = selectedRoom === room;
            return (
              <button
                key={room}
                onClick={() => setSelectedRoom(room)}
                className={`relative py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive
                    ? `${ROOM_COLORS[room]} text-white shadow-lg`
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div>{ROOM_LABELS[room]}</div>
                <div className={`text-[10px] mt-0.5 font-bold ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                  {count}건
                </div>
              </button>
            );
          })}
        </div>

        {/* 예약 목록 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
              {ROOM_LABELS[selectedRoom]} 예약
            </span>
            <span className="text-xs font-bold text-gray-400">
              {visibleReservations.length}건
            </span>
          </div>

          {visibleReservations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Phone size={22} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">아직 예약이 없습니다</p>
              <p className="text-xs text-gray-300 mt-1">아래 버튼으로 예약을 추가하세요</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {visibleReservations.map(res => {
                const isMine = res.user_id === userId;
                return (
                  <div key={res.id} className="p-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${ROOM_LIGHT[res.room]}`}>
                          {formatTimeDisplay(res.start_time)} ~ {formatTimeDisplay(res.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400" />
                        <span className="text-sm font-bold text-gray-800">{res.name}</span>
                        {res.cohort && (
                          <span className="text-[10px] font-bold text-gray-400">· {res.cohort}</span>
                        )}
                      </div>
                    </div>

                    {isMine && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(res)}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="수정"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(res.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 예약 추가 버튼 */}
      {!showModal && (
        <button
          onClick={() => openAddModal()}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-xl shadow-blue-300/40 flex items-center justify-center gap-2 font-bold text-base active:scale-95 transition-transform z-10"
        >
          <Plus size={22} />
          예약하기
        </button>
      )}

      {/* 예약 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-gray-900">
                {editingId ? '예약 수정' : '상담실 예약'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 text-2xl leading-none px-2"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* 날짜 */}
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">날짜</label>
                <input
                  type="date"
                  className="w-full mt-1 p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {/* 상담실 */}
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">상담실</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {ROOMS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, room: r })}
                      className={`py-3 rounded-xl font-bold text-sm transition-all ${
                        formData.room === r
                          ? `${ROOM_COLORS[r]} text-white shadow-md`
                          : 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">시작 시간</label>
                  <select
                    className="w-full mt-1 p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{formatTimeDisplay(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">종료 시간</label>
                  <select
                    className="w-full mt-1 p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{formatTimeDisplay(t)}</option>
                    ))}
                    <option value="24:00">자정 (24:00)</option>
                  </select>
                </div>
              </div>

              {/* 이름 + 기수 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">상담원 이름</label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    className="w-full mt-1 p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider ml-1">기수</label>
                  <input
                    type="text"
                    placeholder="12기"
                    className="w-full mt-1 p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    value={formData.cohort}
                    onChange={e => setFormData({ ...formData, cohort: e.target.value })}
                  />
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 p-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-[2] p-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-transform"
                >
                  {editingId ? '수정 저장' : '예약 확정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
