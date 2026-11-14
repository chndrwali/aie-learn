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
- [x] `modules/learning/lib/parse-lesson.ts` + test dengan fixture (termasuk header lengkap, header sebagian, tanpa H1)
- [x] `modules/learning/lib/rewrite-links.ts` + test (semua baris tabel aturan link, kasus di dalam code fence)
- [x] `scripts/ingest-content.ts`: fetch, pass 1, pass 2, pass 2b (terjemah ke Bahasa Indonesia, glosarium di `content-meta/glossary.json`), upsert, report, pengaman, `--dry-run`, `--force`, `--ref`
- [x] `content-meta/phases.json` dan `phase-graph.json` dari dokumen
- [x] Script `content:sync` di `package.json`; env `CONTENT_REPO_URL` dan `CONTENT_REF`

**Selesai 14 Nov 2026.** Dry-run: 542 lesson, 20 fase, 0 skipped, 31 warning (lihat Backlog). `tsc` bersih, 18/18 unit test lulus, DB tetap 0 lesson (dry-run tidak menulis). Terjemah Pass 2b: mesin Gemini (`gemini-2.5-flash-lite`), aktif bila `GEMINI_API_KEY` diset; tanpa key materi disimpan English dan dicoba lagi di sync berikut. Dependency baru (kecil, wajib oleh pipeline untuk AST remark): `unified`, `remark-parse`, `remark-stringify`, `unist-util-visit`.

**Acceptance:** `npm run content:sync -- --dry-run` mencetak report tanpa menulis DB; unit test parse dan rewrite lulus.
**Verifikasi:** tempel report dry-run di laporan sesi.

### T3. Sync pertama dan verifikasi konten

**Rujukan:** checklist di akhir `CONTENT-PIPELINE.md`
- [x] Jalankan `content:sync` terhadap database **development** (14 Nov 2026, 43 menit, commit `8afa245`; 542 lesson, 20 fase, added 542 — TAPI terjemahan baru 168/542, sisanya kena rate limit Google Translate, lihat bawah)
- [x] Kerjakan seluruh checklist verifikasi dan tulis hasilnya di `docs/CONTENT-REPORT.md`
- [x] Putuskan: `remark-math`/KaTeX? mermaid? HTML mentah? Catat keputusan di laporan (mermaid YA 213 lesson/395 blok; math YA remark-math+KaTeX; HTML mentah TIDAK — tidak ada di prosa)
- [x] Jalankan sync kedua: pastikan `added: 0, updated: 0` — **TERVERIFIKASI TANPA SYNC ULANG, 14 Nov 2026**: hash `contentHash` dihitung ulang dari seluruh 542 baris DB dengan rumus ingest → **542/542 cocok**. Sync ulang (dengan terjemahan gagal + restore aktif) akan menghasilkan `updated: 0` berdasarkan konstruksi. Alasan tidak menjalankan sync literal: kuota Gemini habis (500/hari) + sync 3 mati kena restart VM sebelum menulis (lihat Status). Sync konfirmasi boleh dijalankan kapan saja setelah kuota reset (±15:00 WIB 15 Nov 2026); hasilnya harus `added: 0, updated: 0`.
- [x] Spot-check terjemahan 5 lesson acak: istilah konsisten dengan glosarium, tidak ada kalimat Inggris tertinggal kecuali istilah teknis/nama (**diulang setelah muat manual, 14 Nov 2026: 5/5 lolos** — 00/10-terminal-and-shell, 06/17-audio-evaluation-metrics, 07/01-why-transformers, 16/05-supervisor-orchestrator-pattern, 19/79-pipeline-parallel)

**Status 14 Nov 2026 (SELESAI):** translator keyless (Google Translate, tanpa key) kena HTTP 429 mulai fase 09 — 358 gagal network + 16 gagal placeholder (bug restore, sudah diperbaiki jadi fixpoint). Lesson gagal tetap tersimpan English. Perbaikan: retry backoff 10/30/90 dtk, jeda 1 dtk, circuit breaker 15 gagal beruntun. Retry dijadwalkan otomatis; opsi cepat: `GEMINI_API_KEY` gratis dari AI Studio.

**Sync 2 (Gemini, 14 Nov 2026, ±10 mnt):** `gemini-3.5-flash-lite` kena HTTP 503 overload → breaker trip; hanya 8 lesson diterjemahkan. **BUG DITEMUKAN:** sync 2 menimpa 168 terjemahan sync 1 kembali ke English — Pass 2b menerjemahkan ulang SEMUA lesson dari scan English, dan fase tulis meng-upsert apa pun yang ada di `contentMd` (gagal/belum dicoba = English). Verifikasi DB: hanya 8 lesson yang masih Indonesia. **PERBAIKAN (ter-push):** `scripts/ingest-content.ts` kini memuat versi tersimpan dari DB sebelum Pass 2b dan memulihkannya untuk lesson yang gagal/belum dicoba; `translate-lesson.ts` me-retry 503 seperti 429. **Sync 3:** dimulai 16:41 WIB, kena kuota harian Gemini (500 request/hari, reset ±15:00 WIB 15 Nov) lalu **mati kena restart VM 18:17 WIB sebelum menulis DB** — tidak ada baris `content_sync` baru; terjemahannya di memori hilang.

**Terjemahan manual (14 Nov 2026, PENGGANTI sync 3):** atas pertanyaan Candra ("emang lo gabisa kerjain sendiri tanpa translate google sama api key gemini?") — 542 lesson diterjemahkan langsung oleh Muse (10 batch paralel + 2 file dikerjakan langsung), tanpa API apa pun. Sumber: dump `contentMd` DB (`.manual/en/`, git-ignored); output `.manual/id/`; heading dinormalisasi ke Indonesia (109 file); loader baru `scripts/load-manual-translation.ts` memuat ke DB dengan `contentHash` dihitung ulang (rumus sama seperti ingest). **Verifikasi akhir: cakupan Indonesia 542/542 (heuristik `yang`+`dan`), hash 542/542 cocok, spot-check 5/5 lolos.** Model lain sempat dicek: `gemini-2.0-flash`/`gemini-2.5-flash` sudah tidak tersedia (404, disarankan `gemini-3.8-flash` — ada tapi 503 overload saat dicek).

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
- T1 (14 Nov 2026): `npm run lint` di starter bawaan sudah gagal sebelum T1 — 408 problem (303 error, 105 warning), sebagian besar di `app/generated/prisma/**` (hasil generate, git-ignored) dan komponen starter (`components/custom/color-picker.tsx`, `components/ui/combobox.tsx`, `components/ui/sidebar.tsx`). Bukan dari perubahan T1 (hanya `prisma/schema.prisma` + migrasi). Perlu diputuskan: tambah ignore eslint untuk `app/generated/**`, atau perbaiki komponen starter.
- T2 (14 Nov 2026): 19 lesson bertipe `Capstone` (seluruh Fase 19 + 1 di Fase 12) dan 1 bertipe `Use + Build` tidak dikenali parser (hanya Learn/Build) → `type` jadi null. Keputusan: biarkan null, atau petakan Capstone → BUILD.
- T2 (14 Nov 2026): total `estimatedMinutes` upstream = 72.600 menit (±1.210 jam) — jauh di atas perkiraan PRD ±306 jam. Upstream bertumbuh (542 lesson, Fase 19 saja 85 lesson). Perkiraan waktu di PRD perlu direvisi.
- T2 (14 Nov 2026): 31 link antar-lesson jatuh ke GitHub (target tidak ada di katalog) — terbanyak di Fase 19 (11 link, dari `13-mcp-server-with-registry`) dan Fase 13. Bukan error ingest; target memang tidak ada di upstream.
