-- ============================================================
-- SCRIPT MIGRASI DATABASE KHUSUS ORMAWA & TAMU UNDANGAN
-- Lokasi Eksekusi: Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- SECTION 1: TABEL MASTER DATA ORMAWA & TAMU UNDANGAN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ormawa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text UNIQUE NOT NULL,
  nama_ormawa text NOT NULL,
  nama_perwakilan text,
  jabatan text,
  kontak text,
  email text,
  status text NOT NULL DEFAULT 'Belum Hadir',
  waktu_hadir timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Pastikan kolom email selalu ada jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.ormawa ADD COLUMN IF NOT EXISTS email text;

-- ============================================================
-- SECTION 2: TABEL LOG RIWAYAT PRESENSI ORMAWA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.absensi_ormawa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ormawa_id uuid REFERENCES public.ormawa(id) ON DELETE CASCADE,
  qr_code text NOT NULL,
  nama_ormawa text NOT NULL,
  nama_perwakilan text,
  jabatan text,
  waktu_scan timestamptz DEFAULT now(),
  dicatat_oleh text DEFAULT 'Scanner Ormawa',
  status_log text DEFAULT 'Valid'
);

-- ============================================================
-- SECTION 3: TABEL PENGATURAN JAM OPERASIONAL ABSENSI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ormawa_settings (
  id integer PRIMARY KEY DEFAULT 1,
  waktu_mulai text NOT NULL DEFAULT '07:00',
  waktu_selesai text NOT NULL DEFAULT '17:00',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT one_row_ormawa_settings CHECK (id = 1)
);

-- Insert nilai awal jam operasional jika belum ada
INSERT INTO public.ormawa_settings (id, waktu_mulai, waktu_selesai, is_active)
VALUES (1, '07:00', '17:00', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 4: KEAMANAN & PENGATURAN AKSES DATABASE (DISABLE RLS)
-- ============================================================
-- Nonaktifkan RLS agar API dari frontend/backend dapat membaca & menulis data tanpa diblokir
ALTER TABLE public.ormawa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi_ormawa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ormawa_settings DISABLE ROW LEVEL SECURITY;

-- Buat kebijakan akses terbuka (Permissive Policies)
DROP POLICY IF EXISTS "Allow all access to ormawa" ON public.ormawa;
CREATE POLICY "Allow all access to ormawa" ON public.ormawa FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to absensi_ormawa" ON public.absensi_ormawa;
CREATE POLICY "Allow all access to absensi_ormawa" ON public.absensi_ormawa FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ormawa_settings" ON public.ormawa_settings;
CREATE POLICY "Allow all access to ormawa_settings" ON public.ormawa_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SECTION 5: AKTIFKAN REALTIME AUTO-SYNC SUPABASE
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ormawa;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi_ormawa;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ormawa_settings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
