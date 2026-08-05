import { supabase } from './supabase';

// Helper to convert date to Indonesian time string
function getIndoTime(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
  return date.toTimeString().split(' ')[0]; // HH:MM:SS
}

function getIndoDate(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
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
      status: p.status || 'Alpha',
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
        status: item.status || 'Alpha'
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
    const { data, error } = await supabase
      .from('gugus')
      .insert({
        nama: item.name,
        mentor_id: item.mentorId && item.mentorId !== 'Unassigned' ? item.mentorId : null,
        kuota: item.capacity || 30
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, fields) {
    const payload = {};
    if (fields.name !== undefined) payload.nama = fields.name;
    if (fields.mentorId !== undefined) {
      const newMentorId = fields.mentorId && fields.mentorId !== 'Unassigned' ? fields.mentorId : null;
      payload.mentor_id = newMentorId;

      // Sync profiles.gugus_id: clear old mentor, set new mentor
      // 1. Clear gugus_id from any mentor currently assigned to this gugus
      await supabase
        .from('profiles')
        .update({ gugus_id: null })
        .eq('gugus_id', id)
        .eq('role', 'mentor');

      // 2. Set gugus_id on the newly assigned mentor
      if (newMentorId) {
        await supabase
          .from('profiles')
          .update({ gugus_id: id })
          .eq('id', newMentorId);
      }
    }
    if (fields.capacity !== undefined) payload.kuota = fields.capacity;

    const { data, error } = await supabase
      .from('gugus')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  async delete(id) {
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
      gugusId: m.gugus_id || 'Unassigned'
    }));
  },

  async add(item) {
    // Note: Creating a user with credentials requires admin/auth.signUp
    // For general database profiles updates, we insert/upsert profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email: item.email,
        full_name: item.name,
        role: 'mentor',
        nip: item.nip || '',
        gugus_id: item.gugusId && item.gugusId !== 'Unassigned' ? item.gugusId : null
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, fields) {
    const payload = {};
    if (fields.name !== undefined) payload.full_name = fields.name;
    if (fields.email !== undefined) payload.email = fields.email;
    if (fields.nip !== undefined) payload.nip = fields.nip;
    if (fields.gugusId !== undefined) {
      payload.gugus_id = fields.gugusId && fields.gugusId !== 'Unassigned' ? fields.gugusId : null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    return data;
  },

  async delete(id) {
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
      time: c.waktu || new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      requestedStatus: c.requested_status || 'Hadir Penuh'
    }));
  },

  async add(pesertaId, issue, note = '', requestedStatus = 'Hadir Penuh', student, gugusName, currentUserProfile) {
    // Find the participant uuid from nim or check if student passed in
    const { data, error } = await supabase
      .from('approval_manual')
      .insert({
        peserta_id: student?.uuid || null,
        diajukan_oleh: currentUserProfile?.id || null,
        alasan: note,
        issue: issue,
        status: 'pending',
        requested_status: requestedStatus,
        nim: pesertaId,
        nama: student?.name || '',
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
      note: l.catatan || ''
    }));
  },

  async add(name, nim, gugusName, scanner, status = 'Valid', note = '', studentUuid, scannerUuid) {
    const { data, error } = await supabase
      .from('absensi')
      .insert({
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
      })
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
