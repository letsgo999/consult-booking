import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Admin from './Admin.jsx'

// URL 경로에 따라 컴포넌트 분기
// /admin 으로 접속하면 관리자 페이지, 그 외에는 일반 사용자 페이지
const path = window.location.pathname;
const Component = path.startsWith('/admin') ? Admin : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>,
)
