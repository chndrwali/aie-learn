# Laporan Verifikasi Konten — Sync Pertama (T3)

## Ringkasan sync

Sync pertama: 14 Nov 2026, 43 menit, commit upstream `8afa245ebc2e` (ref `main`).

- Upstream ref: `main`
- Commit SHA: `8afa245ebc2e8861480edf8c4911a2b6d9769688`
- Total lesson aktif: **542** (20 fase)
- Added / updated / unchanged / skipped / deactivated: **542 / 0 / 0 / 0 / 0**
- Diterjemahkan / belum diterjemahkan: **168 / 374**
- Total estimasi: 72.600 menit (±1.210 jam)
- Durasi sync: 43,0 menit

### Status terjemahan — SEBAGIAN (bukan gagal total)

Endpoint Google Translate gratis kena **rate limit (HTTP 429)** di tengah jalan:
fase 00–08 hampir semua berhasil (168 lesson), lalu fase 09 mulai gagal (2 lesson),
dan fase 10–19 gagal semua (358 lesson gagal network/HTTP). Lesson yang gagal
**tetap tersimpan dalam Bahasa Inggris** (bukan hilang) dan akan dicoba lagi di
sync berikut — sync bersifat idempotent (lesson yang sudah diterjemahkan dilewati
via `contentHash`).

Perbaikan sesudah sync-1 (sudah di-push, menunggu retry):
- Retry per chunk dengan backoff eksponensial (10 dtk / 30 dtk / 90 dtk).
- Jeda antar chunk 300 ms → 1.000 ms, antar lesson 500 ms → 1.000 ms.
- Circuit breaker: berhenti menerjemahkan setelah 15 gagal beruntun, tapi tetap
  menulis DB (lesson yang sudah diterjemahkan tidak hilang).
- Restore placeholder jadi fixpoint (bug: 16 lesson gagal karena satu stash menelan
  placeholder lain, mis. backtick nyasar — hasil restore pertama masih mengandung
  `__P_N__`).

Rencana retry: sync diulang berkala sampai `translated` = 542; bila endpoint masih
429, opsi cepat adalah `GEMINI_API_KEY` gratis dari AI Studio (translator sudah
mendukung Gemini sebagai mesin utama).

## Verifikasi per fase

Angka dari DB (14 Nov 2026, terverifikasi via query langsung):

| Fase | Lesson |
| --- | --- |
| 00-setup-and-tooling | 13 |
| 01-math-foundations | 22 |
| 02-ml-fundamentals | 21 |
| 03-deep-learning-core | 13 |
| 04-computer-vision | 28 |
| 05-nlp-foundations-to-advanced | 29 |
| 06-speech-and-audio | 17 |
| 07-transformers-deep-dive | 16 |
| 08-generative-ai | 15 |
| 09-reinforcement-learning | 12 |
| 10-llms-from-scratch | 24 |
| 11-llm-engineering | 17 |
| 12-multimodal-ai | 25 |
| 13-tools-and-protocols | 45 |
| 14-agent-engineering | 54 |
| 15-autonomous-systems | 22 |
| 16-multi-agent-and-swarms | 25 |
| 17-infrastructure-and-production | 29 |
| 18-ethics-safety-alignment | 30 |
| 19-capstone-projects | 85 |
| **Total** | **542** |

Jumlah per fase sama persis dengan dry-run T2. Baris `content_sync`: 1.

## Keputusan renderer (dari grep atas 542 `docs/en.md` upstream)

| Fitur | Temuan | Keputusan |
| --- | --- | --- |
| Mermaid | 213 lesson mengandung blok ` ```mermaid ` (395 blok total) | **YA — wajib.** Renderer T7 harus merender mermaid (mermaid.js client-side → SVG). Tanpa ini, 213 lesson kehilangan diagramnya. |
| Rumus math | Rumus LaTeX inline nyata (`$E = mc^2$`, `$\sqrt{3^2 + 2^2}$`, `$v_1, v_2, v_3$`, `$\text{rank} < \min(...)$`); tidak ada `$$...$$` display math | **YA — remark-math + KaTeX.** Catatan: `$(...)` shell hanya muncul di dalam code block (aman); bila ada di prosa bisa salah parse sebagai math — dicek lagi di T7. |
| HTML mentah | **Tidak ada** HTML mentah di prosa. Yang ketemu: `<video>`/`<image>` hanya sebagai notasi di dalam backtick (1 lesson), `<br>` hanya di dalam label node diagram mermaid | **TIDAK dirender.** Renderer tanpa `rehype-raw` (sesuai aturan keamanan AGENTS.md). Tidak perlu allowlist khusus. |

## Verifikasi per fase

_(diisi setelah sync — angka nyata per fase dari DB)_

## Spot-check terjemahan (5 lesson acak)

Diambil acak dari DB, 14 Nov 2026 (sebelum retry):

| Lesson | Status | Catatan |
| --- | --- | --- |
| 07-transformers-deep-dive/04-positional-encoding | ✅ ID | "## Masalahnya"; inline code (`softmax(Q K^T / √d) V`) utuh; 0 placeholder sisa. Satu slip makna: "blind to order" → "buta terhadap pesanan" (harusnya "urutan") — keterbatasan mesin gratis. |
| 07-transformers-deep-dive/06-bert-masked-language-modeling | ✅ ID | "## Masalahnya"; 0 placeholder sisa; istilah teknis utuh. |
| 12-multimodal-ai/19-audio-language-whisper-to-af3 | ⏳ masih English | Gagal di sync-1 (rate limit); menunggu retry. |
| 10-llms-from-scratch/02-building-a-tokenizer | ⏳ masih English | Gagal di sync-1 (rate limit); menunggu retry. |
| 19-capstone-projects/52-experiment-runner | ⏳ masih English | Gagal di sync-1 (rate limit); menunggu retry. |

Kriteria T3 (istilah konsisten dengan glosarium, tidak ada kalimat Inggris
tertinggal kecuali istilah teknis/nama): **lolos** pada 2 lesson yang berhasil
diterjemahkan; 3 sisanya belum bisa dinilai sampai retry berhasil.

## Catatan lain

- Total estimasi upstream 72.600 menit (±1.210 jam) — jauh di atas perkiraan PRD ±306 jam.
- 19 lesson tipe `Capstone` + 1 `Use + Build` → `type` null (keputusan pending, lihat TASKS.md Backlog).
- 31 link antar-lesson jatuh ke GitHub (target tidak ada di katalog upstream).
