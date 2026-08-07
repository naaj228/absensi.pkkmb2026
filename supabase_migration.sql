-- ============================================================
-- JALANKAN INI DI SUPABASE DASHBOARD → SQL EDITOR
-- ============================================================

-- 1. Tambah kolom yang kurang di tabel peserta
ALTER TABLE public.peserta 
  ADD COLUMN IF NOT EXISTS jurusan text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Belum Hadir';

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
  ADD COLUMN IF NOT EXISTS phone text,
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
    COALESCE(new.raw_user_meta_data->>'role', 'mentor')::public.user_role,
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

-- ============================================================
-- GEOFENCING & GEOLOCATION MIGRATIONS
-- ============================================================

-- 8. Tambah kolom log lokasi ke tabel absensi
ALTER TABLE public.absensi
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_status text DEFAULT 'Dalam Area',
  ADD COLUMN IF NOT EXISTS distance_meters integer;

-- 9. Buat tabel location_settings untuk konfigurasi absensi
CREATE TABLE IF NOT EXISTS public.location_settings (
  id integer PRIMARY KEY DEFAULT 1,
  latitude double precision NOT NULL DEFAULT -6.966748,
  longitude double precision NOT NULL DEFAULT 107.672466,
  radius_meters integer NOT NULL DEFAULT 150,
  location_name text NOT NULL DEFAULT 'Gedung Utama PKKMB (Digitech University)',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1)
);

-- Seed data awal koordinat
INSERT INTO public.location_settings (id, latitude, longitude, radius_meters, location_name)
VALUES (1, -6.966748, 107.672466, 150, 'Gedung Utama PKKMB (Digitech University)')
ON CONFLICT (id) DO NOTHING;

-- Disable RLS sementara untuk lokalan
ALTER TABLE public.location_settings DISABLE ROW LEVEL SECURITY;

-- Tambah ke realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_settings;

-- ============================================================
-- PRODUCTION SECURITY & RLS POLICIES (AMANKAN DATABASE)
-- ============================================================
-- CATATAN: Jalankan script di bawah ini jika ingin mengamankan database
-- dari kecurangan/akses tidak sah oleh pihak luar/mahasiswa.

-- 1. Aktifkan RLS di seluruh tabel
ALTER TABLE public.peserta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gugus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_settings ENABLE ROW LEVEL SECURITY;

-- 2. Kebijakan Tabel: PROFILES (Dibagi per-aksi untuk mencegah loop/rekursi RLS)
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin delete profiles" ON public.profiles;

CREATE POLICY "Allow admin insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);
CREATE POLICY "Allow admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);
CREATE POLICY "Allow admin delete profiles" ON public.profiles FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

DROP POLICY IF EXISTS "Allow users update own profiles" ON public.profiles;
CREATE POLICY "Allow users update own profiles" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. Kebijakan Tabel: GUGUS
DROP POLICY IF EXISTS "Allow authenticated read gugus" ON public.gugus;
CREATE POLICY "Allow authenticated read gugus" ON public.gugus FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin all gugus" ON public.gugus;
CREATE POLICY "Allow admin all gugus" ON public.gugus FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

-- 4. Kebijakan Tabel: PESERTA
DROP POLICY IF EXISTS "Allow authenticated read peserta" ON public.peserta;
CREATE POLICY "Allow authenticated read peserta" ON public.peserta FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow mentors to update status of their own gugus students" ON public.peserta;
CREATE POLICY "Allow mentors to update status of their own gugus students" ON public.peserta FOR UPDATE TO authenticated USING (
  gugus_id = (SELECT gugus_id FROM public.profiles WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

DROP POLICY IF EXISTS "Allow admin all peserta" ON public.peserta;
CREATE POLICY "Allow admin all peserta" ON public.peserta FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

-- 5. Kebijakan Tabel: ABSENSI (LOGS)
DROP POLICY IF EXISTS "Authenticated full access" ON public.absensi;
DROP POLICY IF EXISTS "Allow authenticated read absensi" ON public.absensi;
CREATE POLICY "Allow authenticated read absensi" ON public.absensi FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow mentors to insert absensi" ON public.absensi;
CREATE POLICY "Allow mentors to insert absensi" ON public.absensi FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.peserta p
    WHERE p.nim = peserta_nim
    AND (
      p.gugus_id = (SELECT gugus_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role::text = 'admin'
      )
    )
  )
);

DROP POLICY IF EXISTS "Allow admin edit absensi" ON public.absensi;
CREATE POLICY "Allow admin edit absensi" ON public.absensi FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

-- 6. Kebijakan Tabel: QR_SESSIONS
DROP POLICY IF EXISTS "Authenticated full access" ON public.qr_sessions;
DROP POLICY IF EXISTS "Allow authenticated read qr_sessions" ON public.qr_sessions;
CREATE POLICY "Allow authenticated read qr_sessions" ON public.qr_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin all qr_sessions" ON public.qr_sessions;
CREATE POLICY "Allow admin all qr_sessions" ON public.qr_sessions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

-- 7. Kebijakan Tabel: APPROVAL_MANUAL
DROP POLICY IF EXISTS "Authenticated full access" ON public.approval_manual;
DROP POLICY IF EXISTS "Allow authenticated read approval_manual" ON public.approval_manual;
CREATE POLICY "Allow authenticated read approval_manual" ON public.approval_manual FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow mentors to insert approval_manual" ON public.approval_manual;
CREATE POLICY "Allow mentors to insert approval_manual" ON public.approval_manual FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.peserta p
    WHERE p.nim = nim
    AND (
      p.gugus_id = (SELECT gugus_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role::text = 'admin'
      )
    )
  )
);

DROP POLICY IF EXISTS "Allow admin all approval_manual" ON public.approval_manual;
CREATE POLICY "Allow admin all approval_manual" ON public.approval_manual FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

-- 8. Kebijakan Tabel: LOCATION_SETTINGS (Diaktifkan dan diamankan: semua user authenticated bisa membaca, hanya admin yang bisa mengubah)
ALTER TABLE public.location_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read location_settings" ON public.location_settings;
CREATE POLICY "Allow authenticated read location_settings" ON public.location_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin all location_settings" ON public.location_settings;
CREATE POLICY "Allow admin all location_settings" ON public.location_settings FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

-- Hapus juga kebijakan default "Authenticated full access" dari tabel lain jika ada
DROP POLICY IF EXISTS "Authenticated full access" ON public.peserta;
DROP POLICY IF EXISTS "Authenticated full access" ON public.gugus;
DROP POLICY IF EXISTS "Authenticated full access" ON public.profiles;

-- 9. Amankan Fungsi Postgres (Mutable Search Path & Hak Eksekusi)
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    EXECUTE 'ALTER FUNCTION public.is_admin() SET search_path = public;';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_is_admin') THEN
    EXECUTE 'ALTER FUNCTION public.check_is_admin() SET search_path = public;';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.check_is_admin() FROM public, anon;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated, service_role;';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_gugus_id') THEN
    EXECUTE 'ALTER FUNCTION public.get_my_gugus_id() SET search_path = public;';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_my_gugus_id() FROM public, anon;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_my_gugus_id() TO authenticated, service_role;';
  END IF;
END
$$;
