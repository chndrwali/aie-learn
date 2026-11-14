# TASKS.md

Kerjakan **satu task per sesi**, berurutan. Setiap task kecil dan bisa diverifikasi. Jangan lompat ke task berikutnya sebelum "Verifikasi" lulus.

## Prompt pembuka sesi (salin, ganti nomor task)

```
Baca AGENTS.md dan PRD.md. Lalu baca bagian task T{n} di TASKS.md beserta dokumen yang dirujuknya.
Kerjakan HANYA task itu. Sebelum menulis kode, tulis rencana singkat: file yang akan disentuh dan
hal yang ambigu. Jika ada ambigu, tanya dulu. Setelah selesai, jalankan langkah Verifikasi dan laporkan
hasilnya apa adanya, termasuk yang gagal. Temuan di luar scope masuk "Backlog temuan", jangan dikerjakan.
```

## Prompt jika agent melenceng

```
Berhenti. Kembali ke task T{n}. Daftar file yang kamu ubah di luar scope task, lalu revert perubahan itu.
Baca ulang AGENTS.md bagian "Aturan keamanan" dan "Aturan kode", lalu lanjutkan hanya yang diminta task.
```

---

## Fase 1: Fondasi dan data

### T0. Setup proyek

**Tujuan:** repo baru dari starter, bersih dari bawaan demo, siap menjalankan unit test.

- [ ] Buat repo dari template `chndrwali/nextjs-starter-kit`, ganti nama proyek
- [ ] Jalankan sesuai README starter: install, Neon, `prisma migrate dev`, secret Better Auth, `.env`
- [ ] Salin dokumen ini ke root repo. Pindahkan `PRD.md` template bawaan starter ke `docs/PRD-TEMPLATE.md` (atau hapus), `PRD-EXAMPLE.md` ke `docs/`. Timpa `front-end-flow.md` dan `backend_flow.md` bawaan setelah membaca isinya; pertahankan hal berguna yang belum tercakup
- [ ] Buat `CLAUDE.md` berisi `@AGENTS.md`
- [ ] Tambah Vitest, script `typecheck` (`tsc --noEmit`) dan `test`
- [ ] Tambah `THIRD_PARTY_NOTICES.md` (isi: lisensi MIT upstream, salin dari `LICENSE` upstream)
- [ ] Tambah `.content-cache/` ke `.gitignore`

**Acceptance:** `npm run dev` jalan; register dan login bawaan starter berfungsi; `npm run typecheck` dan `npm run test` (boleh 0 test) lulus.
**Verifikasi:** jalankan keempat perintah, tangkap layar login berhasil.

### T1. Model database

**Rujukan:** `DATABASE.md`
- [ ] Tambah enum dan model `Phase`, `Lesson`, `LessonProgress`, `Note`, `ContentSync`
- [ ] Tambah relasi balik pada `User`
- [ ] `npx prisma migrate dev --name add_learning_models` lalu `npx prisma generate`

**Acceptance:** migrasi sukses; `User` dan model auth tidak berubah selain relasi balik; typecheck lulus.
**Verifikasi:** `npx prisma studio` menampilkan tabel baru; login masih berfungsi.

### T2. Script ingest

**Rujukan:** `CONTENT-PIPELINE.md` (seluruhnya)
- [ ] `modules/learning/lib/parse-lesson.ts` + test dengan fixture (termasuk header lengkap, header sebagian, tanpa H1)
- [ ] `modules/learning/lib/rewrite-links.ts` + test (semua baris tabel aturan link, kasus di dalam code fence)
- [ ] `scripts/ingest-content.ts`: fetch, pass 1, pass 2, pass 2b (terjemah ke Bahasa Indonesia, glosarium di `content-meta/glossary.json`), upsert, report, pengaman, `--dry-run`, `--force`, `--ref`
- [ ] `content-meta/phases.json` dan `phase-graph.json` dari dokumen
- [ ] Script `content:sync` di `package.json`; env `CONTENT_REPO_URL` dan `CONTENT_REF`

**Acceptance:** `npm run content:sync -- --dry-run` mencetak report tanpa menulis DB; unit test parse dan rewrite lulus.
**Verifikasi:** tempel report dry-run di laporan sesi.

### T3. Sync pertama dan verifikasi konten

**Rujukan:** checklist di akhir `CONTENT-PIPELINE.md`
- [ ] Jalankan `content:sync` terhadap database **development**
- [ ] Kerjakan seluruh checklist verifikasi dan tulis hasilnya di `docs/CONTENT-REPORT.md`
- [ ] Putuskan: `remark-math`/KaTeX? mermaid? HTML mentah? Catat keputusan di laporan
- [ ] Jalankan sync kedua: pastikan `added: 0, updated: 0`
- [ ] Spot-check terjemahan 5 lesson acak: istilah konsisten dengan glosarium, tidak ada kalimat Inggris tertinggal kecuali istilah teknis/nama

**Acceptance:** DB berisi fase dan lesson; laporan verifikasi tersimpan; keputusan plugin renderer tertulis.
**Verifikasi:** `docs/CONTENT-REPORT.md` berisi angka nyata (bukan perkiraan) per fase.

### T4. Gating dan landing sementara

**Rujukan:** `front-end-flow.md` (Guard dan callbackURL), PRD FR-001 sampai FR-003
- [ ] `lib/safe-redirect.ts` (`getSafeCallbackUrl`) + test seluruh tabel kasus
- [ ] Baca `proxy.ts` lalu extend untuk path belajar (cek cookie, redirect dengan `callbackURL`)
- [ ] Buat `app/(learn)/layout.tsx` dengan guard server dan metadata `noindex`
- [ ] Halaman placeholder `/dashboard` (teks sederhana)
- [ ] Form login memakai `getSafeCallbackUrl`; setelah login default ke `/dashboard`
- [ ] Ganti `app/(public)/page.tsx` dari redirect menjadi landing sementara (judul + tombol Masuk/Daftar)
- [ ] Hapus pemakaian `login-account-info` di halaman login
- [ ] `app/robots.ts`

**Acceptance:** semua poin US-02 dan US-03 terpenuhi.
**Verifikasi:**
- `curl -I http://localhost:3000/dashboard` tanpa cookie → 307 ke `/login?callbackURL=%2Fdashboard`
- Login dari `/login?callbackURL=/dashboard` → masuk dashboard
- `/login?callbackURL=https://evil.com` setelah login → `/dashboard`

### T5. Router tRPC

**Rujukan:** `backend_flow.md`, `DATABASE.md` (Query penting)
- [ ] Pure function + test: `resolveContinue`, `computePhaseProgress`
- [ ] `modules/learning/server/*`: katalog, lesson, progress, (note dan search ditunda)
- [ ] Router: `landing`, `catalog`, `lesson`, `progress` di `trpc/routers/`, daftarkan di `_app.ts`
- [ ] Test integrasi (Neon branch atau DB test): isolasi antar user, idempotensi `markComplete`, `visit` tidak menurunkan `COMPLETED`, `UNAUTHORIZED` tanpa session, `landing.outline` tidak membocorkan `contentMd`

**Acceptance:** semua baris tabel procedure (kecuali note, search, admin) berfungsi; semua test lulus.
**Verifikasi:** laporkan daftar test dan hasilnya.

---

## Fase 2: Pengalaman belajar

### T6. Shell learner

**Rujukan:** `DESIGN.md` bagian 3, 4, 6; `front-end-flow.md`
- [ ] Terapkan token warna di `globals.css`; tambahkan Source Serif 4 via `next/font`
- [ ] Config nav learner (Dashboard, Kurikulum). Baca dulu `modules/admin/ui/config/` dan `use-nav.ts`
- [ ] Shell: sidebar, header, breadcrumb, skip link; dipakai oleh `(learn)/layout.tsx`
- [ ] Mode terang dan gelap sama-sama diperiksa

**Acceptance:** shell tampil benar di desktop dan 375px; kontras token lulus pemeriksaan devtools.
**Verifikasi:** tangkap layar terang/gelap, desktop/mobile.

### T7. Lesson viewer

**Rujukan:** `front-end-flow.md` (Komposisi lesson page, MarkdownRenderer), `DESIGN.md` bagian 3 dan 4
- [ ] Route `/learn/[phase]/[lesson]` + `loading.tsx`, `error.tsx`, `notFound`
- [ ] `MarkdownRenderer` sesuai spesifikasi (plugin sesuai keputusan T3)
- [ ] `CodeBlock` dengan tombol salin
- [ ] `LessonHeader`, `LessonToc`, `AttributionFooter`, prev/next (tanpa progress dulu)

**Acceptance:** lima lesson acak dari berbagai fase tampil benar; tidak ada raw HTML dirender; link internal berfungsi; tidak ada scroll horizontal pada body di 375px.
**Verifikasi:** buka lesson dari Fase 0, 3, 8, 10, 13; lampirkan tangkap layar.

### T8. Progress UX

**Rujukan:** PRD FR-007 sampai FR-010, `front-end-flow.md` (MarkCompleteButton)
- [ ] `ProgressMark` (tiga status, ARIA)
- [ ] `LessonVisitTracker` (sekali per mount per `lessonId`)
- [ ] `MarkCompleteButton` dengan optimistic update dan rollback
- [ ] `SyllabusSidebar` (Sheet di mobile)
- [ ] Footer nav: Selesai dan lanjut, Batalkan selesai, Sebelumnya, Berikutnya

**Acceptance:** US-05 dan US-06 terpenuhi. Klik ganda cepat tidak membuat error. Simulasi kegagalan jaringan memicu rollback dan toast.
**Verifikasi:** demo manual: selesaikan 3 materi, refresh, login dari browser lain, status sama.

### T9. Dashboard, kurikulum, halaman fase

**Rujukan:** `DESIGN.md` bagian 4 dan 5; PRD FR-004, FR-005, FR-008, FR-009, FR-011
- [ ] `/dashboard`: `ContinueCard`, progress total, daftar fase, 5 aktivitas terakhir
- [ ] `/curriculum` dan `/curriculum/[phase]` dengan `PhaseRow` dan `LessonRow`
- [ ] State loading, kosong, error sesuai tabel

**Acceptance:** US-04 terpenuhi; persen sesuai `computePhaseProgress`; learner baru melihat ajakan mulai.
**Verifikasi:** dua akun berbeda memiliki progress berbeda dan tidak saling terlihat.

### T10. Landing final dan peta kurikulum

**Rujukan:** `DESIGN.md` bagian 4 (Landing), bagian 5 (Peta), bagian 7 (Gerak)
- [ ] `lib/phase-graph-layout.ts` (fungsi murni) + test: kedalaman lapisan sesuai `phase-graph.json` (mis. Fase 3 di kedalaman 3, Fase 19 di kedalaman 12)
- [ ] `PhaseMap` SVG, versi statis untuk landing; fallback daftar di `< md`
- [ ] Landing penuh: hero + peta, daftar fase (dari `landing.outline`), cara kerja, atribusi
- [ ] Satu animasi masuk peta; `prefers-reduced-motion` dihormati

**Acceptance:** FR-001, FR-013, FR-016. HTML landing tidak memuat `contentMd` atau judul materi.
**Verifikasi:** `curl` halaman `/` dan cari judul materi sebagai kata kunci: tidak ada. Uji `prefers-reduced-motion`.

---

## Fase 3: Kualitas dan rilis

### T11. E2E

- [ ] Playwright: (1) anonim ke `/learn/...` → login → kembali ke materi tujuan, (2) register → buka materi → selesai → refresh → status tetap, (3) dashboard "Lanjutkan belajar" menuju materi benar
- [ ] CI sederhana (opsional): typecheck, lint, test

**Acceptance:** ketiga alur lulus berulang (tidak flaky) 3 kali berturut-turut.

### T12. Deploy dan hardening

- [ ] Vercel: env dari `.env.example`; `BETTER_AUTH_URL` dan `NEXT_PUBLIC_URL` = domain production
- [ ] Database production terpisah; jalankan migrasi; jalankan `content:sync` terhadap production dengan SHA ter-pin
- [ ] Buat akun owner, set `role = admin` lewat database
- [ ] Putuskan Resend (FR-107) atau sembunyikan link "Lupa password"
- [ ] Periksa: cookie secure, `robots`, `noindex` di halaman belajar, footer atribusi
- [ ] Lighthouse landing dan satu halaman materi; catat LCP

**Acceptance:** semua checklist di atas dicentang; tidak ada rahasia di repo (`git log -p | grep` untuk pola kunci).

---

## Fase 4: Enhancement (Should), kerjakan sesuai kebutuhan

| Task | Isi | Rujukan |
| --- | --- | --- |
| T13 | Catatan per materi: `note.*`, editor sederhana (textarea), autosave 800 ms, halaman `/notes` | FR-101 |
| T14 | Cmd+K: `search.lessons`, pakai `Command` yang sudah ada | FR-102 |
| T15 | Streak dan heatmap dari `completedAt` | FR-103 |
| T16 | `/admin/content`: status sync terakhir dari `ContentSync` | FR-104 |
| T17 | Halaman profil: ganti nama, ganti password | FR-105 |
| T18 | Peta dengan state progres di dashboard dan curriculum | FR-106 |

Setiap task Should memakai format yang sama: rencana singkat, implementasi, verifikasi. Fitur Could Have (PRD bagian 3) tidak dikerjakan sebelum ada keputusan eksplisit.

---

## Backlog temuan

Catat di sini hal yang ditemukan di luar scope task (bug, ide, ketidaksesuaian dokumen). Jangan dikerjakan sebelum dijadwalkan.

- (kosong)
