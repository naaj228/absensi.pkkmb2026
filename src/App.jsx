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
import AdminNotifikasi from './pages/admin/AdminNotifikasi';

import MentorQrScanner from './pages/mentor/MentorQrScanner';
import MentorPeserta from './pages/mentor/MentorPeserta';
import MentorDashboard from './pages/mentor/MentorDashboard';
import MentorAbsensiManual from './pages/mentor/MentorAbsensiManual';
import MentorNotifikasi from './pages/mentor/MentorNotifikasi';

export default function App() {
  return (
    <AppContextProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login-mentor" replace />} />
          <Route path="/login-mentor" element={<LoginMentor />} />
          <Route path="/admin/login" element={<LoginAdmin />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="peserta" element={<AdminPeserta />} />
            <Route path="peserta/:id" element={<AdminPesertaDetail />} />
            <Route path="mentor" element={<AdminMentor />} />
            <Route path="gugus" element={<AdminGugus />} />
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
    </AppContextProvider>
  );
}
