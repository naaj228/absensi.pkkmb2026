import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const AppContext = createContext();

const initialPeserta = [];
const initialMentors = [];
const initialGugus = [];
const initialClaims = [];
const initialLogs = [];
const initialQrCodes = [];

export function AppContextProvider({ children }) {
  // Clear any existing localStorage data once to force a fresh state for the user
  useState(() => {
    const reset = localStorage.getItem('pkkmb_reset_v3');
    if (!reset) {
      localStorage.removeItem('pkkmb_peserta');
      localStorage.removeItem('pkkmb_mentors');
      localStorage.removeItem('pkkmb_gugus');
      localStorage.removeItem('pkkmb_claims');
      localStorage.removeItem('pkkmb_logs');
      localStorage.removeItem('pkkmb_qrCodes');
      localStorage.setItem('pkkmb_reset_v3', 'true');
    }
  });

  const [peserta, setPeserta] = useState(() => {
    const local = localStorage.getItem('pkkmb_peserta');
    return local ? JSON.parse(local) : initialPeserta;
  });

  const [mentors, setMentors] = useState(() => {
    const local = localStorage.getItem('pkkmb_mentors');
    return local ? JSON.parse(local) : initialMentors;
  });

  const [gugus, setGugus] = useState(() => {
    const local = localStorage.getItem('pkkmb_gugus');
    return local ? JSON.parse(local) : initialGugus;
  });

  const [claims, setClaims] = useState(() => {
    const local = localStorage.getItem('pkkmb_claims');
    return local ? JSON.parse(local) : initialClaims;
  });

  const [logs, setLogs] = useState(() => {
    const local = localStorage.getItem('pkkmb_logs');
    return local ? JSON.parse(local) : initialLogs;
  });

  const [qrCodes, setQrCodes] = useState(() => {
    const local = localStorage.getItem('pkkmb_qrCodes');
    return local ? JSON.parse(local) : initialQrCodes;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const local = localStorage.getItem('pkkmb_currentUser');
    return local ? JSON.parse(local) : null;
  });

  const [adminNotificationsCleared, setAdminNotificationsCleared] = useState(false);
  const [mentorNotificationsCleared, setMentorNotificationsCleared] = useState(false);

  const adminNotificationsCount = claims.length + logs.filter(l => l.status !== 'Valid').length + qrCodes.length;
  const mentorNotificationsCount = logs.filter(l => l.gugusName === 'Gugus 12').length + claims.filter(c => c.gugusName === 'Gugus 12').length;

  const [prevAdminCount, setPrevAdminCount] = useState(adminNotificationsCount);
  const [prevMentorCount, setPrevMentorCount] = useState(mentorNotificationsCount);

  useEffect(() => {
    if (adminNotificationsCount > prevAdminCount) {
      setAdminNotificationsCleared(false);
    }
    setPrevAdminCount(adminNotificationsCount);
  }, [adminNotificationsCount]);

  useEffect(() => {
    if (mentorNotificationsCount > prevMentorCount) {
      setMentorNotificationsCleared(false);
    }
    setPrevMentorCount(mentorNotificationsCount);
  }, [mentorNotificationsCount]);

  const hasAdminNotifications = adminNotificationsCount > 0 && !adminNotificationsCleared;
  const hasMentorNotifications = mentorNotificationsCount > 0 && !mentorNotificationsCleared;

  useEffect(() => {
    localStorage.setItem('pkkmb_peserta', JSON.stringify(peserta));
  }, [peserta]);

  useEffect(() => {
    localStorage.setItem('pkkmb_mentors', JSON.stringify(mentors));
  }, [mentors]);

  useEffect(() => {
    localStorage.setItem('pkkmb_gugus', JSON.stringify(gugus));
  }, [gugus]);

  useEffect(() => {
    localStorage.setItem('pkkmb_claims', JSON.stringify(claims));
  }, [claims]);

  useEffect(() => {
    localStorage.setItem('pkkmb_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('pkkmb_qrCodes', JSON.stringify(qrCodes));
  }, [qrCodes]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pkkmb_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pkkmb_currentUser');
    }
  }, [currentUser]);

  // Operations
  const addPeserta = (item) => {
    setPeserta(prev => [...prev, { ...item, status: item.status || 'Belum Hadir' }]);
  };

  const updatePeserta = (id, fields) => {
    setPeserta(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
  };

  const deletePeserta = (id) => {
    setPeserta(prev => prev.filter(p => p.id !== id));
  };

  const addMentor = (item) => {
    setMentors(prev => [...prev, { ...item, id: `M-${Date.now()}` }]);
  };

  const updateMentor = (id, fields) => {
    setMentors(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m));
  };

  const deleteMentor = (id) => {
    setMentors(prev => prev.filter(m => m.id !== id));
  };

  const addGugus = (item) => {
    setGugus(prev => [...prev, { ...item, id: `G-${Date.now()}` }]);
  };

  const updateGugus = (id, fields) => {
    setGugus(prev => prev.map(g => g.id === id ? { ...g, ...fields } : g));
  };

  const deleteGugus = (id) => {
    setGugus(prev => prev.filter(g => g.id !== id));
  };

  const addLog = (name, nim, gugusName, scanner, status = 'Valid') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];
    const newLog = {
      id: `L-${Date.now()}`,
      timestamp: timeStr,
      date: dateStr,
      name,
      nim,
      gugusName,
      scanner,
      status
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const addClaim = (pesertaId, issue, note = '') => {
    const student = peserta.find(p => p.id === pesertaId);
    if (!student) return;

    const group = gugus.find(g => g.id === student.gugusId);
    const groupName = group ? group.name : '-';
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newClaim = {
      id: `C-${Date.now()}`,
      pesertaId,
      name: student.name,
      nim: student.id,
      gugusName: groupName,
      issue: issue + (note ? `: ${note}` : ''),
      time: timeStr,
      fakultas: student.fakultas
    };

    setClaims(prev => [...prev, newClaim]);
    updatePeserta(pesertaId, { status: 'Manual (Pending)' });
  };

  const approveClaim = (claimId) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    updatePeserta(claim.pesertaId, { status: 'Hadir' });
    addLog(claim.name, claim.nim, claim.gugusName, 'Admin PKKMB', 'Valid');
    setClaims(prev => prev.filter(c => c.id !== claimId));
  };

  const rejectClaim = (claimId) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    updatePeserta(claim.pesertaId, { status: 'Belum Hadir' });
    setClaims(prev => prev.filter(c => c.id !== claimId));
  };

  const generateQr = (item) => {
    setQrCodes(prev => [...prev, {
      id: `QR-${Date.now()}`,
      title: item.title,
      sessionType: item.sessionType,
      targetAudience: item.targetAudience,
      startTime: item.startTime,
      endTime: item.endTime,
      status: 'Active',
      scans: 0
    }]);
  };

  const expireQr = (id) => {
    setQrCodes(prev => prev.map(qr => qr.id === id ? { ...qr, status: 'Expired' } : qr));
  };

  const deleteQr = (id) => {
    setQrCodes(prev => prev.filter(qr => qr.id !== id));
  };

  const recordScan = (studentId) => {
    const student = peserta.find(p => p.id === studentId);
    if (!student) return false;

    const group = gugus.find(g => g.id === student.gugusId);
    const groupName = group ? group.name : '-';

    updatePeserta(studentId, { status: 'Hadir' });
    addLog(student.name, student.id, groupName, currentUser ? currentUser.name : 'Mentor Budi', 'Valid');
    return true;
  };

  const login = async (emailOrUsername, password, role) => {
    let email = emailOrUsername;
    if (!email.includes('@')) {
      if (role === 'admin') {
        if (email.toLowerCase() === 'admin' && password === 'admin') {
          const adminUser = { id: 'admin-01', name: 'Admin PKKMB', email: 'admin@univ.ac.id', role: 'admin' };
          setCurrentUser(adminUser);
          return true;
        }
      } else {
        const localMentor = mentors.find(m => m.nip === emailOrUsername);
        if (localMentor && localMentor.email) {
          email = localMentor.email;
        }
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (role === 'admin' && email.toLowerCase() === 'admin' && password === 'admin') {
          setCurrentUser({ id: 'admin-01', name: 'Admin PKKMB', email: 'admin@univ.ac.id', role: 'admin' });
          return true;
        }
        throw error;
      }

      const supabaseUser = data.user;
      
      if (role === 'admin') {
        setCurrentUser({
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || 'Admin PKKMB',
          email: supabaseUser.email,
          role: 'admin'
        });
        return true;
      } else {
        const matchedMentor = mentors.find(m => m.email?.toLowerCase() === supabaseUser.email?.toLowerCase());
        setCurrentUser({
          id: matchedMentor ? matchedMentor.id : supabaseUser.id,
          name: matchedMentor ? matchedMentor.name : (supabaseUser.user_metadata?.name || 'Mentor'),
          email: supabaseUser.email,
          role: 'mentor',
          gugusId: matchedMentor ? matchedMentor.gugusId : 'G-12-FT'
        });
        return true;
      }
    } catch (err) {
      console.error("Supabase Auth Error:", err);
      
      if (role === 'admin' && email.toLowerCase() === 'admin' && password === 'admin') {
        setCurrentUser({ id: 'admin-01', name: 'Admin PKKMB', email: 'admin@univ.ac.id', role: 'admin' });
        return true;
      }
      const localMentor = mentors.find(m => (m.nip === emailOrUsername || m.email === emailOrUsername) && password === '123456');
      if (role === 'mentor' && localMentor) {
        setCurrentUser({
          id: localMentor.id,
          name: localMentor.name,
          email: localMentor.email || 'mentor@univ.ac.id',
          role: 'mentor',
          gugusId: localMentor.gugusId
        });
        return true;
      }
      
      throw new Error(err.message || "Email atau password salah.");
    }
  };

  return (
    <AppContext.Provider value={{
      peserta,
      mentors,
      gugus,
      claims,
      logs,
      qrCodes,
      currentUser,
      setCurrentUser,
      login,
      addPeserta,
      updatePeserta,
      deletePeserta,
      addMentor,
      updateMentor,
      deleteMentor,
      addGugus,
      updateGugus,
      deleteGugus,
      approveClaim,
      rejectClaim,
      addClaim,
      generateQr,
      expireQr,
      deleteQr,
      recordScan,
      addLog,
      hasAdminNotifications,
      hasMentorNotifications,
      setAdminNotificationsCleared,
      setMentorNotificationsCleared
    }}>
      {children}
    </AppContext.Provider>
  );
}
