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
- [x] `lib/safe-redirect.ts` (`getSafeCallbackUrl`) + test seluruh tabel kasus (27 test, semua lolos — tabel 9 kasus dari front-end-flow + 18 varian serangan/tambahan)
- [x] Baca `proxy.ts` lalu extend untuk path belajar (cek cookie, redirect dengan `callbackURL`) — matcher kini `/admin/:path*`, `/dashboard`, `/curriculum/:path*`, `/learn/:path*`, `/notes/:path*`, `/settings/:path*`; tanpa cookie → `/login?callbackURL=<path+query>` (kecuali /admin, tetap plain `/login` seperti bawaan starter); bila ada cookie, proxy menyetel header `x-pathname` untuk guard lapis 2
- [x] Buat `app/(learn)/layout.tsx` dengan guard server dan metadata `noindex` — `getSession()`; tanpa session → redirect `/login?callbackURL=<path>` (path dari header `x-pathname`, fallback `x-invoke-path`/`next-url`/`/dashboard`)
- [x] Halaman placeholder `/dashboard` (teks sederhana)
- [x] Form login memakai `getSafeCallbackUrl`; setelah login default ke `/dashboard` — `login/page.tsx` (Server Component) membaca `searchParams.callbackURL` dan meneruskannya sebagai prop ke `AuthForm`; `signIn.email` + `router.push` memakai hasil sanitasi; teks "Masuk untuk membuka materi." tampil bila datang dari gating (DESIGN.md). Perubahan pendamping: `(auth)/layout.tsx` kini redirect pengguna login ke `/dashboard` (sebelumnya `/admin`) supaya konsisten dengan default pasca-login dan tidak ada balapan dengan `router.push`.
- [x] Ganti `app/(public)/page.tsx` dari redirect menjadi landing sementara (judul + tombol Masuk/Daftar) — Server Component; bila sudah login tombolnya "Ke dashboard"; ada atribusi upstream (MIT) di footer kecil
- [x] Hapus pemakaian `login-account-info` di halaman login
- [x] `app/robots.ts` — disallow `/dashboard`, `/curriculum`, `/learn`, `/admin`

**Selesai 14 Nov 2026.** `tsc` bersih; lint bersih pada file yang disentuh (lint repo-wide sudah rusak sebelum T1, 408 masalah bawaan starter); unit test 45/45 lulus (27 safe-redirect + 18 lib learning).

**Verifikasi (curl + API, 14 Nov 2026):** `/dashboard` tanpa cookie → 307 `/login?callbackURL=%2Fdashboard`; `/learn/07-.../01-why-transformers` → 307 dengan callbackURL ter-encode; `/curriculum` → 307; `/` → 200 (landing, ada "AIE Learn"/"Daftar"/"Masuk"); `/robots.txt` → 4 disallow benar; cookie sesi PALSU → `/dashboard` tetap 307 (guard lapis 2 layout bekerja, bukan cuma proxy); registrasi + login via API Better Auth berhasil, lalu `/dashboard` dengan cookie sesi asli → 200 + placeholder tampil; `/` dengan cookie → tombol "Ke dashboard"; `/login` dan `/register` dengan cookie → 307 ke `/dashboard`. Akun tes dihapus setelah verifikasi (0 user di DB).

**Catatan jujur — cek browser sungguhan TIDAK jalan:** browser cloud tidak bisa membuka `http://localhost:3000` (localhost sandbox tidak terjangkau dari luar); percobaan tunnel gagal — Cloudflare quick tunnel ditolak TLS oleh proxy egress, localtunnel menggantung tanpa URL. Jadi langkah "cek manual di browser desktop + 375px" belum terpenuhi untuk T4; yang terverifikasi adalah SSR/curl + alur auth via API + unit test. Cek visual (termasuk 375px) bisa dilakukan saat Candra menjalankan dev server di mesinnya sendiri, atau setelah deploy.

**Acceptance:** semua poin US-02 dan US-03 terpenuhi.
**Verifikasi:**
- `curl -I http://localhost:3000/dashboard` tanpa cookie → 307 ke `/login?callbackURL=%2Fdashboard`
- Login dari `/login?callbackURL=/dashboard` → masuk dashboard
- `/login?callbackURL=https://evil.com` setelah login → `/dashboard`

### T5. Router tRPC

**Rujukan:** `backend_flow.md`, `DATABASE.md` (Query penting)
- [x] Pure function + test: `resolveContinue`, `computePhaseProgress` (`modules/learning/lib/progress.ts`, 11 test — kasus 1–4 + materi terakhir dinonaktifkan + tanpa materi aktif; percent dibulatkan, total 0 → 0)
- [x] `modules/learning/server/*`: katalog, lesson, progress, (note dan search ditunda) — `landing.ts` (outline allowlist), `catalog.ts`, `lesson.ts`, `progress.ts`, `common.ts` (requireActiveLesson, findActivePhase, notFound "Materi tidak ditemukan.")
- [x] Router: `landing`, `catalog`, `lesson`, `progress` di `trpc/routers/`, daftarkan di `_app.ts` — note.* (T13), search.* (T14), admin.* (T16) TIDAK dibuat di T5 sesuai rencana. Pesan error `trpc/init.ts` disamakan dengan tabel backend_flow (UNAUTHORIZED "Silakan masuk terlebih dahulu.", FORBIDDEN "Kamu tidak punya akses ke halaman ini.")
- [x] Test integrasi (Neon branch atau DB test): isolasi antar user, idempotensi `markComplete`, `visit` tidak menurunkan `COMPLETED`, `UNAUTHORIZED` tanpa session, `landing.outline` tidak membocorkan `contentMd` — `modules/learning/server/learning.integration.test.ts`, 12 test, DB test langsung (session dimock, user tes dibuat + dihapus otomatis; skip bila DATABASE_URL tidak diset)

**Selesai 19 Nov 2026.** `vitest.config.ts` BARU (alias `@/*` seperti tsconfig — sebelumnya Vitest tidak bisa resolve `@/`, padahal test unit lama hanya pakai import relatif). `tsc` bersih; lint bersih pada file yang disentuh; unit test 56/56 lulus (progress 11 + parse/rewrite 18 + safe-redirect 27); integrasi 12/12 lulus (±12 dtk via tunnel Neon); tanpa DATABASE_URL file integrasi skip 12/12 (tidak crash). DB bersih setelah test (0 user, 0 progress).

**Acceptance:** semua baris tabel procedure (kecuali note, search, admin) berfungsi; semua test lulus.
**Verifikasi:** laporkan daftar test dan hasilnya.

---

## Fase 2: Pengalaman belajar

### T6. Shell learner

**Rujukan:** `DESIGN.md` bagian 3, 4, 6; `front-end-flow.md`
- [x] Terapkan token warna di `globals.css`; tambahkan Source Serif 4 via `next/font`
- [x] Config nav learner (Dashboard, Kurikulum). Baca dulu `modules/admin/ui/config/` dan `use-nav.ts`
- [x] Shell: sidebar, header, breadcrumb, skip link; dipakai oleh `(learn)/layout.tsx`
- [x] Mode terang dan gelap sama-sama diperiksa

**Acceptance:** shell tampil benar di desktop dan 375px; kontras token lulus pemeriksaan devtools.
**Verifikasi:** tangkap layar terang/gelap, desktop/mobile.

**Selesai 19 Nov 2026.** Token DESIGN.md §3 diterapkan di `globals.css` (termasuk `--radius: 0.375rem`; var sidebar mengikuti palet); Source Serif 4 via `next/font` (variabel `--font-source-serif`, utilitas `font-serif`; terverifikasi di class `<body>` + stylesheet). Shell pakai komponen shadcn (bukan rakitan manual): `Sidebar` + `SidebarTrigger` + `Breadcrumb` + `ThemeModeToggle` + `Sheet` (mobile, bawaan Sidebar); tanpa animasi GSAP (DESIGN §7). Nav learner: Dashboard + Kurikulum (Catatan menyusul T13); breadcrumb Indonesia (segmen `/learn` disembunyikan, "Fase N" dari slug); skip link "Lompat ke konten" + `<main id="main-content">`; sidebar default TERBUKA saat pertama kali (beda dari admin yang default tertutup — keputusan sadar, nav adalah peta kurikulumnya). Placeholder dashboard diubah `<main>` → `<div>` (shell yang menyediakan `<main>`). Kontras dihitung dari nilai oklch (`~/workspace/scratch/t6-shots/contrast.mjs`, rumus WCAG diperbaiki — versi pertama double-decode gamma): semua pasangan teks LULUS — terang terendah 5,15:1 (muted), gelap terendah 7,21:1 (destructive); sinyal/latar 5,12:1 terang, 8,64:1 gelap. Satu-satunya pasangan di bawah 3:1 adalah garis pemisah `--border` vs latar (1,27:1 terang / 1,41:1 gelap) — dekoratif di shell ini, tapi `--input` memakai nilai yang sama → masuk Backlog temuan untuk task input pertama. Verifikasi: tsc bersih, lint bersih (file disentuh), 56/56 unit test; screenshot Playwright Chromium lokal (`~/workspace/scratch/t6-shots/*.png`: desktop + 375px, terang + gelap, + Sheet mobile terbuka) tanpa console error — cloud browser tetap tidak bisa menjangkau localhost (T4), jadi screenshot memakai Playwright lokal. Catatan: tunnel `pg-tunnel.py` sempat mati saat verifikasi (cek `pgrep -f` memberi false positive karena match shell sendiri) — direstart; cek tunnel lewat port, bukan pgrep. `/curriculum` masih 404 sampai T8; breadcrumb judul materi memakai slug yang dirapikan sampai T7 menyediakan judul asli.

### T7. Lesson viewer

**Rujukan:** `front-end-flow.md` (Komposisi lesson page, MarkdownRenderer), `DESIGN.md` bagian 3 dan 4
- [x] Route `/learn/[phase]/[lesson]` + `loading.tsx`, `error.tsx`, `notFound`
- [x] `MarkdownRenderer` sesuai spesifikasi (plugin sesuai keputusan T3)
- [x] `CodeBlock` dengan tombol salin
- [x] `LessonHeader`, `LessonToc`, `AttributionFooter`, prev/next (tanpa progress dulu)

**Acceptance:** lima lesson acak dari berbagai fase tampil benar; tidak ada raw HTML dirender; link internal berfungsi; tidak ada scroll horizontal pada body di 375px.
**Verifikasi:** buka lesson dari Fase 0, 3, 8, 10, 13; lampirkan tangkap layar.

**Selesai 19 Nov 2026.** Route `/learn/[phase]/[lesson]` (RSC, `caller.lesson.get`; NOT_FOUND → `not-found.tsx` + tombol kembali ke daftar fase; `error.tsx` + `loading.tsx` skeleton). MarkdownRenderer: react-markdown + remark-gfm + remark-math + rehype-katex (KaTeX CSS di root layout) + rehype-slug + autolink headings + highlight Shiki server-side; tanpa raw HTML; link internal next/link, eksternal target _blank; tabel dibungkus overflow-x-auto; gambar lazy. CodeBlock (client): label bahasa + tombol Salin (baca textContent dari DOM). Mermaid 213 lesson (395 blok) dirender client-side lazy (MermaidBlock, ikut tema, fallback kode bila gagal). Pagar ```math (413 blok) diubah jadi $$...$$ di `preprocessMarkdown` (lib, unit test). Pagar ```figure (553 blok) jadi placeholder netral — figure upstream dirender JS mereka sendiri (site/figures-*.js), bukan file gambar, jadi tidak bisa ditampilkan tanpa porting (lihat Backlog). LessonHeader (judul, motto, badge Konsep/Praktik, bahasa, estimasi, prasyarat), LessonToc (item dari server via `extractHeadings`, aktif via IntersectionObserver), SyllabusSidebar (lesson.syllabus via React Query + prefetch, Sheet mobile "Daftar materi"), LessonFooterNav prev/next, AttributionFooter (repo + MIT + tautan sumber asli pada SHA pin 8afa245), LessonVisitTracker (progress.visit sekali saat mount). Sidebar default terbuka dst. tetap dari T6. **Penyimpangan dari front-end-flow.md (tercatat):** `@shikijs/rehype` TIDAK bisa dipakai — transformer-nya async, ReactMarkdown menjalankan plugin rehype sinkron (terverifikasi gagal `runSync finished async`); diganti `shiki` core langsung + plugin sync sendiri (`lib/shiki.ts`, unit test). `lesson.get` mengembalikan tambahan `sourcePath` (untuk AttributionFooter) dan `phase.number` (header sempat menampilkan nomor lesson sebagai nomor fase — diperbaiki). `lesson.syllabus` mengembalikan tambahan `number` (label sidebar). Verifikasi: tsc bersih, lint bersih (file disentuh), 39/39 unit test; screenshot Playwright Chromium lokal 5 lesson (Fase 0/3/8/10/13) desktop gelap + terang + mobile 375px, tanpa console error (kecuali 1 gambar f8 yang 404 — lihat Backlog). Scroll horizontal body di 375px: awalnya 57px (KaTeX display + URL panjang di daftar bacaan) → diperbaiki (`.katex-display` overflow-x auto di globals.css + `break-words` di artikel) → 0px terverifikasi. Font Google (Geist/Source Serif 4) tidak bisa diunduh di sandbox (TLS egress) — screenshot memakai fallback; di Vercel font akan termuat normal.

### T8. Progress UX

**Rujukan:** PRD FR-007 sampai FR-010, `front-end-flow.md` (MarkCompleteButton)
- [x] `ProgressMark` (tiga status, ARIA)
- [x] `LessonVisitTracker` (sekali per mount per `lessonId`)
- [x] `MarkCompleteButton` dengan optimistic update dan rollback
- [x] `SyllabusSidebar` (Sheet di mobile)
- [x] Footer nav: Selesai dan lanjut, Batalkan selesai, Sebelumnya, Berikutnya

**Acceptance:** US-05 dan US-06 terpenuhi. Klik ganda cepat tidak membuat error. Simulasi kegagalan jaringan memicu rollback dan toast.
**Verifikasi:** demo manual: selesaikan 3 materi, refresh, login dari browser lain, status sama.

**Selesai 19 Nov 2026.** `ProgressMark` (○ Grafit belum, ◐ setengah Sinyal sedang — SVG inline, ● penuh Sinyal + centang selesai; `role="img"` + aria-label per status, DESIGN.md §5). `SyllabusSidebar` menampilkan "X dari Y selesai" + bar `Progress` shadcn (Radix, role progressbar) + penanda di tiap baris (desktop dan Sheet mobile). `MarkCompleteButton` (client): optimistic update — batalkan query terkait, snapshot, set COMPLETED di cache `lesson.syllabus` + hitungan `catalog.phases` + status `catalog.phase`; gagal → kembalikan snapshot + toast "Gagal menyimpan. Coba lagi."; sukses → toast "Ditandai selesai" lalu `router.push` ke materi berikutnya (atau ajakan "Kembali ke dashboard" kalau ini materi terakhir kurikulum); `onSettled` invalidate `catalog.phases`, `catalog.phase`, `lesson.syllabus`, `progress.overview`, `progress.continue` (backend_flow.md). Tombol `disabled` saat pending (klik ganda tidak mengirim dua kali; server idempotent). Sudah selesai → "Batalkan selesai" (varian sekunder, optimistic ke IN_PROGRESS, toast "Tanda selesai dibatalkan") + tombol "Berikutnya" terpisah. `LessonVisitTracker` dari T7 tidak berubah (sekali per mount per lessonId; `visit` hanya invalidate `progress.continue` sesuai backend_flow — penanda ◐ materi yang sedang dibaca baru terlihat setelah navigasi, karena silabus di-prefetch server sebelum visit). `summarizeLessonStatuses` murni di `lib/progress.ts` + 4 unit test. `getLesson` mengembalikan `status` di level atas (bukan di dalam `lesson`) — halaman destructure terpisah. Verifikasi: tsc bersih, lint bersih (file disentuh), 43/43 unit + 12/12 integrasi; demo Playwright 28/28 cek lulus (3 materi selesai → hitungan 3 dari 13, refresh tetap, konteks browser kedua status sama, `dblclick` pindah sekali tanpa error, gagal server 500 → toast + rollback tombol/sidebar/hitungan, batalkan selesai → ◐ + hitungan turun, materi terakhir kurikulum → ajakan dashboard + tetap di halaman). Catatan: simulasi gagal dengan `route.abort()` TIDAK deterministik — request sempat sampai ke server dan ter-commit sebelum abort, jadi rollback cache lalu refetch justru menampilkan COMPLETED (perilaku benar: client tidak bisa tahu server sudah commit atau belum); demo final memakai `route.fulfill` 500.

### T9. Dashboard, kurikulum, halaman fase

**Rujukan:** `DESIGN.md` bagian 4 dan 5; PRD FR-004, FR-005, FR-008, FR-009, FR-011
- [x] `/dashboard`: `ContinueCard`, progress total, daftar fase, 5 aktivitas terakhir
- [x] `/curriculum` dan `/curriculum/[phase]` dengan `PhaseRow` dan `LessonRow`
- [x] State loading, kosong, error sesuai tabel

**Acceptance:** US-04 terpenuhi; persen sesuai `computePhaseProgress`; learner baru melihat ajakan mulai.
**Verifikasi:** dua akun berbeda memiliki progress berbeda dan tidak saling terlihat.

**Selesai 20 Nov 2026.** `ContinueCard` (satu-satunya kartu dashboard): "Lanjutkan belajar" + fase & judul materi + "Terakhir dibuka {formatLastViewed}" (reason resume) / "Materi berikutnya yang belum selesai" (reason next) / learner baru → "Mulai dari Fase 0" + "Mulai belajar"; semua selesai → ajakan "Lihat kurikulum". `TotalProgress` ("X dari 542 selesai" + bar + persen) dan `RecentActivity` (5 aktivitas, penanda + judul + waktu relatif) dari `progress.overview`; `PhaseList` + `PhaseRow` (penanda fase dari `derivePhaseStatus` — ● semua, ◐ sebagian, ○ belum — nomor, judul, "8 / 13", bar; tagline opsional di /curriculum) dari `catalog.phases`; `PhaseDetail` + `LessonRow` (status, nomor, judul, badge Konsep/Praktik — Praktik garis Sinyal — bahasa, estimasi menit; baris, bukan kartu) dari `catalog.phase`. Server: `getContinue` kini mengembalikan `lastViewedAt` (entri riwayat aktif terbaru) + nomor/judul fase di ringkasan materi; `getPhase` menambah `languages` di select. Lib baru: `formatLastViewed` ("Hari ini 14.20" / "Kemarin 14.20" / "12 Nov 2026 14.20") + `derivePhaseStatus`, masing-masing 4 unit test. Halaman: dashboard (prefetch continue + overview + phases; sapaan "Halo, {nama depan}." dari session), /curriculum (jumlah materi/fase dihitung dari data, bukan hardcode), /curriculum/[phase] (cek NOT_FOUND via caller → not-found.tsx "Fase tidak ditemukan"). Peta kurikulum di dashboard (wireframe DESIGN.md) TIDAK dibangun — itu T10. Verifikasi: tsc bersih, lint bersih (file disentuh), 51/51 unit + 12/12 integrasi; demo Playwright 25/28 langsung + 3 cek ulang lulus semua (Andi 3 materi → dashboard 3 dari 542 + Fase 0 3/13 + lanjut ke APIs & Keys; Budi baru → "Mulai dari Fase 0" + 0 dari 542 + "Belum ada aktivitas." + Fase 0 0/13 = isolasi; /curriculum 20 baris; Fase 3 13 baris; mobile 375 tanpa scroll horizontal; tanpa console/page error). Catatan demo: Fase 3 memang 13/13 Praktik (bukan bug — tidak ada Konsep di fase itu); halaman not-found fase ter-compile lambat di dev sehingga cek pertama kelewat waktu, isi halaman benar (curl: "Fase tidak ditemukan" + status 200, sama seperti temuan notFound T7).

### T10. Landing final dan peta kurikulum

**Rujukan:** `DESIGN.md` bagian 4 (Landing), bagian 5 (Peta), bagian 7 (Gerak)
- [x] `lib/phase-graph-layout.ts` (fungsi murni) + test: kedalaman lapisan sesuai `phase-graph.json` (mis. Fase 3 di kedalaman 3, Fase 19 di kedalaman 12)
- [x] `PhaseMap` SVG, versi statis untuk landing; fallback daftar di `< md`
- [x] Landing penuh: hero + peta, daftar fase (dari `landing.outline`), cara kerja, atribusi
- [x] Satu animasi masuk peta; `prefers-reduced-motion` dihormati

**Acceptance:** FR-001, FR-013, FR-016. HTML landing tidak memuat `contentMd` atau judul materi.
**Verifikasi:** `curl` halaman `/` dan cari judul materi sebagai kata kunci: tidak ada. Uji `prefers-reduced-motion`.

**Selesai 20 Nov 2026.** `layoutPhaseGraph` (Kahn + jalur terpanjang; throw bila ada siklus) — graf asli: 20 simpul, 13 lapisan, lebar lapisan [1,1,1,1,4,1,2,2,1,1,2,2,1], Fase 3 kedalaman 3, Fase 19 kedalaman 12; 4 unit test. `PhaseMap` (SVG biasa, tanpa library graf): sumbu X kedalaman, Y urutan dalam lapisan; simpul ○/◐/● sesuai status + nomor di bawahnya; sisi ke simpul selesai memakai Sinyal; di landing statis (semua ○) + animasi masuk CSS (delay 80 ms × kedalaman, total ≤ 1,2 detik) dan `prefers-reduced-motion: reduce` → langsung tampil penuh; `< md` diganti daftar vertikal (alternatif teks setara). `DashboardPhaseMap` (client, dari catalog.phases): simpul berstatus + link ke /curriculum/[phase], tanpa animasi masuk — janji T9 ditepati. Landing: header (Masuk/Daftar atau Ke dashboard), hero "Pelajari AI engineering dari dasar, sampai agent." + "{N} materi dalam {M} fase" dari landing.outline, peta, "Isi kurikulum" 20 fase, "Cara kerja" 3 langkah, footer atribusi (repo + Lisensi MIT + THIRD_PARTY_NOTICES.md). Verifikasi: tsc bersih, lint bersih (file disentuh), 55/55 unit + 12/12 integrasi; curl `/` 200 — judul materi ("Backpropagation from Scratch", "The Perceptron", "Dev Environment") dan "contentMd" TIDAK ada di HTML; demo Playwright lulus (landing 20 simpul + 21 sisi + 20 baris fase, animasi selesai opacity 1, reduced-motion langsung opacity 1, mobile 375 SVG sembunyi + daftar tampil tanpa scroll horizontal, dashboard: Fase 0 selesai → simpul ● terisi, klik simpul Fase 3 → halaman fase; tanpa console/page error). Catatan demo: dua cek pertama gagal karena artefak skrip (cek footer di dalam `<main>` padahal footer di luar main; loop klik 13 materi berhenti dini karena compile dev lambat) — keduanya dikonfirmasi benar lewat cek ulang.

---

## Fase 3: Kualitas dan rilis

### T11. E2E

- [x] Playwright: (1) anonim ke `/learn/...` → login → kembali ke materi tujuan, (2) register → buka materi → selesai → refresh → status tetap, (3) dashboard "Lanjutkan belajar" menuju materi benar
- [x] CI sederhana (opsional): typecheck, lint, test

**Acceptance:** ketiga alur lulus berulang (tidak flaky) 3 kali berturut-turut.

**Selesai 20 Nov 2026 (commit `acfbb45` + `15c1c9a`).** `@playwright/test@1.65.1` (dev, sudah disetujui front-end-flow.md) + `playwright.config.ts` (webServer menyalakan dev server bila belum jalan, `reuseExistingServer: true`) + `e2e/flows.spec.ts` (3 alur) + `e2e/helpers.ts` (register/login lewat UI, email unik per run, akun uji dihapus di afterAll via Prisma — DB kembali 0 user / 0 progress) + script `npm run test:e2e`. CI `.github/workflows/ci.yml` (typecheck, lint jalur bersih, unit test lib; E2E TIDAK di CI karena butuh DATABASE_URL Neon + tunnel) — **file workflow MASIH BELUM ter-push (per 20 Nov 23:04 WIB)**: GitHub menolak 403 di dua jalur API (Git Data + Contents) meski token sudah di-reconnect dan izin Actions: write sudah diedit/diklaim tersimpan — token yang tersimpan di Muse terbukti belum punya Actions: write (blob/Contents biasa berhasil, hanya file workflow yang ditolak). Opsi: Candra buat file-nya manual lewat web UI github.com (isi file ada di repo lokal), atau perbaiki token yang tersimpan sampai Actions: write benar-benar aktif lalu kabari untuk push ulang. Verifikasi: tsc bersih, lint bersih (scope CI), 67/67 vitest (55 unit + 12 integrasi); E2E 3/3 lulus 3× berturut-turut pada kode final (tiap run ±2,4 mnt). Jalan menuju hijau: (1) browser 1.65.1 belum ter-cache (`npx playwright install chromium` berhasil dari CDN); (2) `getByLabel("Password")` ambigu dengan tombol "Show password" → `{ exact: true }`; (3) alur 1 sempat gagal sekali saat dev server masih dingin (compile rute materi > 30 detik) → timeout navigasi pasca-login dinaikkan ke 60 detik + catatan di kode.

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
- T6 (19 Nov 2026): `--border`/`--input` (oklch 0,9 terang / 0,3 gelap) hanya 1,27:1 (terang) / 1,41:1 (gelap) terhadap latar — di bawah 3:1 WCAG 1.4.11 untuk batas komponen. Sebagai garis pemisah dekoratif di shell ini tidak masalah (nilai DESIGN dipertahankan), TAPI task pertama yang mengirim input learner (T13 catatan / T14 pencarian) harus mengatasi: pisahkan `--input` lebih kuat atau beri latar isi pada input.
- T7 (19 Nov 2026): pagar ```figure (553 blok) hanya jadi placeholder netral — figure upstream dirender kode JS mereka sendiri (`site/figures-*.js`, terdaftar via `LF.register`), bukan file gambar. Keputusan: porting sistem figure upstream, ganti dengan diagram statis/Mermaid, atau biarkan placeholder.
- T7 (19 Nov 2026): tautan gambar relatif per-lesson ditulis ulang ke level fase sehingga 404 — contoh `phases/08-generative-ai/assets/ddpm.svg` (seharusnya `phases/08-generative-ai/06-diffusion-ddpm-from-scratch/assets/ddpm.svg`; berkasnya ada di repo). Perlu audit: berapa banyak URL gambar di konten yang 404, lalu perbaiki rewrite di ingest (bukan di renderer).
- T7 (19 Nov 2026): judul lesson, motto, dan prasyarat masih Bahasa Inggris di DB — T3 hanya menerjemahkan `contentMd`. Keputusan: terjemahkan metadata ini juga, atau biarkan judul/motto Inggris (istilah teknis).
- T7 (19 Nov 2026): `notFound()` di halaman lesson mengembalikan status HTTP **200** — TERKONFIRMASI juga di production build (`next start`, 19 Nov 2026), padahal rute tak dikenal biasa mengembalikan 404 dan isi halaman tidak-ditemukan tampil benar ("Materi tidak ditemukan" + tombol kembali). Penyebab: `loading.tsx` membuat shell ter-streaming dengan status 200 sebelum komponen halaman memanggil `notFound()`. Dampak praktis kecil: area belajar `noindex` + `robots.txt` disallow (T4). Perbaikan (mis. pindah cek ke luar komponen halaman) ditunda ke task berikutnya bila perlu.
- T8 (19 Nov 2026): peringatan hydration React muncul SEKALI selama demo (tidak bisa direproduksi di muat ulang bersih /dashboard maupun lesson): "A tree hydrated but some attributes of the server rendered HTML didn't match" — selisih `id` Radix di menu dropdown avatar sidebar (`SidebarMenuButton` + `DropdownMenuTrigger`, komponen shell T6). Dugaan: `useCurrentUser` selesai di tengah hydration sehingga jumlah komponen ber-`useId` berubah. Tidak ada dampak fungsional; selidiki bila muncul lagi (bukan blocker T8).
