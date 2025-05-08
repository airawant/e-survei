-- Aktifkan ekstensi UUID jika belum diaktifkan
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Buat tabel admin untuk menyimpan metadata admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Buat fungsi yang akan menyisipkan data ke tabel admin_users saat user baru dibuat di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buat trigger yang akan dipanggil saat user baru dibuat dengan domain email tertentu
-- Ganti 'your-organization.com' dengan domain email organisasi Anda
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email LIKE '%@kemenag.go.id' OR NEW.email LIKE '%@gmail.com')
  EXECUTE FUNCTION public.handle_new_admin_user();

-- Buat RLS (Row Level Security) policy untuk tabel admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Hanya admin yang dapat melihat dan mengubah data admin
CREATE POLICY "Admin can view their own data"
  ON admin_users
  FOR SELECT
  USING (auth.uid() = id);

-- Langkah Selanjutnya:
-- 1. Jalankan SQL ini di Supabase SQL Editor
-- 2. Buat admin pertama menggunakan SQL berikut (ganti dengan email dan password Anda):

INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES ('admin@kemenag.go.id', crypt('password', gen_salt('bf')), now(), '{"full_name":"Admin Utama"}');

-- ATAU buat admin pertama melalui Supabase Dashboard:
-- 1. Buka Authentication > Users
-- 2. Klik 'Invite User'
-- 3. Masukkan email admin
-- 4. Buka email dan selesaikan pendaftaran
