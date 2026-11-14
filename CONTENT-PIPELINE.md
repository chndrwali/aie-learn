# CONTENT-PIPELINE.md

Spesifikasi script `scripts/ingest-content.ts` (`npm run content:sync`) yang memindahkan kurikulum dari repo upstream ke database.

## Sumber

- Repo: `https://github.com/rohitg00/ai-engineering-from-scratch` (lisensi MIT)
- Isi yang dipakai: hanya `phases/**/docs/en.md`
- Isi yang di-link, tidak disalin: `code/`, `notebook/`, `outputs/` per lesson
- Struktur lesson menurut `LESSON_TEMPLATE.md` upstream:

```
phases/NN-nama-fase/NN-nama-lesson/
├── code/        main.py / main.ts / main.rs / main.jl
├── notebook/    lesson.ipynb
├── docs/        en.md          ← yang kita ingest
└── outputs/     prompt-*.md, skill-*.md
```

Format `docs/en.md` menurut template upstream (parser harus toleran terhadap penyimpangan):

```
# Judul lesson

> Motto satu baris

**Type:** Build | Learn
**Languages:** Python, TypeScript, ...
**Prerequisites:** ...
**Time:** ~N minutes

## The Problem
## The Concept
## Build It        (### Step 1, ### Step 2, ...)
## Use It
## Ship It
## Exercises
## Key Terms
## Further Reading
```

## Fakta yang sudah diverifikasi dan yang belum

| Fakta | Status |
| --- | --- |
| Nomor lesson tidak kontigu (Phase 10: 22 → 25 → 34; Phase 8: 14 → 19) | Terverifikasi dari README upstream. **Jangan** mengasumsikan 1..N. |
| Folder fase 00 sampai 14 dan 17 | Nama folder terverifikasi dari link README (lihat tabel di bawah). |
| Folder fase 15, 16, 18, 19 | **Belum terverifikasi.** Ditemukan otomatis oleh regex `^\d{2}-` pada `phases/`. |
| Isi per-lesson (`docs/en.md` sebenarnya) | **Belum dibaca langsung** saat dokumen ini ditulis. Verifikasi di T3. |
| Total "542 lesson, 20 phase" | Klaim README. Report sync membandingkan tetapi ketidaksamaan bukan kegagalan. |
| Semua lesson lengkap | Tidak dijamin (README menyebut "completed lesson"). Lesson stub dilewati. |

## Alur

```
1. Ambil upstream pada CONTENT_REF  → .content-cache/upstream (git-ignored)
2. Pass 1: scan phases/*/*/  → baca docs/en.md → parse metadata → bangun katalog (belum menulis DB)
3. Pass 2: tulis ulang link dengan katalog → hitung contentHash dan sortOrder
4. Tulis ke DB: upsert Phase, upsert Lesson per sourcePath, nonaktifkan yang hilang
5. Simpan ContentSync + report, cetak ringkasan
```

### 1. Mengambil upstream

Gunakan `git` langsung (bukan scraping HTML):

```bash
git init .content-cache/upstream
git -C .content-cache/upstream fetch --depth 1 "$CONTENT_REPO_URL" "$CONTENT_REF"
git -C .content-cache/upstream checkout FETCH_HEAD
git -C .content-cache/upstream rev-parse HEAD      # SHA yang disimpan sebagai sourceSha
```

Berlaku untuk branch, tag, maupun SHA. Untuk mengunci versi, isi `CONTENT_REF` dengan SHA.

### 2. Pass 1: scan dan parse

- Fase: setiap direktori `phases/NN-xxx` (regex `^\d{2}-`). `number = parseInt(NN)`, `slug = nama folder`.
- Lesson: setiap subdirektori `NN-xxx` di dalam fase. `number = parseInt(NN)`, `slug = nama folder`, `sourcePath = phases/<fase>/<lesson>`.
- Urutan: sort numerik (fase, lalu lesson). `sortOrder` = posisi 1..N di antara lesson aktif.
- Lesson tanpa `docs/en.md`: **dilewati**, dicatat `reason: "no-docs"`.
- Lesson dengan body < 400 karakter (setelah header dibuang): dilewati, `reason: "stub"`. Ambang bisa diubah via flag `--min-chars`.

Aturan parse (fungsi murni di `modules/learning/lib/parse-lesson.ts`, wajib ada unit test dengan fixture):

| Field | Aturan | Jika gagal |
| --- | --- | --- |
| `title` | Heading `# ` pertama | Fallback: Title Case dari slug; masuk `warnings` |
| `motto` | Baris `> ...` pertama setelah H1 | `null` |
| `type` | `**Type:**` bernilai `Build` atau `Learn` (case-insensitive) | `null` |
| `languages` | `**Languages:**`, dipecah koma, di-trim | `[]` |
| `prerequisites` | `**Prerequisites:**` (teks mentah) | `null` |
| `estimatedMinutes` | `**Time:**` → angka pertama; "hour(s)/h" dikali 60 | `null` |
| `contentMd` | Isi mulai dari heading `## ` pertama (H1, motto, dan blok meta dibuang). Jika tidak ada `## `, simpan seluruh isi setelah H1. | - |

Parser tidak boleh melempar error karena format menyimpang. Ia mengembalikan hasil sebagian + `warnings`.

### 3. Pass 2: tulis ulang link

Dikerjakan pada `contentMd`, setelah katalog lengkap (karena perlu tahu lesson mana yang ada).

| Pola | Hasil |
| --- | --- |
| Link relatif ke lesson lain (`../NN-xxx`, `../NN-xxx/docs/en.md`, `../../NN-fase/NN-xxx`) yang ada di katalog | `/learn/<fase-slug>/<lesson-slug>` |
| `https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/phases/<f>/<l>` (opsional `/docs/en.md`) yang ada di katalog | `/learn/<f>/<l>` |
| `https://aiengineeringfromscratch.com/lesson?path=phases%2F<f>%2F<l>` yang ada di katalog | `/learn/<f>/<l>` |
| Link ke lesson yang **tidak** ada di katalog (stub atau nonaktif) | URL GitHub `blob/<sha>/phases/<f>/<l>` |
| Link relatif ke berkas lain (`code/…`, `notebook/…`, `outputs/…`) | `https://github.com/rohitg00/ai-engineering-from-scratch/blob/<sha>/<sourcePath>/<path>` |
| Gambar relatif | `https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/<sha>/<path-ter-resolve>` |
| Link eksternal lain dan anchor `#...` | Tidak diubah |

Link di dalam blok kode (```) tidak diubah. Implementasi: proses via AST markdown (`remark`), bukan regex pada teks mentah.

### 4. Tulis ke database

- Metadata fase dari `content-meta/phases.json` (berdasarkan `number`). Jika tidak ada, `title` = Title Case dari slug, `tagline = null`.
- `Phase`: upsert berdasarkan `slug`.
- `Lesson`: upsert berdasarkan `sourcePath`. Jika `contentHash` sama dengan di DB, lewati update konten (tetap perbarui `sortOrder` bila berubah).
- Lesson di DB yang tidak ada di hasil scan: `isActive = false`. **Jangan pernah `delete`.**
- Fase tanpa lesson aktif: `isActive = false`.
- Setelah semua upsert: perbarui `sortOrder` semua lesson aktif dalam batch kecil. Tidak perlu satu transaksi raksasa (upsert idempotent; timeout transaksi interaktif default Prisma pendek).
- `contentHash = sha256(contentMd + title + motto + type + languages + prerequisites + estimatedMinutes)`.

### 5. Report

Disimpan di `ContentSync.report` dan dicetak ringkas:

```json
{
  "ref": "main",
  "sha": "<commit>",
  "phases": 20,
  "lessons": { "scanned": 542, "added": 0, "updated": 0, "unchanged": 0, "skipped": 0, "deactivated": 0 },
  "skipped": [{ "sourcePath": "...", "reason": "no-docs | stub" }],
  "warnings": [{ "sourcePath": "...", "message": "Type tidak ditemukan" }],
  "perPhase": [{ "number": 0, "scanned": 13, "active": 13 }],
  "linkStats": { "internal": 0, "githubFallback": 0, "images": 0 },
  "renamedCandidates": [{ "from": "...", "to": "...", "note": "judul sama, path berbeda" }]
}
```

`renamedCandidates` membantu owner melihat lesson yang kemungkinan hanya dipindah (judul sama, `sourcePath` baru). Progress tidak dipindah otomatis.

## Pengaman

| Kondisi | Perilaku |
| --- | --- |
| Hasil scan memuat < 80% dari jumlah lesson aktif di sync sebelumnya | Berhenti dengan error. Butuh `--force`. Mencegah clone rusak menonaktifkan semuanya. |
| 0 fase ditemukan | Berhenti dengan error (tanpa `--force`). |
| `--dry-run` | Menjalankan pass 1 dan 2, mencetak report, **tidak menulis** ke DB. |
| Ketidakcocokan jumlah dengan README (542) | Dicetak sebagai informasi, bukan error. |

## Perintah

```bash
npm run content:sync                                  # ref = CONTENT_REF atau main
npm run content:sync -- --dry-run                     # lihat report tanpa menulis
npm run content:sync -- --ref <sha>                   # kunci ke commit tertentu
npm run content:sync -- --min-chars 400 --force
```

`package.json`:

```json
{ "scripts": { "content:sync": "tsx scripts/ingest-content.ts" } }
```

Jika `lib/prisma.ts` bermasalah saat dijalankan di luar Next (mis. import khusus Next), buat `scripts/db.ts` dengan adapter PrismaPg yang sama.
Tambahkan `.content-cache/` ke `.gitignore`.

Jalankan ingest dari mesin lokal atau CI, **bukan** saat build di Vercel. Database yang disasar ditentukan oleh `DATABASE_URL` saat itu: periksa dua kali sebelum menjalankan terhadap production.

## Data statis: `content-meta/`

### `phases.json`

Judul diambil dari README upstream; tagline diterjemahkan manual. Fase 14 sampai 19: judul dari diagram README, tagline belum diketahui (`null`).

```json
{
  "0":  { "title": "Setup & Tooling", "tagline": "Siapkan lingkungan kerja sebelum mulai." },
  "1":  { "title": "Math Foundations", "tagline": "Intuisi di balik setiap algoritma AI, lewat kode." },
  "2":  { "title": "ML Fundamentals", "tagline": "ML klasik, masih tulang punggung kebanyakan AI di produksi." },
  "3":  { "title": "Deep Learning Core", "tagline": "Neural network dari prinsip dasar, tanpa framework sampai kamu membangunnya sendiri." },
  "4":  { "title": "Computer Vision", "tagline": "Dari piksel sampai pemahaman: gambar, video, 3D, VLM, dan world model." },
  "5":  { "title": "NLP: Foundations to Advanced", "tagline": "Bahasa adalah antarmuka menuju kecerdasan." },
  "6":  { "title": "Speech & Audio", "tagline": "Mendengar, memahami, berbicara." },
  "7":  { "title": "Transformers Deep Dive", "tagline": "Arsitektur yang mengubah segalanya." },
  "8":  { "title": "Generative AI", "tagline": "Membuat gambar, video, audio, 3D, dan lainnya." },
  "9":  { "title": "Reinforcement Learning", "tagline": "Fondasi RLHF dan AI pemain game." },
  "10": { "title": "LLMs from Scratch", "tagline": "Bangun, latih, dan pahami large language model." },
  "11": { "title": "LLM Engineering", "tagline": "Menjalankan LLM di produksi." },
  "12": { "title": "Multimodal AI", "tagline": "Melihat, mendengar, membaca, dan bernalar lintas modalitas." },
  "13": { "title": "Tools & Protocols", "tagline": "Antarmuka antara AI dan dunia nyata." },
  "14": { "title": "Agent Engineering", "tagline": null },
  "15": { "title": "Autonomous Systems", "tagline": null },
  "16": { "title": "Multi-Agent & Swarms", "tagline": null },
  "17": { "title": "Infrastructure & Production", "tagline": null },
  "18": { "title": "Ethics & Alignment", "tagline": null },
  "19": { "title": "Capstone Projects", "tagline": null }
}
```

### `phase-graph.json`

Ketergantungan antar fase, disalin dari diagram "The shape of the curriculum" di README upstream. Dipakai oleh `PhaseMap` (lihat `DESIGN.md`). Dipelihara manual; ubah hanya jika diagram upstream berubah.

```json
{
  "edges": [
    [0,1],[1,2],[2,3],
    [3,4],[3,5],[3,6],[3,9],
    [5,7],[7,8],[7,10],
    [10,11],[10,12],[11,13],
    [13,14],[14,15],[14,17],
    [15,16],[15,18],
    [16,19],[17,19],[18,19]
  ]
}
```

### Nama folder fase yang sudah terverifikasi

| No | Folder | Jumlah lesson menurut README |
| --- | --- | --- |
| 0 | `00-setup-and-tooling` | 13 |
| 1 | `01-math-foundations` | 22 |
| 2 | `02-ml-fundamentals` | 21 |
| 3 | `03-deep-learning-core` | 13 |
| 4 | `04-computer-vision` | 28 |
| 5 | `05-nlp-foundations-to-advanced` | 29 |
| 6 | `06-speech-and-audio` | 17 |
| 7 | `07-transformers-deep-dive` | 16 |
| 8 | `08-generative-ai` | 15 |
| 9 | `09-reinforcement-learning` | 12 |
| 10 | `10-llms-from-scratch` | 24 |
| 11 | `11-llm-engineering` | 17 |
| 12 | `12-multimodal-ai` | 25 |
| 13 | `13-tools-and-protocols` | 45 |
| 14 | `14-agent-engineering` | belum diketahui |
| 15, 16 | belum terverifikasi | belum diketahui |
| 17 | `17-infrastructure-and-production` | belum diketahui |
| 18, 19 | belum terverifikasi | belum diketahui |

Jumlah per fase hanya dipakai sebagai pembanding di report, bukan sebagai konstanta di kode.

## Checklist verifikasi setelah sync pertama (T3)

- [ ] Jumlah fase = 20 (atau selisihnya dijelaskan)
- [ ] Jumlah lesson aktif per fase dibandingkan dengan tabel di atas; selisih dicatat
- [ ] Lesson `skipped` ditinjau: stub memang stub, bukan salah parse
- [ ] Fase 10 dan 8 terurut benar meski nomor melompat
- [ ] Lima lesson acak dirender di viewer: judul, motto, atribut, link, gambar benar
- [ ] `grep -rn '\$\$' phases | head` (atau `\\(`) untuk memutuskan perlu `remark-math`/KaTeX atau tidak
- [ ] `grep -rln '```mermaid' phases | head` untuk memutuskan perlu mermaid atau tidak
- [ ] `grep -rln '<[a-z]\+[ >]' phases | head` untuk melihat apakah ada HTML mentah di materi; jika ada, putuskan: dibuang atau di-sanitize
- [ ] Ada `docs/*.md` selain `en.md`? (jawaban untuk FR-207)
- [ ] Sync kedua berturut-turut: `added: 0, updated: 0`
- [ ] Ukuran tabel `Lesson` dicatat (untuk asumsi kapasitas)
- [ ] `THIRD_PARTY_NOTICES.md` memuat teks lisensi MIT upstream dan nama pemegang hak cipta (salin dari `LICENSE` upstream, jangan diketik dari ingatan)
