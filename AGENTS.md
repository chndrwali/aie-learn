# AGENTS.md

Aturan kerja untuk AI coding agent (Claude Code, Cursor, Codex, dll).
Untuk Claude Code, buat `CLAUDE.md` berisi satu baris: `@AGENTS.md`.

## Proyek

**AIE Learn** adalah web belajar pribadi bergaya LMS (seperti Dicoding) untuk kurikulum open source
[`rohitg00/ai-engineering-from-scratch`](https://github.com/rohitg00/ai-engineering-from-scratch) (lisensi MIT).
Dibangun di atas [`chndrwali/nextjs-starter-kit`](https://github.com/chndrwali/nextjs-starter-kit).

Tiga hal yang tidak boleh rusak:

1. **Gating.** Pengunjung tanpa login hanya boleh melihat landing page dan halaman auth. Isi materi tidak pernah keluar tanpa session.
2. **Progress.** Status belajar tersimpan di database, per user, dan tidak hilang karena re-sync konten.
3. **Atribusi.** Konten berasal dari repo MIT. Copyright dan lisensi upstream wajib tetap tampil.

## Urutan baca

1. `PRD.md` (apa dan kenapa)
2. `DATABASE.md`, `backend_flow.md`, `front-end-flow.md` (bagaimana)
3. `DESIGN.md` (wajib dibaca sebelum menyentuh UI)
4. `CONTENT-PIPELINE.md` (wajib dibaca sebelum menyentuh script ingest)
5. `TASKS.md`: kerjakan **satu task per sesi**, sesuai urutan.

Jika dokumen saling bertentangan, prioritasnya: `PRD.md` > `DATABASE.md` > `*_flow.md` > `DESIGN.md`.
Jika ada yang ambigu, tanya. Jangan menebak.

## Stack dan konvensi (dari starter kit)

Verifikasi dengan membaca file aslinya sebelum mengubah. Jangan mengandalkan asumsi.

| Area | Aturan |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, React Compiler aktif. Jangan tulis `useMemo`/`useCallback` manual tanpa alasan jelas. |
| Bahasa | TypeScript strict. Tidak ada `any`. |
| Styling | Tailwind v4 + CSS variables di `app/globals.css`. Token mengikuti `DESIGN.md`. |
| UI | shadcn/ui (New York) di `components/ui`. Tambah via `npx shadcn@latest add <nama>`. Jangan edit file di `components/ui` kecuali terpaksa. |
| Auth | Better Auth (`lib/auth.ts`, `lib/auth-client.ts`). Session server: `hooks/get-session.ts`. |
| DB | Prisma 7 + PrismaPg adapter. Client hasil generate ada di `app/generated/prisma` (git-ignored). Gunakan singleton `lib/prisma.ts`. |
| API | tRPC v11. Router di `trpc/routers/`, didaftarkan di `trpc/routers/_app.ts`. Procedure: `baseProcedure`, `protectedProcedure`, `adminProcedure` (`trpc/init.ts`). Session ada di `ctx.auth`. |
| Data fetching | Server prefetch (`prefetch`, `HydrateClient` dari `trpc/server.tsx`) + client `useQuery`/`useSuspenseQuery` via `useTRPC()`. |
| Validasi | Zod, import dari `"zod/v4"` seperti contoh di starter. |
| Struktur fitur | `modules/<fitur>/ui/{components,config,layout,form}`. Logika non-UI baru: `modules/learning/{server,lib}`. |
| Route group | `(public)`, `(auth)`, `(admin)` sudah ada. Tambah `(learn)` untuk area belajar. |
| Env | Semua env lewat `lib/config-env.ts` dan `.env.example`. |

Jika ragu soal API versi terbaru (Next 16, Prisma 7, Better Auth, tRPC 11), baca dokumentasi resmi atau contoh di starter. Jangan mengandalkan memori.

## Aturan keamanan (tidak boleh dilanggar)

1. Semua procedure yang mengembalikan isi materi, progress, atau catatan adalah `protectedProcedure`. Satu-satunya `baseProcedure` baru adalah `landing.outline`, dan outputnya allowlist (lihat `backend_flow.md`).
2. `userId` selalu diambil dari `ctx.auth.user.id`. Tidak pernah dari input client.
3. Guard berlapis: `proxy.ts` (cek cookie, hanya untuk UX) + `app/(learn)/layout.tsx` (validasi session di server) + `protectedProcedure`. `proxy.ts` saja tidak cukup.
4. `callbackURL` hanya boleh path relatif: diawali `/`, bukan `//`, bukan `/\`. Selain itu fallback ke `/dashboard`. Fungsi ini wajib punya unit test.
5. Render markdown tanpa raw HTML. Jika suatu saat perlu `rehype-raw`, wajib dipasangkan dengan `rehype-sanitize`.
6. Link eksternal dari konten: `target="_blank" rel="noopener noreferrer"`.
7. Jangan commit `.env`. Variabel baru masuk `.env.example` dan `lib/config-env.ts`.
8. Jangan log password, token, atau cookie.

## Aturan kode

- **Baca sebelum menulis.** Extend file yang ada, jangan rewrite. Khusus `proxy.ts`, `lib/auth.ts`, `trpc/init.ts`, dan `modules/admin/ui/layout/*`: baca penuh dulu.
- Server Component secara default. `"use client"` hanya untuk komponen interaktif.
- Router tRPC tipis: validasi input, cek otorisasi, panggil fungsi di `modules/learning/server/*`.
- Logika murni (hitung progress, parse metadata, rewrite link, sanitasi redirect) ditulis sebagai pure function di `modules/learning/lib/*` dan **wajib punya unit test**.
- Mutation harus idempotent. Klik dua kali tidak boleh membuat data ganda atau error.
- Hindari N+1. Agregasi progress dengan satu atau dua query, bukan loop per lesson.
- Progress disimpan di database. **Jangan** pakai `localStorage` untuk progress.
- Semua teks UI berbahasa Indonesia (istilah teknis boleh English). Kosakata ikut tabel di `DESIGN.md`.
- Jangan menambah dependency besar tanpa bertanya dulu. Dependency yang sudah disetujui ada di `front-end-flow.md`.
- Jangan membangun fitur di daftar "Won't have" (`PRD.md` bagian 3).
- Jangan mengubah model auth di `schema.prisma`. Penambahan relasi balik pada `User` boleh.

## Definisi selesai (per task)

- [ ] Acceptance criteria di `TASKS.md` terpenuhi
- [ ] `npx tsc --noEmit` bersih
- [ ] Lint bersih (cek nama script di `package.json`)
- [ ] Unit test untuk logika murni yang disentuh lulus
- [ ] Dicek manual di browser: desktop dan lebar 375px, tanpa error di console
- [ ] Tidak ada TODO tanpa nomor task
- [ ] Commit dengan format conventional commits, contoh `feat(progress): tandai materi selesai`

## Cara kerja per sesi

1. Baca `AGENTS.md` dan `PRD.md`, lalu bagian task yang dimaksud.
2. Tulis rencana singkat: file yang akan disentuh dan hal yang masih ambigu. Tunggu konfirmasi jika ada pertanyaan.
3. Implementasi hanya yang ada di task. Temuan di luar scope dicatat di `TASKS.md` bagian "Backlog temuan", tidak dikerjakan.
4. Jalankan verifikasi di task, lalu laporkan hasilnya apa adanya, termasuk yang gagal.
