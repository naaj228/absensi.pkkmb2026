import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  pesertaDb,
  gugusDb,
  mentorsDb,
  claimsDb,
  logsDb,
  qrSessionsDb,
  locationSettingsDb
} from '../lib/db';

export const AppContext = createContext();

// Helper to parse DB date strings safely as UTC if they lack timezone offsets
const parseDbDate = (dateStr) => {
  if (!dateStr) return new Date();
  let formatted = dateStr;
  if (typeof dateStr === 'string') {
    formatted = dateStr.replace(' ', 'T');
    const hasTimezone = formatted.includes('Z') || 
                        /[+-]\d{2}(:\d{2})?$/.test(formatted) ||
                        /\+\d{2}$/.test(formatted);
    if (!hasTimezone && (formatted.includes('T') || formatted.includes(':'))) {
      formatted += 'Z';
    }
  }
  return new Date(formatted);
};

// Helper to format Date to YYYY-MM-DD in local timezone
const getLocalDateFormat = (dateVal) => {
  if (!dateVal) return '';
  const date = parseDbDate(dateVal);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ----------------------------------------------------
// DB to App State Transformers
// ----------------------------------------------------
const transformPeserta = (p) => ({
  id: p.nim,
  uuid: p.id,
  name: p.nama,
  email: p.email,
  gugusId: p.gugus_id || '',
  fakultas: p.jurusan || '',
  status: p.status || 'Belum Hadir',
  fotoUrl: p.foto_url || ''
});

const transformGugus = (g) => ({
  id: g.id,
  name: g.nama,
  mentorId: g.mentor_id || 'Unassigned',
  capacity: g.kuota || 30
});

const transformMentor = (m) => ({
  id: m.id,
  name: m.full_name || m.email,
  email: m.email,
  nip: m.nip || '',
  gugusId: m.gugus_id || 'Unassigned'
});

const transformClaim = (c) => ({
  id: c.id,
  pesertaId: c.nim,
  name: c.nama,
  nim: c.nim,
  gugusName: c.gugus_nama || '-',
  issue: c.issue,
  catatan: c.catatan || '',
  time: c.waktu || new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  requestedStatus: c.requested_status || 'Hadir Penuh'
});

const transformLog = (l) => ({
  id: l.id,
  waktu: l.waktu,
  timestamp: l.waktu ? parseDbDate(l.waktu).toTimeString().split(' ')[0] : '',
  date: l.waktu ? getLocalDateFormat(l.waktu) : '',
  name: l.peserta_nama || '',
  nim: l.peserta_nim || '',
  gugusName: l.gugus_nama || '-',
  scanner: l.dicatat_nama || 'System',
  status: l.status_log || 'Valid',
  note: l.catatan || '',
  latitude: l.latitude,
  longitude: l.longitude,
  locationStatus: l.location_status || 'Dalam Area',
  distanceMeters: l.distance_meters
});

const transformQr = (q) => ({
  id: q.kode,
  title: q.nama_sesi,
  sessionType: 'PKKMB',
  targetAudience: 'All',
  startTime: q.berlaku_mulai ? new Date(q.berlaku_mulai).toTimeString().split(' ')[0] : '',
  endTime: q.berlaku_sampai ? new Date(q.berlaku_sampai).toTimeString().split(' ')[0] : '',
  status: q.status === 'active' ? 'Active' : 'Expired',
  scans: 0
});

export function AppContextProvider({ children }) {
  const [peserta, setPeserta] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [gugus, setGugus] = useState([]);
  const [claims, setClaims] = useState([]);
  const [logs, setLogs] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Geofencing Location settings state
  const [locationSettings, setLocationSettings] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 150,
    locationName: 'Gedung Utama'
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const local = localStorage.getItem('pkkmb_currentUser_admin');
      return local ? JSON.parse(local) : null;
    } catch (e) {
      return null;
    }
  });

  const [mentorUser, setMentorUser] = useState(() => {
    try {
      const local = localStorage.getItem('pkkmb_currentUser_mentor');
      return local ? JSON.parse(local) : null;
    } catch (e) {
      return null;
    }
  });

  const currentUser = window.location.pathname.startsWith('/admin') ? adminUser : mentorUser;

  // Notification Dismissal states
  const [dismissedNotifications, setDismissedNotifications] = useState(() => {
    try {
      const local = localStorage.getItem('pkkmb_dismissed_notifications');
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  });

  const dismissNotification = (id) => {
    setDismissedNotifications(prev => {
      const updated = [...prev, id];
      localStorage.setItem('pkkmb_dismissed_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const dismissAllNotifications = (ids) => {
    setDismissedNotifications(prev => {
      const updated = Array.from(new Set([...prev, ...ids]));
      localStorage.setItem('pkkmb_dismissed_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const [adminNotificationsCleared, setAdminNotificationsCleared] = useState(false);
  const [mentorNotificationsCleared, setMentorNotificationsCleared] = useState(false);

  const mentorGugusId = currentUser?.gugusId || '';
  const mentorGugusObj = gugus.find(g => g.id === mentorGugusId);
  const mentorGugusName = mentorGugusObj ? mentorGugusObj.name : '';

  const activeAdminNotifications = [
    ...claims.map(c => `claim-${c.id}`),
    ...logs.filter(l => l.status !== 'Valid').map(l => `invalid-${l.id}`),
    ...qrCodes.map(q => `qr-${q.id}`)
  ].filter(id => !dismissedNotifications.includes(id));

  const adminNotificationsCount = activeAdminNotifications.length;

  const activeMentorNotifications = [
    ...logs.filter(l => l.gugusName === mentorGugusName).map(l => `log-${l.id}`),
    ...claims.filter(c => c.gugusName === mentorGugusName).map(c => `claim-${c.id}`)
  ].filter(id => !dismissedNotifications.includes(id));

  const mentorNotificationsCount = activeMentorNotifications.length;

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

  // ----------------------------------------------------
  // Initial Data Load (only if Supabase session exists)
  // ----------------------------------------------------
  useEffect(() => {
    async function loadData() {
      try {
        const [pData, mData, gData, cData, lData, qrData, locData] = await Promise.all([
          pesertaDb.fetchAll(),
          mentorsDb.fetchAll(),
          gugusDb.fetchAll(),
          claimsDb.fetchAll(),
          logsDb.fetchAll(),
          qrSessionsDb.fetchAll(),
          locationSettingsDb.fetch()
        ]);
        setMentors(mData);
        setGugus(gData);
        setClaims(cData);
        setLogs(lData);
        setQrCodes(qrData);
        if (locData) {
          setLocationSettings(locData);
        }

        // Sync peserta status with logs to correct any database discrepancies
        const discrepancies = pData.filter(p => {
          if (p.status !== 'Hadir Penuh') return false;
          const hasValidLog = lData.some(l => String(l.nim) === String(p.id) && l.status === 'Valid');
          return !hasValidLog;
        });

        if (discrepancies.length > 0) {
          console.log(`Menyelaraskan data: status ${discrepancies.length} peserta diset kembali ke 'Belum Hadir' karena tidak memiliki log absensi.`);
          Promise.all(discrepancies.map(p => pesertaDb.update(p.id, { status: 'Belum Hadir' })))
            .catch(err => console.error("Gagal menyelaraskan status peserta di DB:", err));

          setPeserta(pData.map(p => {
            const isDisc = discrepancies.some(d => d.id === p.id);
            return isDisc ? { ...p, status: 'Belum Hadir' } : p;
          }));
        } else {
          setPeserta(pData);
        }
      } catch (err) {
        console.error('Error fetching data from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadData();
      } else {
        setLoading(false);
      }
    }
    init();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadData();
      } else if (event === 'SIGNED_OUT') {
        setPeserta([]); setMentors([]); setGugus([]);
        setClaims([]); setLogs([]); setQrCodes([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ----------------------------------------------------
  // Real-time Subscriptions
  // ----------------------------------------------------
  useEffect(() => {
    const pesertaChannel = supabase
      .channel('peserta-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'peserta' }, async (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            const transformed = transformPeserta(payload.new);
            setPeserta(prev => {
              if (prev.some(p => p.id === transformed.id)) return prev;
              return [...prev, transformed];
            });
          } else if (payload.eventType === 'UPDATE') {
            const transformed = transformPeserta(payload.new);
            setPeserta(prev => prev.map(p => p.id === transformed.id ? transformed : p));
          } else if (payload.eventType === 'DELETE') {
            const nim = payload.old?.nim || payload.old?.id;
            if (nim) {
              setPeserta(prev => prev.filter(p => p.id !== nim));
            }
          }
        } catch (err) {
          console.error("Error in peserta Realtime listener:", err);
        }
      })
      .subscribe();

    const gugusChannel = supabase
      .channel('gugus-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gugus' }, (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            const transformed = transformGugus(payload.new);
            setGugus(prev => {
              if (prev.some(g => g.id === transformed.id)) return prev;
              return [...prev, transformed];
            });
          } else if (payload.eventType === 'UPDATE') {
            const transformed = transformGugus(payload.new);
            setGugus(prev => prev.map(g => g.id === transformed.id ? transformed : g));

            // If this gugus assignment change affects the logged-in mentor, update their gugusId
            setMentorUser(prev => {
              if (!prev) return prev;
              // New mentor assigned to this gugus
              if (payload.new?.mentor_id === prev.id) {
                const updated = { ...prev, gugusId: payload.new.id };
                localStorage.setItem('pkkmb_currentUser_mentor', JSON.stringify(updated));
                return updated;
              }
              // Old mentor removed from this gugus
              if (payload.old?.mentor_id === prev.id && prev.gugusId === payload.new?.id) {
                const updated = { ...prev, gugusId: '' };
                localStorage.setItem('pkkmb_currentUser_mentor', JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (id) {
              setGugus(prev => prev.filter(g => g.id !== id));
            }
          }
        } catch (err) {
          console.error("Error in gugus Realtime listener:", err);
        }
      })
      .subscribe();

    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        try {
          // Only process mentors
          if (payload.new && payload.new.role !== 'mentor') return;
          if (payload.eventType === 'INSERT') {
            const transformed = transformMentor(payload.new);
            setMentors(prev => {
              if (prev.some(m => m.id === transformed.id)) return prev;
              return [...prev, transformed];
            });
          } else if (payload.eventType === 'UPDATE') {
            const transformed = transformMentor(payload.new);
            setMentors(prev => prev.map(m => m.id === transformed.id ? transformed : m));

            // Also update mentorUser if it's the currently logged-in mentor
            setMentorUser(prev => {
              if (!prev || prev.id !== payload.new?.id) return prev;
              const updated = {
                ...prev,
                name: payload.new.full_name || payload.new.email,
                email: payload.new.email,
                gugusId: payload.new.gugus_id || prev.gugusId || ''
              };
              localStorage.setItem('pkkmb_currentUser_mentor', JSON.stringify(updated));
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (id) {
              setMentors(prev => prev.filter(m => m.id !== id));
            }
          }
        } catch (err) {
          console.error("Error in profiles Realtime listener:", err);
        }
      })
      .subscribe();

    const claimsChannel = supabase
      .channel('claims-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_manual' }, (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            const transformed = transformClaim(payload.new);
            setClaims(prev => {
              if (prev.some(c => c.id === transformed.id)) return prev;
              return [...prev, transformed];
            });
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new?.status !== 'pending') {
              setClaims(prev => prev.filter(c => c.id !== payload.new?.id));
            } else {
              const transformed = transformClaim(payload.new);
              setClaims(prev => prev.map(c => c.id === transformed.id ? transformed : c));
            }
          } else if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (id) {
              setClaims(prev => prev.filter(c => c.id !== id));
            }
          }
        } catch (err) {
          console.error("Error in claims Realtime listener:", err);
        }
      })
      .subscribe();

    const logsChannel = supabase
      .channel('logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi' }, (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            const transformed = transformLog(payload.new);
            setLogs(prev => {
              if (prev.some(l => l.id === transformed.id)) return prev;
              return [transformed, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const transformed = transformLog(payload.new);
            setLogs(prev => prev.map(l => l.id === transformed.id ? transformed : l));
          } else if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (id) {
              setLogs(prev => prev.filter(l => l.id !== id));
            }
          }
        } catch (err) {
          console.error("Error in logs Realtime listener:", err);
        }
      })
      .subscribe();

    const qrChannel = supabase
      .channel('qr-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_sessions' }, (payload) => {
        try {
          if (payload.eventType === 'INSERT') {
            const transformed = transformQr(payload.new);
            setQrCodes(prev => {
              if (prev.some(q => q.id === transformed.id)) return prev;
              return [...prev, transformed];
            });
          } else if (payload.eventType === 'UPDATE') {
            const transformed = transformQr(payload.new);
            setQrCodes(prev => prev.map(q => q.id === transformed.id ? transformed : q));
          } else if (payload.eventType === 'DELETE') {
            const kode = payload.old?.kode || payload.old?.id;
            if (kode) {
              setQrCodes(prev => prev.filter(q => q.id !== kode));
            }
          }
        } catch (err) {
          console.error("Error in qr Realtime listener:", err);
        }
      })
      .subscribe();

    const locationChannel = supabase
      .channel('location-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'location_settings' }, (payload) => {
        try {
          if (payload.new) {
            setLocationSettings({
              latitude: payload.new.latitude,
              longitude: payload.new.longitude,
              radiusMeters: payload.new.radius_meters,
              locationName: payload.new.location_name,
              updatedAt: payload.new.updated_at
            });
          }
        } catch (err) {
          console.error("Error in location Realtime listener:", err);
        }
      })
      .subscribe();

    return () => {
      pesertaChannel.unsubscribe();
      gugusChannel.unsubscribe();
      profilesChannel.unsubscribe();
      claimsChannel.unsubscribe();
      logsChannel.unsubscribe();
      qrChannel.unsubscribe();
      locationChannel.unsubscribe();
    };
  }, []);

  const saveCurrentUser = (user, role) => {
    if (role === 'admin') {
      setAdminUser(user);
      if (user) {
        localStorage.setItem('pkkmb_currentUser_admin', JSON.stringify(user));
      } else {
        localStorage.removeItem('pkkmb_currentUser_admin');
      }
    } else {
      setMentorUser(user);
      if (user) {
        localStorage.setItem('pkkmb_currentUser_mentor', JSON.stringify(user));
      } else {
        localStorage.removeItem('pkkmb_currentUser_mentor');
      }
    }
  };

  const logout = (role) => {
    saveCurrentUser(null, role);
  };

  // ----------------------------------------------------
  // AppContext Actions mapped to Supabase Services
  // ----------------------------------------------------
  const addPeserta = async (item) => {
    try {
      // Validate gugus capacity
      if (item.gugusId && item.gugusId !== 'Unassigned') {
        const targetGugus = gugus.find(g => g.id === item.gugusId);
        if (targetGugus) {
          const currentCount = peserta.filter(p => p.gugusId === item.gugusId).length;
          if (currentCount >= targetGugus.capacity) {
            throw new Error(`Gugus ${targetGugus.name} sudah penuh (kapasitas maksimal ${targetGugus.capacity} peserta).`);
          }
        }
      }

      if (currentUser?.role === 'mentor') {
        const student = peserta.find(p => p.id === item.id);
        if (student) return;
        const group = gugus.find(g => g.id === item.gugusId);
        const groupName = group ? group.name : '-';
        const newClaim = await claimsDb.add(
          item.id,
          'Tambah Peserta',
          `Pengajuan tambah peserta baru`,
          'Alpha',
          { id: item.id, name: item.name },
          groupName,
          currentUser,
          JSON.stringify(item)
        );
        if (newClaim) {
          const transformed = transformClaim(newClaim);
          setClaims(prev => {
            if (prev.some(c => c.id === transformed.id)) return prev;
            return [...prev, transformed];
          });
        }
      } else {
        const added = await pesertaDb.add(item);
        if (added) {
          const transformed = transformPeserta(added);
          setPeserta(prev => {
            if (prev.some(p => p.id === transformed.id)) return prev;
            return [...prev, transformed];
          });
        }
      }
    } catch (err) {
      console.error("Error adding peserta:", err);
      alert(err.message || "Gagal menambahkan peserta.");
      throw err;
    }
  };

  const updatePeserta = async (id, fields) => {
    try {
      const student = peserta.find(p => p.id === id);
      if (!student) return;

      // Validate gugus capacity on update if changing gugus
      if (fields.gugusId !== undefined && fields.gugusId !== student.gugusId) {
        if (fields.gugusId && fields.gugusId !== 'Unassigned') {
          const targetGugus = gugus.find(g => g.id === fields.gugusId);
          if (targetGugus) {
            const currentCount = peserta.filter(p => p.gugusId === fields.gugusId).length;
            if (currentCount >= targetGugus.capacity) {
              throw new Error(`Gugus ${targetGugus.name} sudah penuh (kapasitas maksimal ${targetGugus.capacity} peserta).`);
            }
          }
        }
      }

      if (currentUser?.role === 'mentor') {
        const group = gugus.find(g => g.id === student.gugusId);
        const groupName = group ? group.name : '-';
        const newClaim = await claimsDb.add(
          id,
          'Edit Peserta',
          `Pengajuan ubah data peserta`,
          fields.status || student.status || 'Alpha',
          student,
          groupName,
          currentUser,
          JSON.stringify({ ...fields, id })
        );
        if (newClaim) {
          const transformed = transformClaim(newClaim);
          setClaims(prev => {
            if (prev.some(c => c.id === transformed.id)) return prev;
            return [...prev, transformed];
          });
        }
      } else {
        // Direct status sync with attendance logs
        if (fields.status !== undefined && fields.status !== student.status) {
          const newStatus = fields.status;
          const group = gugus.find(g => g.id === (fields.gugusId || student.gugusId));
          const groupName = group ? group.name : '-';
          const scannerName = currentUser?.name || 'Admin PKKMB';

          if (newStatus === 'Hadir Penuh' || newStatus === 'Hadir Sebagian') {
            const hasValidLog = logs.some(l => String(l.nim) === String(id) && l.status === 'Valid');
            if (!hasValidLog) {
              await addLog(fields.name || student.name, id, groupName, scannerName, 'Valid', `Ubah Status Manual ke ${newStatus}`);
            }
          } else if (newStatus === 'Belum Hadir' || newStatus === 'Alpha' || newStatus === 'Sakit' || newStatus === 'Izin') {
            // Delete any existing valid logs first to prevent sync conflicts
            const studentLogs = logs.filter(l => String(l.nim) === String(id) && l.status === 'Valid');
            if (studentLogs.length > 0) {
              await Promise.all(studentLogs.map(l => deleteLog(l.id)));
            }
            // Add a status change log in history (Invalid status since they are absent)
            await addLog(fields.name || student.name, id, groupName, scannerName, 'Invalid', `Ubah Status Manual ke ${newStatus}`);
          }
        }

        setPeserta(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
        try {
          await pesertaDb.update(id, fields);
        } catch (err) {
          // Rollback on error
          const pData = await pesertaDb.fetchAll();
          setPeserta(pData);
          throw err;
        }
      }
    } catch (err) {
      console.error("Error updating peserta:", err);
      alert(err.message || "Gagal memperbarui peserta.");
      throw err;
    }
  };

  const deletePeserta = async (id) => {
    // Optimistic local state update
    setPeserta(prev => prev.filter(p => p.id !== id));
    try {
      await pesertaDb.delete(id);
    } catch (err) {
      console.error("Error deleting peserta:", err);
      alert(err.message || "Gagal menghapus peserta.");
      // Rollback
      const pData = await pesertaDb.fetchAll();
      setPeserta(pData);
    }
  };

  const addMentor = async (item) => {
    try {
      const added = await mentorsDb.add(item);
      if (added) {
        const transformed = transformMentor(added);
        setMentors(prev => {
          if (prev.some(m => m.id === transformed.id)) return prev;
          return [...prev, transformed];
        });

        // Sync the gugus side in local state
        if (item.gugusId && item.gugusId !== 'Unassigned') {
          setGugus(prev => prev.map(g => g.id === item.gugusId ? { ...g, mentorId: transformed.id } : g));
        }
      }
    } catch (err) {
      console.error("Error adding mentor:", err);
      alert(err.message || "Gagal menambahkan mentor.");
      throw err;
    }
  };

  const updateMentor = async (id, fields) => {
    // Optimistic local state update
    setMentors(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m));
    if (fields.gugusId !== undefined) {
      const newGugusId = fields.gugusId && fields.gugusId !== 'Unassigned' ? fields.gugusId : null;
      setGugus(prev => prev.map(g => {
        if (newGugusId && g.id === newGugusId) return { ...g, mentorId: id };
        if (g.mentorId === id && g.id !== newGugusId) return { ...g, mentorId: 'Unassigned' };
        return g;
      }));
    }

    try {
      const updated = await mentorsDb.update(id, fields);
      if (updated) {
        const transformed = transformMentor(updated);
        setMentors(prev => prev.map(m => m.id === id ? transformed : m));
      }
    } catch (err) {
      console.error("Error updating mentor:", err);
      alert(err.message || "Gagal memperbarui mentor.");
      // Rollback
      const [mData, gData] = await Promise.all([mentorsDb.fetchAll(), gugusDb.fetchAll()]);
      setMentors(mData);
      setGugus(gData);
      throw err;
    }
  };

  const deleteMentor = async (id) => {
    // Optimistic local state update
    setMentors(prev => prev.filter(m => m.id !== id));
    setGugus(prev => prev.map(g => g.mentorId === id ? { ...g, mentorId: 'Unassigned' } : g));
    try {
      await mentorsDb.delete(id);
    } catch (err) {
      console.error("Error deleting mentor:", err);
      alert(err.message || "Gagal menghapus mentor.");
      // Rollback
      const [mData, gData] = await Promise.all([mentorsDb.fetchAll(), gugusDb.fetchAll()]);
      setMentors(mData);
      setGugus(gData);
    }
  };

  const addGugus = async (item) => {
    try {
      const added = await gugusDb.add(item);
      if (added) {
        const transformed = transformGugus(added);
        setGugus(prev => {
          if (prev.some(g => g.id === transformed.id)) return prev;
          return [...prev, transformed];
        });

        // Sync the mentor side in local state
        if (item.mentorId && item.mentorId !== 'Unassigned') {
          setMentors(prev => prev.map(m => m.id === item.mentorId ? { ...m, gugusId: transformed.id } : m));
        }
      }
    } catch (err) {
      console.error("Error adding gugus:", err);
      alert(err.message || "Gagal menambahkan gugus.");
    }
  };

  const updateGugus = async (id, fields) => {
    // Optimistic local state update
    setGugus(prev => prev.map(g => g.id === id ? {
      ...g,
      name: fields.name !== undefined ? fields.name : g.name,
      capacity: fields.capacity !== undefined ? fields.capacity : g.capacity,
      mentorId: fields.mentorId !== undefined ? fields.mentorId : g.mentorId
    } : g));

    if (fields.mentorId !== undefined) {
      const newMentorId = fields.mentorId && fields.mentorId !== 'Unassigned' ? fields.mentorId : null;
      setMentors(prev => prev.map(m => {
        if (newMentorId && m.id === newMentorId) return { ...m, gugusId: id };
        if (m.gugusId === id && m.id !== newMentorId) return { ...m, gugusId: 'Unassigned' };
        return m;
      }));
    }

    try {
      await gugusDb.update(id, fields);
    } catch (err) {
      console.error("Error updating gugus:", err);
      alert(err.message || "Gagal memperbarui gugus.");
      // Rollback
      const [mData, gData] = await Promise.all([mentorsDb.fetchAll(), gugusDb.fetchAll()]);
      setMentors(mData);
      setGugus(gData);
    }
  };

  const deleteGugus = async (id) => {
    // Optimistic local state update
    setGugus(prev => prev.filter(g => g.id !== id));
    setMentors(prev => prev.map(m => m.gugusId === id ? { ...m, gugusId: 'Unassigned' } : m));
    try {
      await gugusDb.delete(id);
    } catch (err) {
      console.error("Error deleting gugus:", err);
      alert(err.message || "Gagal menghapus gugus.");
      // Rollback
      const [mData, gData] = await Promise.all([mentorsDb.fetchAll(), gugusDb.fetchAll()]);
      setMentors(mData);
      setGugus(gData);
    }
  };

  const addLog = async (name, nim, gugusName, scanner, status = 'Valid', note = '', locationData = null) => {
    try {
      const student = peserta.find(p => p.id === nim);
      const inserted = await logsDb.add(name, nim, gugusName, scanner, status, note, student?.uuid, currentUser?.id, locationData);
      if (inserted) {
        const transformed = transformLog(inserted);
        setLogs(prev => {
          if (prev.some(l => l.id === transformed.id)) return prev;
          return [transformed, ...prev];
        });
      }
    } catch (err) {
      console.error("Error writing scan log:", err);
    }
  };

  const deleteLog = async (id) => {
    const logToDelete = logs.find(l => l.id === id);
    // Optimistic local state update
    setLogs(prev => prev.filter(l => l.id !== id));

    if (logToDelete && logToDelete.status === 'Valid') {
      const studentNim = logToDelete.nim;
      const otherValidLogs = logs.filter(l => l.id !== id && l.nim === studentNim && l.status === 'Valid');
      if (otherValidLogs.length === 0) {
        setPeserta(prev => prev.map(p => String(p.id) === String(studentNim) ? { ...p, status: 'Belum Hadir' } : p));
      }
    }

    try {
      await logsDb.delete(id);
      if (logToDelete && logToDelete.status === 'Valid') {
        const studentNim = logToDelete.nim;
        const otherValidLogs = logs.filter(l => l.id !== id && l.nim === studentNim && l.status === 'Valid');
        if (otherValidLogs.length === 0) {
          await pesertaDb.update(studentNim, { status: 'Belum Hadir' });
        }
      }
    } catch (err) {
      console.error("Error deleting scan log:", err);
      // Rollback
      const [lData, pData] = await Promise.all([logsDb.fetchAll(), pesertaDb.fetchAll()]);
      setLogs(lData);
      setPeserta(pData);
    }
  };

  const updateLocationSettings = async (settings) => {
    try {
      const updated = await locationSettingsDb.update(settings);
      if (updated) {
        setLocationSettings({
          latitude: updated.latitude,
          longitude: updated.longitude,
          radiusMeters: updated.radius_meters,
          locationName: updated.location_name,
          updatedAt: updated.updated_at
        });
        return true;
      }
    } catch (err) {
      console.error("Error updating location settings:", err);
      throw err;
    }
  };

  const addClaim = async (pesertaId, issue, note = '', requestedStatus = 'Hadir Penuh') => {
    try {
      const student = peserta.find(p => p.id === pesertaId);
      if (!student) return;
      const group = gugus.find(g => g.id === student.gugusId);
      const groupName = group ? group.name : '-';

      const added = await claimsDb.add(pesertaId, issue, note, requestedStatus, student, groupName, currentUser);
      if (added) {
        const transformed = transformClaim(added);
        setClaims(prev => {
          if (prev.some(c => c.id === transformed.id)) return prev;
          return [...prev, transformed];
        });
      }
      await pesertaDb.update(pesertaId, { status: 'Manual (Pending)' });
      setPeserta(prev => prev.map(p => p.id === pesertaId ? { ...p, status: 'Manual (Pending)' } : p));
    } catch (err) {
      console.error("Error creating claim:", err);
      alert("Gagal mengirim pengajuan absensi manual.");
    }
  };

  const approveClaim = async (claimId) => {
    try {
      const claim = claims.find(c => c.id === claimId);
      if (!claim) return;

      if (claim.issue === 'Tambah Peserta') {
        const studentData = JSON.parse(claim.catatan);
        const added = await pesertaDb.add(studentData);
        if (added) {
          const transformed = transformPeserta(added);
          setPeserta(prev => {
            if (prev.some(p => p.id === transformed.id)) return prev;
            return [...prev, transformed];
          });
        }
        await addLog(studentData.name, studentData.id, claim.gugusName, 'Admin PKKMB', 'Valid', 'Persetujuan Tambah Peserta');
      } else if (claim.issue === 'Edit Peserta') {
        const studentData = JSON.parse(claim.catatan);
        await pesertaDb.update(claim.nim, studentData);
        setPeserta(prev => prev.map(p => p.id === claim.nim ? { ...p, ...studentData } : p));
        await addLog(studentData.name, claim.nim, claim.gugusName, 'Admin PKKMB', 'Valid', 'Persetujuan Edit Peserta');
      } else {
        const targetStatus = claim.requestedStatus || 'Hadir Penuh';
        await pesertaDb.update(claim.nim, { status: targetStatus });
        setPeserta(prev => prev.map(p => p.id === claim.nim ? { ...p, status: targetStatus } : p));
        await addLog(claim.name, claim.nim, claim.gugusName, 'Admin PKKMB', 'Valid');
      }
      await claimsDb.updateStatus(claimId, 'approved');
      setClaims(prev => prev.filter(c => c.id !== claimId));
    } catch (err) {
      console.error("Error approving claim:", err);
      alert("Gagal menyetujui klaim.");
    }
  };

  const rejectClaim = async (claimId, reason = '') => {
    try {
      const claim = claims.find(c => c.id === claimId);
      if (!claim) return;

      if (claim.issue === 'Tambah Peserta' || claim.issue === 'Edit Peserta') {
        await addLog(claim.name, claim.nim, claim.gugusName, 'Admin (Tolak)', 'Tidak Valid', `Persetujuan ditolak: ${reason}`);
      } else {
        await pesertaDb.update(claim.nim, { status: 'Manual (Ditolak)' });
        setPeserta(prev => prev.map(p => p.id === claim.nim ? { ...p, status: 'Manual (Ditolak)' } : p));
        await addLog(claim.name, claim.nim, claim.gugusName, 'Admin (Tolak Manual)', 'Tidak Valid', reason);
      }
      await claimsDb.updateStatus(claimId, 'rejected');
      setClaims(prev => prev.filter(c => c.id !== claimId));
    } catch (err) {
      console.error("Error rejecting claim:", err);
      alert("Gagal menolak klaim.");
    }
  };

  const generateQr = async (item) => {
    try {
      const added = await qrSessionsDb.add(item, currentUser?.id);
      if (added) {
        const transformed = transformQr(added);
        setQrCodes(prev => {
          if (prev.some(q => q.id === transformed.id)) return prev;
          return [...prev, transformed];
        });
      }
    } catch (err) {
      console.error("Error creating QR session:", err);
      alert("Gagal membuat sesi QR.");
    }
  };

  const expireQr = async (id) => {
    try {
      await qrSessionsDb.expire(id);
      setQrCodes(prev => prev.map(q => q.id === id ? { ...q, status: 'Expired' } : q));
    } catch (err) {
      console.error("Error expiring QR session:", err);
    }
  };

  const deleteQr = async (id) => {
    try {
      await qrSessionsDb.delete(id);
      setQrCodes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error("Error deleting QR session:", err);
    }
  };

  const recordScan = async (studentId, locationData = null) => {
    const student = peserta.find(p => String(p.id) === String(studentId));
    if (!student) return false;

    const group = gugus.find(g => g.id === student.gugusId);
    const groupName = group ? group.name : '-';

    try {
      await pesertaDb.update(studentId, { status: 'Hadir Penuh' });
      setPeserta(prev => prev.map(p => String(p.id) === String(studentId) ? { ...p, status: 'Hadir Penuh' } : p));
      await addLog(student.name, student.id, groupName, currentUser ? currentUser.name : 'Mentor', 'Valid', '', locationData);
      return true;
    } catch (err) {
      console.error("Error recording scan:", err);
      return false;
    }
  };

  const login = async (emailOrUsername, password, role) => {
    let email = emailOrUsername;

    // If input is not an email, try NIP lookup (mentor only)
    if (!email.includes('@')) {
      if (role === 'mentor') {
        const { data } = await supabase
          .from('profiles')
          .select('email')
          .eq('nip', emailOrUsername)
          .maybeSingle();
        if (data?.email) {
          email = data.email;
        } else {
          throw new Error('NIM tidak ditemukan. Coba gunakan email kamu.');
        }
      } else {
        throw new Error('Masukkan email admin yang valid (contoh: admin@univ.ac.id).');
      }
    }

    // Authenticate via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Email atau password salah.');

    // Fetch profile to verify role
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      await supabase.auth.signOut();
      throw new Error('Profil tidak ditemukan. Hubungi administrator.');
    }

    if (role === 'admin' && profile.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('Akun ini bukan akun admin.');
    }

    if (role === 'mentor' && profile.role !== 'mentor') {
      await supabase.auth.signOut();
      throw new Error('Akun ini bukan akun mentor. Gunakan halaman login admin.');
    }

    // For mentor: look up gugusId from gugus table (mentor_id = user.id)
    // This ensures correct gugusId even if profiles.gugus_id wasn't synced
    let gugusId = profile.gugus_id || '';
    if (profile.role === 'mentor') {
      const { data: gugusData } = await supabase
        .from('gugus')
        .select('id')
        .eq('mentor_id', data.user.id)
        .maybeSingle();
      if (gugusData?.id) gugusId = gugusData.id;
    }

    const userObj = {
      id: data.user.id,
      name: profile.full_name || data.user.email,
      email: data.user.email,
      role: profile.role,
      gugusId,
      nip: profile.nip || ''
    };

    saveCurrentUser(userObj, role === 'admin' ? 'admin' : 'mentor');
    return true;
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
      adminUser,
      setAdminUser,
      mentorUser,
      setMentorUser,
      logout,
      dismissNotification,
      dismissAllNotifications,
      dismissedNotifications,
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
      deleteLog,
      locationSettings,
      updateLocationSettings,
      hasAdminNotifications,
      hasMentorNotifications,
      setAdminNotificationsCleared,
      setMentorNotificationsCleared,
      loading,
      parseDbDate
    }}>
      {children}
    </AppContext.Provider>
  );
}
