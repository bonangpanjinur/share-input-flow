

## Fitur Tracking Sertifikat Halal untuk UMKM

### Ringkasan
Menambahkan sistem tracking proses sertifikasi halal yang bisa diakses UMKM tanpa login (via kode tracking) atau dengan login. Status diperbarui otomatis oleh sistem (saat NIB/sertifikat diupload) dan manual oleh admin.

### Alur Proses
```text
[1. Data Terisi] --> [2. NIB Selesai] --> [3. Pengajuan] --> [4. Sertifikat Selesai]
    (auto)            (auto saat          (manual oleh        (auto saat file
                       NIB diupload)       admin)              sertifikat diupload
                                                               + tombol download)
```

### Perubahan yang Diperlukan

#### 1. Database Migration
- Tambah kolom `sertifikat_url` (text) di `data_entries` -- file sertifikat halal
- Tambah kolom `tracking_code` (text, unique) di `data_entries` -- kode untuk tracking publik
- Tambah nilai enum `entry_status`: `nib_selesai`, `pengajuan`, `sertifikat_selesai`
- Trigger otomatis:
  - Generate `tracking_code` saat INSERT (format: `HT-XXXXXX`)
  - Update status ke `nib_selesai` saat `nib_url` diisi
  - Update status ke `sertifikat_selesai` saat `sertifikat_url` diisi
- RLS policy: allow public SELECT on `data_entries` by `tracking_code` (hanya kolom tertentu via view)

#### 2. Public Tracking View (Database)
- Buat view `public.tracking_view` yang hanya expose: `tracking_code`, `nama`, `status`, `sertifikat_url`, `created_at` -- tanpa data sensitif (KTP, alamat, HP)
- RLS aman karena view hanya menampilkan field non-sensitif

#### 3. Halaman Tracking Publik (`/tracking`)
- Buat `src/pages/TrackingPage.tsx`
- Input field untuk kode tracking (format HT-XXXXXX)
- Tampilkan progress steps visual:
  - Data Terisi (check icon hijau)
  - NIB Selesai (check/pending)
  - Pengajuan (check/pending)
  - Sertifikat Selesai (check/pending + tombol Download)
- Tidak perlu login

#### 4. Update PublicForm - Tampilkan Kode Tracking
- Setelah submit berhasil, tampilkan kode tracking ke UMKM
- Pesan: "Simpan kode ini untuk melacak proses sertifikat Anda: HT-XXXXXX"
- Tombol copy kode + link ke halaman tracking

#### 5. Update Form Admin - Upload Sertifikat + Status Manual
- Tambah field upload sertifikat halal di `DataEntryForm` (hanya untuk super_admin/admin)
- Tambah dropdown status manual "Pengajuan" di `GroupDetail`
- Update `STATUS_CONFIG` dengan status baru (`nib_selesai`, `pengajuan`, `sertifikat_selesai`)

#### 6. Update Routing
- Tambah route `/tracking` dan `/tracking/:code` di `App.tsx` (public, tanpa login)

#### 7. Update Dashboard
- Statistik status baru ditampilkan di chart

### Detail Teknis

**File yang dibuat:**
- `src/pages/TrackingPage.tsx` -- halaman tracking publik

**File yang diubah:**
- `src/App.tsx` -- tambah route tracking
- `src/pages/PublicForm.tsx` -- tampilkan tracking code setelah submit
- `src/components/DataEntryForm.tsx` -- tambah field upload sertifikat
- `src/pages/GroupDetail.tsx` -- update STATUS_CONFIG dengan status baru + tampilkan tracking code
- `src/pages/Dashboard.tsx` -- update status labels/colors untuk status baru

**Database migration:**
- Alter `entry_status` enum (tambah 3 nilai baru)
- Alter `data_entries` (tambah 2 kolom)
- Create trigger untuk auto-generate tracking code
- Create trigger untuk auto-update status
- Create view `tracking_view`
- RLS policy untuk akses publik ke view

