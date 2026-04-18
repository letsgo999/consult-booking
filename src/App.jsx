import React, { useState, useEffect } from 'react';
import { Calendar, User, Trash2, Plus, CheckCircle, AlertCircle, Shield, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- Supabase 초기 설정 ---
// Vercel 환경변수에서 값을 읽어옵니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ROOMS = ['상담실 A', '상담실 B', '상담실 C'];
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => `${i + 9}:00`);

// 익명 사용자 ID를 브라우저에 저장 (누가 예약했는지 식별용)
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    room: ROOMS[0],
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    name: ''
  });
  const [message, setMessage] = useState(null);

  // 예약 목록 불러오기
  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch Error:', error);
    } else {
      setReservations(data || []);
    }
    setLoading(false);
  };

  // 1. 초기 데이터 로드 + 실시간 동기화 구독
  useEffect(() => {
    fetchReservations();

    // 실시간 구독: 다른 사람이 예약을 추가/삭제하면 즉시 반영됨
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchReservations();
        }
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

  const handleAddReservation = async (e) => {
    e.preventDefault();
    if (!formData.name) return showTempMessage("이름을 입력해주세요.", "error");

    const isDuplicate = reservations.some(res =>
      res.date === formData.date &&
      res.time === formData.time &&
      res.room === formData.room
    );

    if (isDuplicate) {
      return showTempMessage("해당 시간대에 이미 예약이 있습니다.", "error");
    }

    const { error } = await supabase
      .from('reservations')
      .insert([{
        room: formData.room,
        date: formData.date,
        time: formData.time,
        name: formData.name,
        user_id: userId
      }]);

    if (error) {
      console.error('Insert Error:', error);
      showTempMessage("저장 실패. 다시 시도해주세요.", "error");
    } else {
      setShowAddModal(false);
      setFormData({ ...formData, name: '' });
      showTempMessage("예약이 완료되었습니다.", "success");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("예약을 취소하시겠습니까?")) {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete Error:', error);
        showTempMessage("삭제 실패.", "error");
      } else {
        showTempMessage("예약이 삭제되었습니다.", "success");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <header className="bg-white border-b sticky top-0 z-10 p-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-blue-600 leading-none">사랑의전화 예약</h1>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">실시간 예약 시스템</p>
        </div>
        <div className="flex gap-2">
          {loading && <RefreshCw size={18} className="animate-spin text-gray-400 mr-2" />}
          <button
            onClick={() => setIsAdmin(!isAdmin)}
            className={`p-2 rounded-xl transition-all ${isAdmin ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
          >
            <Shield size={20} />
          </button>
        </div>
      </header>

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <main className="p-4 max-w-md mx-auto">
        <div className="mb-6 flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          {ROOMS.map(room => (
            <button
              key={room}
              onClick={() => setFormData({ ...formData, room })}
              className={`px-5 py-2.5 rounded-2xl whitespace-nowrap text-sm font-bold transition-all ${formData.room === room ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500'}`}
            >
              {room}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-500" />
              <span className="font-bold text-gray-700">{formData.date}</span>
            </div>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="text-sm font-bold text-blue-600 bg-transparent border-none focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="divide-y divide-gray-50">
            {TIME_SLOTS.map(slot => {
              const res = reservations.find(r => r.room === formData.room && r.date === formData.date && r.time === slot);
              return (
                <div key={slot} className="p-4 flex items-center justify-between transition-colors hover:bg-blue-50/30">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-gray-300 w-10">{slot}</span>
                    {res ? (
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                        <User size={12} className="text-blue-600" />
                        <span className="text-sm font-bold text-blue-700">{res.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-300 font-medium">비어 있음</span>
                    )}
                  </div>

                  {res ? (
                    (isAdmin || res.user_id === userId) && (
                      <button onClick={() => handleDelete(res.id)} className="text-red-300 hover:text-red-500 p-2 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        setFormData({ ...formData, time: slot });
                        setShowAddModal(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-gray-50 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-inner"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {!showAddModal && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-14 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-transform"
        >
          <Plus size={24} /> 예약하기
        </button>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8">
            <h2 className="text-2xl font-black mb-6 text-gray-800 tracking-tight">상담실 예약</h2>
            <form onSubmit={handleAddReservation} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">방 선택</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  >
                    {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">시간</label>
                  <select
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">예약자 성함</label>
                <input
                  type="text"
                  placeholder="성함을 입력하세요"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 p-4 bg-gray-100 text-gray-500 font-bold rounded-2xl"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className="flex-[2] p-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-transform"
                >
                  예약 확정
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
