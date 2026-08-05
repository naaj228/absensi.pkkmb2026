-- ============================================================
-- JALANKAN INI DI SUPABASE DASHBOARD → SQL EDITOR
-- ============================================================

-- 1. Tambah kolom yang kurang di tabel peserta
ALTER TABLE public.peserta 
  ADD COLUMN IF NOT EXISTS jurusan text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Alpha';

-- 2. Tambah kolom yang kurang di tabel approval_manual
ALTER TABLE public.approval_manual
  ADD COLUMN IF NOT EXISTS requested_status text NOT NULL DEFAULT 'Hadir Penuh',
  ADD COLUMN IF NOT EXISTS catatan text,
  ADD COLUMN IF NOT EXISTS issue text,
  ADD COLUMN IF NOT EXISTS nim text,
  ADD COLUMN IF NOT EXISTS nama text,
  ADD COLUMN IF NOT EXISTS gugus_nama text,
  ADD COLUMN IF NOT EXISTS waktu text;

-- 3. Tambah kolom yang kurang di tabel profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nip text,
  ADD COLUMN IF NOT EXISTS gugus_id uuid REFERENCES public.gugus(id);

-- 4. Tambah kolom denormalisasi di tabel absensi (untuk query log lebih cepat)
ALTER TABLE public.absensi
  ADD COLUMN IF NOT EXISTS peserta_nim text,
  ADD COLUMN IF NOT EXISTS peserta_nama text,
  ADD COLUMN IF NOT EXISTS gugus_nama text,
  ADD COLUMN IF NOT EXISTS dicatat_nama text,
  ADD COLUMN IF NOT EXISTS status_log text DEFAULT 'Valid';

-- 5. Nonaktifkan RLS sementara (aktifkan & konfigurasi setelah siap produksi)
ALTER TABLE public.peserta DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gugus DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_manual DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_sessions DISABLE ROW LEVEL SECURITY;

-- 6. Enable realtime (agar semua device auto-update)
ALTER PUBLICATION supabase_realtime ADD TABLE public.peserta;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gugus;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_manual;
ALTER PUBLICATION supabase_realtime ADD TABLE public.absensi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_sessions;

-- 7. Auto-buat profil saat mentor didaftarkan di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'mentor'),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
