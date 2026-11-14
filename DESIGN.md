# DESIGN.md

Panduan visual untuk AIE Learn. Wajib dibaca sebelum menyentuh UI. Implementasi memakai shadcn/ui (New York) + Tailwind v4 dari starter.

## 1. Subjek dan tugas desain

- **Subjek**: kurikulum AI engineering, 20 fase, 500+ materi, dari aljabar linear sampai agent.
- **Pengguna**: developer yang belajar mandiri dan kembali berkali-kali selama berbulan-bulan.
- **Tugas utama**: membuat kurikulum sebesar itu terasa terpetakan. Pengguna harus selalu tahu (a) sedang di mana, (b) sudah sejauh mana, (c) lanjut ke mana. Membaca materi panjang harus nyaman.

## 2. Arah desain: "buku teks teknis dengan peta"

Antarmuka tenang dan berorientasi membaca. **Satu elemen yang berani: peta kurikulum**, yaitu graf 20 fase sesuai ketergantungan aslinya, yang terisi seiring progres. Selain peta, semuanya sengaja diam.

Keputusan dan alasannya (hasil review terhadap pola desain generik):

| Dihindari | Diganti dengan | Alasan |
| --- | --- | --- |
| Latar hitam + satu aksen neon | Netral hijau-kelabu bernuansa dingin, aksen teal yang redam; mode terang dan gelap sama pentingnya | Aksen neon di atas hitam adalah default generik. Starter memang dark by default, tetapi tidak harus neon. |
| Deretan kartu identik berbayang | Baris berdaftar dengan garis pemisah; kartu hanya untuk satu hal: "Lanjutkan belajar" | Hierarki jelas. Kartu berarti "ini yang paling penting sekarang". |
| Label kecil huruf kapital dan font mono di mana-mana | Sentence case. Mono hanya untuk kode, path, dan nama file | Label kapital dan mono kecil adalah tanda desain template. |
| Satu kata di headline diberi warna | Headline polos | Dekorasi tanpa informasi. |
| Animasi masuk di setiap kartu | Satu momen animasi di landing; di dalam aplikasi hanya gerak sebagai respons aksi | Gerak yang tidak diminta menarik perhatian dari membaca. |
| Penomoran dekoratif | Penomoran hanya pada fase dan materi | Keduanya memang urutan. |

## 3. Token

### Palet inti (hex perkiraan; nilai kerja ada di CSS variables)

| Nama | Terang | Gelap | Peran |
| --- | --- | --- | --- |
| Kertas | `#F6F8F8` | `#0E1514` | Latar halaman |
| Permukaan | `#FFFFFF` | `#141D1C` | Panel, popover, kartu Lanjutkan |
| Tinta | `#14201F` | `#E6EEEC` | Teks utama |
| Grafit | `#5B6B69` | `#93A6A3` | Teks sekunder |
| Garis | `#D5DEDC` | `#243130` | Border, pemisah |
| Sinyal | `#0F766E` | `#4DB6AC` | Aksi utama, progres, fokus |
| Galat | `#B3261E` | `#F2837B` | Error dan aksi destruktif saja |

Hanya satu aksen (Sinyal). Status progres dibedakan lewat **bentuk** (lihat bagian 5), bukan lewat tambahan warna.

### `app/globals.css` (titik awal, setel halus lewat tweakcn)

```css
:root {
  --radius: 0.375rem;
  --background: oklch(0.98 0.004 195);
  --foreground: oklch(0.24 0.02 190);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.24 0.02 190);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.24 0.02 190);
  --primary: oklch(0.51 0.096 186);
  --primary-foreground: oklch(0.99 0.003 195);
  --secondary: oklch(0.955 0.006 195);
  --secondary-foreground: oklch(0.24 0.02 190);
  --muted: oklch(0.955 0.006 195);
  --muted-foreground: oklch(0.52 0.02 190);
  --accent: oklch(0.94 0.02 190);
  --accent-foreground: oklch(0.24 0.02 190);
  --destructive: oklch(0.5 0.19 27);
  --border: oklch(0.9 0.01 190);
  --input: oklch(0.9 0.01 190);
  --ring: oklch(0.51 0.096 186);
}

.dark {
  --background: oklch(0.17 0.012 190);
  --foreground: oklch(0.94 0.008 190);
  --card: oklch(0.21 0.014 190);
  --card-foreground: oklch(0.94 0.008 190);
  --popover: oklch(0.21 0.014 190);
  --popover-foreground: oklch(0.94 0.008 190);
  --primary: oklch(0.74 0.1 190);
  --primary-foreground: oklch(0.2 0.02 190);
  --secondary: oklch(0.26 0.014 190);
  --secondary-foreground: oklch(0.94 0.008 190);
  --muted: oklch(0.26 0.014 190);
  --muted-foreground: oklch(0.72 0.02 190);
  --accent: oklch(0.3 0.03 190);
  --accent-foreground: oklch(0.94 0.008 190);
  --destructive: oklch(0.72 0.15 25);
  --border: oklch(0.3 0.015 190);
  --input: oklch(0.3 0.015 190);
  --ring: oklch(0.74 0.1 190);
}
```

Nilai di atas adalah titik awal. **Wajib** diperiksa kontrasnya di devtools (teks ≥ 4,5:1, komponen UI ≥ 3:1) sebelum dianggap final. Tema default tetap mengikuti starter (dark), tetapi mode terang harus setara kualitasnya.

### Tipografi

Dua keluarga yang jelas berbeda:

| Peran | Font | Catatan |
| --- | --- | --- |
| UI (nav, tombol, judul, label) | Geist Sans (bawaan starter) | Judul `font-semibold`, tracking sedikit rapat (`-0.01em`) |
| Isi materi (prosa) | Source Serif 4 (via `next/font/google`) | Teks panjang berserif terasa seperti buku; line-height lebih longgar |
| Kode, path, nama file | Geist Mono (bawaan starter) | |

| Elemen | Ukuran / line-height |
| --- | --- |
| Teks UI | 14px / 1,5 |
| Prosa materi | 18px / 1,7 |
| Kode blok | 14px / 1,6 |
| H1 materi | 36px / 1,15 |
| H2 materi | 26px / 1,25 |
| H3 materi | 20px / 1,35 |
| Judul landing | 48px (desktop) / 34px (mobile), line-height 1,1 |

Lebar baca prosa: maksimal `68ch`. Rata kiri. Tidak ada teks rata kanan-kiri.

### Spasi dan bentuk

- Skala spasi Tailwind default (kelipatan 4px). Ritme vertikal prosa: paragraf `1.1em`, heading atas `2em`.
- Radius sengaja bervariasi sesuai peran: input, tombol, badge `rounded-md`/`rounded-sm`; panel dan Sheet `rounded-lg`; cincin progres bulat penuh. Jangan satu radius untuk semuanya.
- Tanpa bayangan pada panel. Garis (`border`) membawa struktur. Bayangan hanya pada popover dan dialog.

## 4. Layout

Semua wireframe: rata kiri, konten dalam kolom, tidak ada section rata tengah kecuali hero landing.

### Landing (`/`)

```
┌──────────────────────────────────────────────────────────────┐
│ AIE Learn                                  Masuk   [Daftar]  │
├──────────────────────────────────────────────────────────────┤
│ Pelajari AI engineering                                      │
│ dari dasar, sampai agent.                                    │
│ {N} materi dalam {M} fase. Masuk untuk mulai belajar.        │
│ [Daftar gratis]  Sudah punya akun? Masuk                     │
│                                                              │
│  ○──○──○──○──┬──○──○──┬──○──○──○──○──○                      │
│              ├──○     └──○                  ← peta kurikulum │
│              └──○  (SVG, 20 simpul, tampil bertahap sekali) │
├──────────────────────────────────────────────────────────────┤
│ Isi kurikulum  (daftar 20 fase: nomor, judul, jumlah materi) │
├──────────────────────────────────────────────────────────────┤
│ Cara kerja: baca materi, tandai selesai, lanjutkan kapan saja│
├──────────────────────────────────────────────────────────────┤
│ Kurikulum oleh rohitg00 (MIT). Tautan repo dan lisensi.      │
└──────────────────────────────────────────────────────────────┘
```

- Angka `{N}` dan `{M}` berasal dari `landing.outline`, tidak ditulis manual.
- Peta di hero adalah elemen "memorable". Tidak ada gradient wash, mockup palsu, atau statistik besar bergaya template.

### Dashboard (`/dashboard`)

```
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar      │ Halo, {nama}.                                 │
│  Dashboard   │                                               │
│  Kurikulum   │ ┌──────────────────────────────┐  Total       │
│  Catatan     │ │ Lanjutkan belajar            │  41 dari 542 │
│              │ │ Fase 3, Backpropagation...   │  ▓▓░░░░░ 8%  │
│              │ │ Dibuka kemarin 14.20         │              │
│              │ │ [Lanjutkan belajar]          │              │
│              │ └──────────────────────────────┘              │
│              │                                               │
│              │ Peta kurikulum   (simpul sesuai status)       │
│              │                                               │
│              │ Semua fase                                    │
│              │ ◐ 03  Deep Learning Core      8 / 13  ▓▓▓░░   │
│              │ ● 00  Setup & Tooling        13 / 13  ▓▓▓▓▓   │
│              │ ○ 04  Computer Vision         0 / 28  ░░░░░   │
└──────────────┴───────────────────────────────────────────────┘
```

### Halaman fase (`/curriculum/[phase]`)

```
Fase 3  Deep Learning Core                       8 dari 13 selesai
Neural network dari prinsip dasar, tanpa framework...
───────────────────────────────────────────────────────────────
●  01  The Perceptron                  Praktik   Python   40 menit
●  02  Multi-Layer Networks             Praktik   Python   45 menit
◐  03  Backpropagation from Scratch     Praktik   Python   60 menit
○  04  Activation Functions             Praktik   Python   35 menit
```

Baris, bukan kartu. Status di kiri, judul di tengah, atribut di kanan. Atribut dipisahkan jarak, bukan titik tengah.

### Lesson viewer (`/learn/[phase]/[lesson]`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ AIE Learn      Fase 3 / Backpropagation from Scratch          ⌘K  Avatar │
├───────────────┬──────────────────────────────────────────┬───────────────┤
│ Fase 3        │                                          │ Di halaman ini│
│ 8 dari 13     │ Backpropagation from Scratch             │ Masalahnya    │
│               │ Praktik   Python   60 menit              │ Konsepnya     │
│ ●  01 Percep… │ Prasyarat: materi 01 dan 02              │ Build It      │
│ ●  02 Multi-… │                                          │ Use It        │
│ ◐  03 Backpr… │ (isi materi, serif 18px, maks 68ch)      │ Latihan       │
│ ○  04 Activa… │                                          │               │
│ ○  05 Loss …  │ ──────────────────────────────────────── │               │
│               │ ‹ Sebelumnya     [Selesai dan lanjut]    │               │
│ Fase lain     │                                          │               │
└───────────────┴──────────────────────────────────────────┴───────────────┘
```

- Kolom kiri 260px, konten fleksibel (prosa maks 68ch), kolom kanan 200px.
- `< xl`: kolom kanan (TOC) disembunyikan. `< lg`: sidebar menjadi `Sheet` dari tombol "Daftar materi" di header.
- Footer nav menempel di bawah konten, bukan melayang. Di mobile boleh `sticky bottom` dengan padding aman area bawah.

### Mobile (375px)

Satu kolom. Header ringkas (menu, judul materi terpotong, avatar). Tombol "Daftar materi" membuka Sheet. Target sentuh minimal 44px.

## 5. Bahasa visual progres (dipakai di mana-mana)

Satu sistem simbol, konsisten di daftar materi, sidebar, daftar fase, dan peta:

| Status | Bentuk | Catatan |
| --- | --- | --- |
| Belum dimulai | ○ cincin kosong, warna `Grafit` | |
| Sedang dipelajari | ◐ cincin setengah terisi `Sinyal` | Ada baris `IN_PROGRESS` |
| Selesai | ● lingkaran penuh `Sinyal` dengan centang | |

- Warna bukan satu-satunya penanda: bentuk dan ikon berbeda, plus `aria-label` ("Selesai", "Sedang dipelajari", "Belum dimulai").
- Progress bar fase: `role="progressbar"` dengan `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100` dan label teks "8 dari 13 selesai".
- Badge jenis: **Konsep** (Learn) dan **Praktik** (Build). `Praktik` memakai garis `Sinyal`; `Konsep` memakai garis `Garis`. Tanpa warna isi tambahan.

### Peta kurikulum

- Data: `content-meta/phase-graph.json` (simpul = 20 fase, sisi = ketergantungan). Lihat `CONTENT-PIPELINE.md`.
- Tata letak: layered DAG. Sumbu X = kedalaman (jalur terpanjang dari Fase 0), sumbu Y = urutan dalam lapisan. Dihitung sekali dengan fungsi murni (`lib/phase-graph-layout.ts`, ada unit test), digambar sebagai SVG biasa. **Jangan** menambah library graf.
- Simpul memakai simbol status di atas. Sisi: garis tipis `Garis`; sisi menuju simpul selesai memakai `Sinyal`.
- Simpul adalah link (`<a>`) ke `/curriculum/[phase]` (di dalam aplikasi) atau tidak interaktif (di landing).
- `< md`: peta diganti daftar vertikal.
- Landing: peta tampil statis (semua simpul `○`) dengan satu animasi masuk (lihat bagian 7).

## 6. Komponen (pemetaan ke shadcn)

| Kebutuhan | Komponen |
| --- | --- |
| Shell, sidebar | `Sidebar` (yang sudah dipakai `modules/admin`), `Collapsible` per fase |
| Sidebar mobile | `Sheet` |
| Progress bar | `Progress` (bungkus dengan label dan ARIA) |
| Badge jenis | `Badge` varian `outline` |
| Kartu Lanjutkan | `Card` (satu-satunya kartu di dashboard) |
| Command palette | `Command` (cmdk, sudah ada) |
| Toast | Sonner (sudah ada) |
| Loading | `Skeleton` |
| Breadcrumb | `Breadcrumb` (sudah ada `useBreadcrumbs`) |
| Konfirmasi | `AlertDialog` custom bawaan starter |

Komponen baru yang dibuat di `modules/learning/ui/components/`:
`ProgressMark`, `PhaseRow`, `LessonRow`, `MarkCompleteButton`, `SyllabusSidebar`, `LessonToc`, `MarkdownRenderer`, `CodeBlock`, `PhaseMap`, `ContinueCard`.

## 7. Gerak

- **Landing**: satu momen terkoreografi. Peta digambar sekali saat halaman dimuat: simpul muncul berurutan mengikuti jalur ketergantungan, total ≤ 1,2 detik. Tidak ada animasi lain di landing.
- **Dalam aplikasi**: hanya gerak sebagai respons aksi. Centang terisi (150 ms), lebar progress bar (300 ms ease-out), Sheet membuka/menutup.
- **Dilarang**: fade-and-slide-up per section, hover transition di setiap kartu, parallax, partikel.
- Hormati `prefers-reduced-motion`: peta langsung tampil penuh, transisi dimatikan.
- Animasi GSAP bawaan starter (halaman 404) dibiarkan. Jangan memakai GSAP di tempat lain.

## 8. Kosakata dan nada (UI berbahasa Indonesia)

Nada: lugas, kalimat sentence case, kata kerja aktif. Satu aksi memakai satu nama di seluruh alur.

| Konsep | Istilah di UI | Jangan |
| --- | --- | --- |
| Phase | Fase | Tahap, Kelas, Modul |
| Lesson | Materi | Pelajaran, Lesson |
| Type Learn / Build | Konsep / Praktik | Teori, Latihan |
| Belum ada baris progress | Belum dimulai | Kosong |
| `IN_PROGRESS` | Sedang dipelajari | Berjalan |
| `COMPLETED` | Selesai | Tuntas |
| Tombol utama di materi | Selesai dan lanjut | Submit, Next |
| Batal selesai | Batalkan selesai | Reset |
| Kartu dashboard | Lanjutkan belajar | Resume |

| Konteks | Teks |
| --- | --- |
| Toast setelah tombol Selesai | "Ditandai selesai" |
| Toast setelah batal | "Status selesai dibatalkan" |
| Toast gagal simpan | "Gagal menyimpan. Coba lagi." |
| Learner baru di dashboard | "Belum ada materi yang dibuka. Mulai dari Fase 0." |
| Semua selesai | "Semua materi sudah selesai." |
| Katalog kosong (owner) | "Konten belum disinkronkan. Jalankan `npm run content:sync`." |
| Materi tidak ada | "Materi tidak ditemukan. Kembali ke daftar fase." |
| Redirect login karena gating | Di halaman login: "Masuk untuk membuka materi." |

Aturan: error menyebut apa yang terjadi dan apa yang bisa dilakukan; tanpa permintaan maaf berlebihan, tanpa pesan samar. Keadaan kosong berisi ajakan bertindak. Tanpa tanda panah "→" di akhir teks tombol atau link.

## 9. Aksesibilitas (batas minimum)

- Kontras teks ≥ 4,5:1, elemen UI ≥ 3:1, di mode terang dan gelap.
- Fokus keyboard selalu terlihat (`ring` = `Sinyal`), tidak dihapus.
- Skip link "Lompat ke konten" di awal `(learn)` layout.
- Landmark: `header`, `nav` (sidebar), `main`, `footer`.
- Materi aktif di sidebar: `aria-current="page"`.
- Gambar dalam materi: `alt` dipertahankan dari markdown.
- Target sentuh ≥ 44px di mobile.
- Peta kurikulum: ada alternatif teks (daftar fase) yang setara.

## 10. Daftar "Jangan" untuk agent

- Jangan memakai label huruf kapital berjarak (tracked-out) di atas heading.
- Jangan memakai font mono untuk label kecil non-kode.
- Jangan merangkai meta dengan titik tengah ("A · B · C"). Pakai jarak atau elemen terpisah.
- Jangan menambah gradient wash, glassmorphism, atau blur dekoratif.
- Jangan membungkus semua daftar dalam kartu berbayang.
- Jangan menaruh statistik besar + aksen gradient sebagai hero.
- Jangan menambah warna aksen baru. Status dibedakan dengan bentuk.
- Jangan menambah animasi masuk pada section atau kartu.
- Jangan menulis teks dummy seperti "Lorem ipsum" atau angka fiktif. Angka berasal dari data.
