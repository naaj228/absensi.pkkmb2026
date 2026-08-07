import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Helper to parse DB date strings safely as UTC if they lack timezone offsets
function parseDbDate(dateStr) {
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
}

// Helper to convert date to Indonesian time string
function getIndoTime(dateString) {
  const date = dateString ? parseDbDate(dateString) : new Date();
  return date.toTimeString().split(' ')[0]; // HH:MM:SS
}

function getIndoDate(dateString) {
  const date = dateString ? parseDbDate(dateString) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ----------------------------------------------------
// PESERTA SERVICE
// ----------------------------------------------------
export const pesertaDb = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('peserta')
      .select('*');
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.nim,          // Map NIM to app's .id
      uuid: p.id,         // Keep database UUID
      name: p.nama,       // Map nama to .name
      email: p.email,
      gugusId: p.gugus_id || '',
      fakultas: p.jurusan || '', // Map jurusan to .fakultas
      status: p.status || 'Belum Hadir',
      fotoUrl: p.foto_url || ''
    }));
  },

  async add(item) {
    const { data, error } = await supabase
      .from('peserta')
      .insert({
        nim: item.id, // client's .id is NIM
        nama: item.name,
        email: item.email,
        gugus_id: item.gugusId || null,
        jurusan: item.fakultas,
        status: item.status || 'Belum Hadir'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(nim, fields) {
    const payload = {};
    if (fields.name !== undefined) payload.nama = fields.name;
    if (fields.email !== undefined) payload.email = fields.email;
    if (fields.gugusId !== undefined) payload.gugus_id = fields.gugusId || null;
    if (fields.fakultas !== undefined) payload.jurusan = fields.fakultas;
    if (fields.status !== undefined) payload.status = fields.status;
    if (fields.fotoUrl !== undefined) payload.foto_url = fields.fotoUrl;

    const { data, error } = await supabase
      .from('peserta')
      .update(payload)
      .eq('nim', nim);
    if (error) throw error;
    return data;
  },

  async delete(nim) {
    const { error } = await supabase
      .from('peserta')
      .delete()
      .eq('nim', nim);
    if (error) throw error;
  }
};

// Helper to keep gugus.mentor_id and profiles.gugus_id bidirectionally in sync
async function syncGugusAndMentor(mentorId, newGugusId) {
  const gugusIdVal = newGugusId && newGugusId !== 'Unassigned' ? newGugusId : null;

  if (gugusIdVal) {
    // 1. Clear this mentor from any other gugus
    await supabase
      .from('gugus')
      .update({ mentor_id: null })
      .eq('mentor_id', mentorId)
      .neq('id', gugusIdVal);

    // 2. Clear this gugus from any other mentor
    await supabase
      .from('profiles')
      .update({ gugus_id: null })
      .eq('gugus_id', gugusIdVal)
      .neq('id', mentorId);

    // 3. Set the new mentor on the target gugus
    await supabase
      .from('gugus')
      .update({ mentor_id: mentorId })
      .eq('id', gugusIdVal);

    // 4. Set the new gugus on the mentor profile
    await supabase
      .from('profiles')
      .update({ gugus_id: gugusIdVal })
      .eq('id', mentorId);
  } else {
    // If setting to unassigned:
    // 1. Clear this mentor from any gugus
    await supabase
      .from('gugus')
      .update({ mentor_id: null })
      .eq('mentor_id', mentorId);

    // 2. Clear gugus from the mentor profile
    await supabase
      .from('profiles')
      .update({ gugus_id: null })
      .eq('id', mentorId);
  }
}

// ----------------------------------------------------
// GUGUS SERVICE
// ----------------------------------------------------
export const gugusDb = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('gugus')
      .select('*');
    if (error) throw error;
    return (data || []).map(g => ({
      id: g.id,
      name: g.nama,
      mentorId: g.mentor_id || 'Unassigned',
      capacity: g.kuota || 30
    }));
  },

  async add(item) {
    const payload = {
      nama: item.name,
      mentor_id: item.mentorId && item.mentorId !== 'Unassigned' ? item.mentorId : null,
      kuota: item.capacity || 30
    };
    if (item.id) {
      payload.id = item.id;
    }
    const { data, error } = await supabase
      .from('gugus')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    // Sync the other side (profiles.gugus_id)
    if (item.mentorId && item.mentorId !== 'Unassigned') {
      await syncGugusAndMentor(item.mentorId, data.id);
    }

    return data;
  },

  async update(id, fields) {
    const payload = {};
    if (fields.name !== undefined) payload.nama = fields.name;
    if (fields.capacity !== undefined) payload.kuota = fields.capacity;

    if (fields.mentorId !== undefined) {
      const newMentorId = fields.mentorId && fields.mentorId !== 'Unassigned' ? fields.mentorId : null;
      payload.mentor_id = newMentorId;

      if (newMentorId) {
        await syncGugusAndMentor(newMentorId, id);
      } else {
        // If removing mentor from this gugus:
        // Find the current mentor of this gugus and clear their gugus_id
        const { data: currentGugus } = await supabase
          .from('gugus')
          .select('mentor_id')
          .eq('id', id)
          .single();
        if (currentGugus?.mentor_id) {
          await syncGugusAndMentor(currentGugus.mentor_id, null);
        }
      }
    }

    const { data, error } = await supabase
      .from('gugus')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  async delete(id) {
    // Clear gugus_id on any mentor currently assigned to this gugus
    await supabase
      .from('profiles')
      .update({ gugus_id: null })
      .eq('gugus_id', id);

    const { error } = await supabase
      .from('gugus')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ----------------------------------------------------
// MENTORS SERVICE (profiles table)
// ----------------------------------------------------
export const mentorsDb = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mentor');
    if (error) throw error;
    return (data || []).map(m => ({
      id: m.id,
      name: m.full_name || m.email,
      email: m.email,
      nip: m.nip || '',
      phone: m.phone || '',
      gugusId: m.gugus_id || 'Unassigned'
    }));
  },

  async add(item) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Create a temporary Supabase client with persistSession: false to avoid signing out the current admin session
    const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'temp-auth-token',
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {}
        }
      }
    });

    // 1. Sign up the user in Supabase Auth
    const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
      email: item.email,
      password: item.password || 'pkkmb2026',
      options: {
        data: {
          role: 'mentor',
          full_name: item.name
        }
      }
    });

    if (signUpError) throw signUpError;

    const user = signUpData.user;
    if (!user) throw new Error("Gagal membuat user auth Supabase.");

    // 2. Upsert the profile in public.profiles using admin privileges (main client)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: item.email,
        full_name: item.name,
        role: 'mentor',
        nip: item.nip || '',
        phone: item.phone || '',
        gugus_id: item.gugusId && item.gugusId !== 'Unassigned' ? item.gugusId : null
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Sync the other side (gugus.mentor_id)
    if (item.gugusId && item.gugusId !== 'Unassigned') {
      await syncGugusAndMentor(user.id, item.gugusId);
    }

    return profileData;
  },

  async update(id, fields) {
    const payload = {};
    if (fields.name !== undefined) payload.full_name = fields.name;
    if (fields.email !== undefined) payload.email = fields.email;
    if (fields.nip !== undefined) payload.nip = fields.nip;
    if (fields.phone !== undefined) payload.phone = fields.phone;
    if (fields.gugusId !== undefined) {
      payload.gugus_id = fields.gugusId && fields.gugusId !== 'Unassigned' ? fields.gugusId : null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Sync the other side (gugus.mentor_id)
    if (fields.gugusId !== undefined) {
      await syncGugusAndMentor(id, fields.gugusId);
    }

    return data;
  },

  async delete(id) {
    // Clear mentor from any gugus
    await supabase
      .from('gugus')
      .update({ mentor_id: null })
      .eq('mentor_id', id);

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ----------------------------------------------------
// CLAIMS SERVICE (approval_manual table)
// ----------------------------------------------------
export const claimsDb = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('approval_manual')
      .select('*')
      .eq('status', 'pending');
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      pesertaId: c.nim, // standard mapping used by manual approval
      name: c.nama,
      nim: c.nim,
      gugusName: c.gugus_nama || '-',
      issue: c.issue,
      catatan: c.catatan || '',
      time: c.waktu || new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      requestedStatus: c.requested_status || 'Hadir Penuh'
    }));
  },

  async add(pesertaId, issue, note = '', requestedStatus = 'Hadir Penuh', student, gugusName, currentUserProfile, catatan = null) {
    // Find the participant uuid from nim or check if student passed in
    const { data, error } = await supabase
      .from('approval_manual')
      .insert({
        peserta_id: student?.uuid || null,
        diajukan_oleh: currentUserProfile?.id || null,
        alasan: note,
        catatan: catatan,
        issue: issue,
        status: 'pending',
        requested_status: requestedStatus,
        nim: pesertaId,
        nama: student?.name || student?.nama || '',
        gugus_nama: gugusName,
        waktu: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id, newStatus) {
    const { data, error } = await supabase
      .from('approval_manual')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;
    return data;
  }
};

// ----------------------------------------------------
// LOGS SERVICE (absensi table)
// ----------------------------------------------------
export const logsDb = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('absensi')
      .select('*')
      .order('waktu', { ascending: false });
    if (error) throw error;
    return (data || []).map(l => ({
      id: l.id,
      timestamp: getIndoTime(l.waktu),
      date: getIndoDate(l.waktu),
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
    }));
  },

  async add(name, nim, gugusName, scanner, status = 'Valid', note = '', studentUuid, scannerUuid, locationData = null) {
    const insertObj = {
      peserta_id: studentUuid || null,
      dicatat_oleh: scannerUuid || null,
      peserta_nim: nim,
      peserta_nama: name,
      gugus_nama: gugusName,
      dicatat_nama: scanner,
      status_log: status,
      catatan: note,
      status: 'hadir', // internal status matching SQL column
      waktu: new Date().toISOString()
    };

    if (locationData) {
      insertObj.latitude = locationData.latitude;
      insertObj.longitude = locationData.longitude;
      insertObj.location_status = locationData.locationStatus;
      insertObj.distance_meters = locationData.distanceMeters;
    }

    const { data, error } = await supabase
      .from('absensi')
      .insert(insertObj)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('absensi')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ----------------------------------------------------
// QR SESSIONS SERVICE
// ----------------------------------------------------
export const qrSessionsDb = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('qr_sessions')
      .select('*');
    if (error) throw error;
    return (data || []).map(q => ({
      id: q.id,
      title: q.nama_sesi,
      sessionType: 'PKKMB',
      targetAudience: 'All',
      startTime: getIndoTime(q.berlaku_mulai),
      endTime: getIndoTime(q.berlaku_sampai),
      status: q.status === 'active' ? 'Active' : 'Expired',
      scans: 0
    }));
  },

  async add(item, creatorUuid) {
    const startIso = new Date();
    // Parse duration or end time
    const endIso = new Date();
    if (item.endTime) {
      const [h, m] = item.endTime.split(':');
      endIso.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    } else {
      endIso.setHours(endIso.getHours() + 2); // default 2 hours
    }

    const { data, error } = await supabase
      .from('qr_sessions')
      .insert({
        nama_sesi: item.title,
        kode: item.id || `QR-${Date.now()}`,
        dibuat_oleh: creatorUuid || null,
        berlaku_mulai: startIso.toISOString(),
        berlaku_sampai: endIso.toISOString(),
        status: 'active'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async expire(id) {
    const { error } = await supabase
      .from('qr_sessions')
      .update({ status: 'expired' })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id) {
    const { error } = await supabase
      .from('qr_sessions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// ----------------------------------------------------
// LOCATION SETTINGS SERVICE
// ----------------------------------------------------
export const locationSettingsDb = {
  async fetch() {
    const { data, error } = await supabase
      .from('location_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return data ? {
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radius_meters,
      locationName: data.location_name,
      updatedAt: data.updated_at
    } : null;
  },

  async update(settings) {
    const { data, error } = await supabase
      .from('location_settings')
      .upsert({
        id: 1,
        latitude: settings.latitude,
        longitude: settings.longitude,
        radius_meters: settings.radiusMeters,
        location_name: settings.locationName,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
