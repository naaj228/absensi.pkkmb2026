import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppContextProvider } from './context/AppContext';
import AdminLayout from './layouts/AdminLayout';
import MentorLayout from './layouts/MentorLayout';

import LoginAdmin from './pages/admin/LoginAdmin';
import LoginMentor from './pages/mentor/LoginMentor';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPeserta from './pages/admin/AdminPeserta';
import AdminMentor from './pages/admin/AdminMentor';
import AdminGugus from './pages/admin/AdminGugus';
import AdminApproval from './pages/admin/AdminApproval';
import AdminQrManagement from './pages/admin/AdminQrManagement';
import AdminRiwayat from './pages/admin/AdminRiwayat';
import AdminPesertaDetail from './pages/admin/AdminPesertaDetail';
import AdminGugusDetail from './pages/admin/AdminGugusDetail';
import AdminNotifikasi from './pages/admin/AdminNotifikasi';

import MentorQrScanner from './pages/mentor/MentorQrScanner';
import MentorPeserta from './pages/mentor/MentorPeserta';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MentorAbsensiManual from './pages/mentor/MentorAbsensiManual';
import MentorNotifikasi from './pages/mentor/MentorNotifikasi';

import { useContext } from 'react';
import { AppContext } from './context/AppContext';

function RootRedirect() {
  const { adminUser, mentorUser } = useContext(AppContext);
  if (adminUser) {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (mentorUser) {
    return <Navigate to="/mentor/dashboard" replace />;
  }
  return <Navigate to="/login-mentor" replace />;
}

function AppContent() {
  const { loading } = useContext(AppContext);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#000423] text-white flex flex-col items-center justify-center z-[9999] font-body-lg">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#869aff] animate-spin"></div>
        </div>
        <p className="text-body-lg font-semibold tracking-wider animate-pulse">Menghubungkan ke Supabase...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login-mentor" element={<LoginMentor />} />
        <Route path="/admin/login" element={<LoginAdmin />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="peserta" element={<AdminPeserta />} />
          <Route path="peserta/:id" element={<AdminPesertaDetail />} />
          <Route path="mentor" element={<AdminMentor />} />
          <Route path="gugus" element={<AdminGugus />} />
          <Route path="gugus/:id" element={<AdminGugusDetail />} />
          <Route path="approval" element={<AdminApproval />} />
          <Route path="qr-management" element={<AdminQrManagement />} />
          <Route path="riwayat" element={<AdminRiwayat />} />
          <Route path="notifikasi" element={<AdminNotifikasi />} />
        </Route>

        <Route path="/mentor" element={<MentorLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MentorDashboard />} />
          <Route path="peserta" element={<MentorPeserta />} />
          <Route path="scanner-qr" element={<MentorQrScanner />} />
          <Route path="absensi-manual" element={<MentorAbsensiManual />} />
          <Route path="notifikasi" element={<MentorNotifikasi />} />
        </Route>

        <Route path="*" element={<Navigate to="/login-mentor" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppContextProvider>
      <AppContent />
    </AppContextProvider>
  );
}
