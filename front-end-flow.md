# front-end-flow.md

Rute, layout, pola data, dan komposisi komponen. Visual (warna, tipografi, wireframe) ada di `DESIGN.md`.

## Peta rute

| Route | Group | Akses | Render | Data |
| --- | --- | --- | --- | --- |
| `/` | `(public)` | Publik | Server | `landing.outline` (publik, allowlist). User login melihat tombol "Ke dashboard". |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | `(auth)` | Publik; redirect ke `/dashboard` jika sudah login | Server + form client | Bawaan starter |
| `/dashboard` | `(learn)` | Login | Server prefetch + client | `progress.overview`, `progress.continue`, `catalog.phases` |
| `/curriculum` | `(learn)` | Login | Server prefetch + client | `catalog.phases` |
| `/curriculum/[phase]` | `(learn)` | Login | Server prefetch + client | `catalog.phase` |
| `/learn/[phase]/[lesson]` | `(learn)` | Login | Server | `lesson.get`, `lesson.syllabus` |
| `/notes`, `/settings/profile` | `(learn)` | Login | - | Should (T13, T17) |
| `/admin/**` | `(admin)` | Role admin | Bawaan starter | `/admin/content` (T16) |

Perubahan pada bawaan starter:

- `app/(public)/page.tsx`: ganti redirect ke `/login` dengan landing page.
- `components/custom/login-account-info.tsx`: hapus pemakaiannya di halaman login (info akun demo).
- Nav bawaan (Inbox, Workspaces, Tracker, dll): diganti config nav learner (T6). Config RBAC di `modules/admin/ui/config/` dipelajari dulu, bukan ditulis ulang.

## Pohon layout

```
app/layout.tsx                      providers (theme, tRPC, toaster), font
├─ (public)/page.tsx                landing
├─ (auth)/layout.tsx                redirect ke /dashboard jika sudah login
├─ (learn)/layout.tsx               ← GUARD server: getSession(); tanpa session → redirect login + callbackURL
│   └─ Shell                        sidebar, header, breadcrumb, command palette
│       ├─ dashboard/page.tsx
│       ├─ curriculum/page.tsx
│       ├─ curriculum/[phase]/page.tsx
│       └─ learn/[phase]/[lesson]/page.tsx
└─ (admin)/layout.tsx               bawaan
```

`(learn)/layout.tsx` mengekspor metadata `robots: { index: false, follow: false }`.
`app/robots.ts` men-disallow `/dashboard`, `/curriculum`, `/learn`, `/admin`.

## Guard dan callbackURL

1. `proxy.ts`: untuk path `/dashboard`, `/curriculum`, `/learn`, `/notes`, `/settings` cek keberadaan cookie session (helper `getSessionCookie` dari Better Auth). Jika tidak ada → redirect `/login?callbackURL=<path+query>`. Ini hanya jalur cepat. **Bukan** pengaman utama.
2. `(learn)/layout.tsx`: `getSession()` server. Tidak valid → redirect dengan `callbackURL` yang sama.
3. Form login membaca `callbackURL` dari search params dan melewatkannya ke `getSafeCallbackUrl()`.

```ts
// lib/safe-redirect.ts (pure, wajib unit test)
export function getSafeCallbackUrl(raw: string | null | undefined, fallback = "/dashboard"): string
```

Kasus uji minimal:

| Input | Hasil |
| --- | --- |
| `/learn/a/b` | `/learn/a/b` |
| `/learn/a/b?x=1#h` | dipertahankan |
| `null`, `""`, `undefined` | `/dashboard` |
| `https://evil.com` | `/dashboard` |
| `//evil.com` | `/dashboard` |
| `/\evil.com` | `/dashboard` |
| `javascript:alert(1)` | `/dashboard` |
| `%2F%2Fevil.com` (setelah decode) | `/dashboard` |
| `/login` atau `/register` | `/dashboard` (hindari loop) |

## Pola data

- **Halaman daftar** (dashboard, curriculum, phase): `prefetch(trpc.x.queryOptions())` di Server Component, bungkus `<HydrateClient>`, client memakai `useSuspenseQuery`. Sediakan `loading.tsx` dengan skeleton.
- **Lesson page**: Server Component memanggil `lesson.get` di server untuk merender markdown (tidak dikirim ulang ke klien sebagai data query). Interaksi (tombol selesai, sidebar, TOC) berada di Client Component terpisah yang mengambil `lesson.syllabus` lewat React Query.
- **State server** = React Query. **Tidak ada** `localStorage` untuk progress. State UI lokal (sidebar terbuka/tertutup) memakai mekanisme cookie bawaan sidebar shadcn.

## Komposisi lesson page

```
LessonPage (RSC)
├─ LessonHeader (RSC)          judul, motto, atribut (jenis, bahasa, estimasi), prasyarat
├─ MarkdownRenderer (RSC)      lihat spesifikasi di bawah
├─ LessonVisitTracker (client) panggil progress.visit sekali saat mount (useEffect, per lessonId)
├─ LessonToc (client)          dari heading h2/h3, IntersectionObserver untuk heading aktif; disembunyikan < xl
├─ SyllabusSidebar (client)    fase aktif; Sheet di < lg
├─ LessonFooterNav (client)    prev, MarkCompleteButton, next
└─ AttributionFooter (RSC)     link repo upstream + lisensi MIT
```

`LessonVisitTracker` adalah client mutation. **Jangan** menulis data di dalam render Server Component.

### MarkCompleteButton (optimistic)

1. `onMutate`: batalkan query terkait, simpan snapshot, set status materi `COMPLETED` di cache `lesson.syllabus` dan `catalog.phases`, perbarui persen.
2. `onError`: kembalikan snapshot, toast "Gagal menyimpan. Coba lagi."
3. `onSuccess`: toast "Ditandai selesai", lalu `router.push` ke materi berikutnya jika ada; jika tidak ada, tetap di halaman dan tampilkan ajakan kembali ke dashboard.
4. `onSettled`: invalidate sesuai `backend_flow.md`.
5. Tombol `disabled` selama `isPending`. Jika materi sudah selesai, tombol berubah menjadi "Batalkan selesai" (varian sekunder) dan tombol "Berikutnya" terpisah.

## Spesifikasi MarkdownRenderer

Dependency yang disetujui: `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `@shikijs/rehype` (atau `rehype-pretty-code`).
Opsional setelah verifikasi T3: `remark-math` + `rehype-katex` (jika ada LaTeX), `mermaid` (client, lazy import, jika ada diagram).

| Elemen | Perilaku |
| --- | --- |
| Raw HTML | Tidak dirender. |
| Heading | Punya `id` (slug) dan anchor. Hanya `h2`/`h3` masuk TOC. |
| Code block | Highlight server-side, tombol salin, label bahasa, scroll horizontal. Tema mengikuti mode terang/gelap. |
| Inline code | Font mono, latar `muted`. |
| Tabel | Dibungkus container `overflow-x-auto`. |
| Link internal (`/learn/...`) | `next/link`. |
| Link eksternal | `target="_blank" rel="noopener noreferrer"`. |
| Gambar | `loading="lazy"`, `max-width: 100%`, wajib punya `alt` (fallback string kosong dekoratif). Sumber `raw.githubusercontent.com` pada SHA ter-pin. |
| Blockquote | Gaya callout netral. |
| ASCII diagram | Ada dalam code block: jangan di-wrap, scroll horizontal. |

## State UI wajib per halaman

| Halaman | Loading | Kosong | Error |
| --- | --- | --- | --- |
| Dashboard | Skeleton kartu + baris | Learner baru: ajakan "Mulai dari Fase 0" | Pesan + tombol "Coba lagi" |
| Curriculum | Skeleton 8 baris | Katalog kosong: "Konten belum disinkronkan" (arahkan owner ke `content:sync`) | Pesan + "Coba lagi" |
| Phase | Skeleton daftar | Fase tanpa materi aktif | Pesan + "Coba lagi" |
| Lesson | Skeleton judul + paragraf | `notFound()` | `error.tsx` dengan tombol "Coba lagi" dan link ke fase |

Tulis pesan error dengan menyebut apa yang terjadi dan langkah berikutnya, tanpa kata maaf berlebihan (lihat `DESIGN.md`).

## Pintasan keyboard

| Pintasan | Aksi |
| --- | --- |
| `Cmd/Ctrl + K` | Buka command palette (T14) |
| Tab | Urutan fokus: skip link → header → sidebar → konten → footer nav |

Tidak menambah pintasan lain di MVP.

## Dependency yang disetujui (di luar starter)

`react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `@shikijs/rehype`, `tsx` (dev), `vitest` (dev), `@playwright/test` (dev), `simple-git` atau pemanggilan `git` langsung untuk ingest.
Selain itu: tanya dulu.
