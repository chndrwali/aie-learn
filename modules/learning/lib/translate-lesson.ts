/**
 * translate-lesson.ts — Pass 2b ingest: terjemahkan contentMd ke Bahasa Indonesia.
 *
 * Dua mesin, dipilih otomatis:
 * 1. Gemini API (bila GEMINI_API_KEY diset) — model gemini-2.5-flash-lite.
 * 2. Google Translate endpoint publik (tanpa key) — dipakai bila tidak ada key.
 *    Teruji 14 Nov 2026: inline code + URL + placeholder __TERM_0__ selamat
 *    diterjemahkan; glosarium WAJIB diproteksi karena "prompt" diterjemahkan
 *    jadi "cepat" bila tidak diproteksi.
 *
 * Yang TIDAK pernah diterjemahkan: fenced code block, inline code, URL,
 * rumus math ($...$ / $$...$$), tag HTML, dan istilah glosarium.
 */

const GEMINI_MODEL = "gemini-3.5-flash-lite"; // 2.5-flash-lite ditolak API per 14 Nov 2026 ("no longer available to new users")
const GT_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const GT_MAX_CHARS = 4000;
const GT_DELAY_MS = 1000; // jeda antar chunk — endpoint gratis mudah rate-limit
const GT_BACKOFF_MS = [0, 10_000, 30_000, 90_000]; // retry per chunk

export interface TranslateOptions {
  apiKey: string | undefined;
  /** istilah yang wajib tetap Bahasa Inggris (dari content-meta/glossary.json) */
  doNotTranslate: string[];
  /** path ke helper custom.gemini (dipakai bila apiKey tidak diset) */
  geminiCli?: string;
}

export interface TranslateResult {
  translated: boolean;
  markdown: string;
  reason?: string;
  engine?: "gemini" | "google-translate";
}

/* ---------------- Gemini ---------------- */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

function cleanGeminiText(text: string): string {
  return text
    .replace(/^```markdown\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Gemini via helper custom.gemini (kredensial di Secure Vault, bukan env).
 * Retry bila 429 (free tier per-menit) atau 503 (model overload sementara):
 * tunggu 65 dtk, maks 3x percobaan.
 */
async function translateWithGeminiCli(
  markdown: string,
  cliPath: string,
  doNotTranslate: string[],
): Promise<TranslateResult> {
  const prompt = buildPrompt(markdown, doNotTranslate);
  let lastReason = "helper gagal";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(65_000);
    try {
      const out = execFileSync(cliPath, [], {
        input: prompt,
        encoding: "utf-8",
        timeout: 180_000,
        maxBuffer: 50 * 1024 * 1024,
      }) as unknown as string;
      const cleaned = cleanGeminiText(out);
      if (!cleaned) {
        lastReason = "respons Gemini kosong";
        continue;
      }
      return { translated: true, markdown: cleaned, engine: "gemini" };
    } catch (err) {
      const stderr =
        (err as { stderr?: unknown })?.stderr?.toString() ?? String(err);
      lastReason = stderr.slice(0, 200);
      if (!/429|503/.test(stderr)) break;
    }
  }
  return { translated: false, markdown, reason: lastReason };
}

function buildPrompt(markdown: string, doNotTranslate: string[]): string {
  const keep = doNotTranslate.length
    ? `Istilah berikut JANGAN diterjemahkan, biarkan dalam Bahasa Inggris: ${doNotTranslate.join(", ")}.`
    : "";
  return [
    "Terjemahkan dokumen Markdown berikut dari Bahasa Inggris ke Bahasa Indonesia yang natural dan mudah dipahami pemula.",
    "ATURAN:",
    "- JANGAN ubah struktur Markdown (heading, list, tabel, blockquote, link).",
    "- JANGAN terjemahkan isi code block (```), inline code (`...`), URL, nama file, nama perintah, dan nama variabel.",
    "- JANGAN terjemahkan nama orang, nama produk, dan nama brand.",
    "- Istilah teknis yang umum dipakai dalam Bahasa Inggris boleh dibiarkan English bila terjemahannya terdengar aneh.",
    keep,
    "- Keluarkan HANYA hasil terjemahan, tanpa penjelasan tambahan, tanpa membungkus dengan ```markdown.",
    "",
    markdown,
  ]
    .filter(Boolean)
    .join("\n");
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

async function translateWithGemini(
  markdown: string,
  opts: TranslateOptions,
): Promise<TranslateResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(opts.apiKey!)}`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(markdown, opts.doNotTranslate) }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });
  } catch (err) {
    return {
      translated: false,
      markdown,
      reason: `fetch gagal: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!res.ok) {
    return { translated: false, markdown, reason: `Gemini HTTP ${res.status}` };
  }
  const data = (await res.json()) as GeminiResponse;
  if (data.error) {
    return {
      translated: false,
      markdown,
      reason: `Gemini error: ${data.error.message ?? "unknown"}`,
    };
  }
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    return { translated: false, markdown, reason: "respons Gemini kosong" };
  }
  const cleaned = cleanGeminiText(text);
  return { translated: true, markdown: cleaned, engine: "gemini" };
}

/* ---------------- Google Translate (tanpa key) ---------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lindungi potongan yang tidak boleh diterjemahkan dengan placeholder __P_N__. */
function protect(
  text: string,
  doNotTranslate: string[],
): { text: string; restore: (s: string) => string } {
  const saved: string[] = [];
  const stash = (s: string): string => {
    saved.push(s);
    return `__P_${saved.length - 1}__`;
  };
  let out = text;
  // Fenced code block dulu — isinya (termasuk backtick/math di dalam) tidak tersentuh
  out = out.replace(/```[\s\S]*?```/g, (m) => stash(m));
  // Rumus math
  out = out.replace(/\$\$[\s\S]*?\$\$/g, (m) => stash(m));
  out = out.replace(/\$[^$\n]+\$/g, (m) => stash(m));
  // Tag HTML
  out = out.replace(/<[^>\n]+>/g, (m) => stash(m));
  // Inline code (`...`) — Google menerjemahkan kata di dalamnya bila tidak diproteksi
  // (terbukti: `weights` -> `Bobot`); lindungi sebelum istilah glosarium
  out = out.replace(/`[^`\n]+`/g, (m) => stash(m));
  // Istilah glosarium (whole-word, case-insensitive, terpanjang dulu)
  const terms = [...doNotTranslate].sort((a, b) => b.length - a.length);
  for (const term of terms) {
    const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
    out = out.replace(re, (m) => stash(m));
  }
  return {
    text: out,
    // Restore sampai tuntas (fixpoint): satu stash bisa menelan placeholder
    // lain — mis. backtick nyasar membuat regex inline code menelan
    // placeholder di dekatnya — sehingga hasil restore pertama masih
    // mengandung __P_N__ yang harus di-restore lagi. Urutan pembuatan stash
    // menjamin terminasi (stash luar hanya berisi placeholder lebih dulu).
    restore: (s: string) => {
      let cur = s;
      for (let pass = 0; pass < 5; pass++) {
        if (!/__P_\d+__/.test(cur)) break;
        cur = cur.replace(/__P_(\d+)__/g, (_, n: string) => saved[Number(n)] ?? "");
      }
      return cur;
    },
  };
}

/** Satu request translate untuk satu chunk teks (tanpa code block). */
async function googleTranslateChunk(chunk: string): Promise<string | null> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: "id",
    dt: "t",
    q: chunk,
  });
  for (let attempt = 0; attempt < GT_BACKOFF_MS.length; attempt++) {
    if (attempt > 0) await sleep(GT_BACKOFF_MS[attempt]);
    try {
      const res = await fetch(`${GT_ENDPOINT}?${params.toString()}`);
      if (!res.ok) {
        // 429/5xx = retryable; 4xx lain = gagal langsung
        if ((res.status === 429 || res.status >= 500) && attempt < GT_BACKOFF_MS.length - 1) {
          continue;
        }
        return null;
      }
      const data = (await res.json()) as Array<
        Array<[string, string, ...unknown[]]>
      >;
      const parts = data?.[0];
      if (!Array.isArray(parts)) return null;
      return parts.map((p) => (typeof p?.[0] === "string" ? p[0] : "")).join("");
    } catch {
      if (attempt < GT_BACKOFF_MS.length - 1) continue;
      return null;
    }
  }
  return null;
}

/** Bagi teks terproteksi jadi chunk <= GT_MAX_CHARS di batas paragraf. */
function chunkText(text: string): string[] {
  const blocks = text.split(/(?<=\n\n)/);
  const chunks: string[] = [];
  let cur = "";
  for (const block of blocks) {
    if ((cur + block).length > GT_MAX_CHARS && cur) {
      chunks.push(cur);
      cur = block;
    } else {
      cur += block;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function translateWithGoogle(
  markdown: string,
  doNotTranslate: string[],
): Promise<TranslateResult> {
  // Proteksi sekali untuk seluruh dokumen (code block jadi placeholder),
  // lalu terjemahkan prosa dalam 1-3 chunk besar — jauh lebih cepat daripada
  // satu request per segmen antar code block.
  const { text, restore } = protect(markdown, doNotTranslate);
  const chunks = chunkText(text);
  const translated: string[] = [];
  for (const chunk of chunks) {
    const result = await googleTranslateChunk(chunk);
    if (result === null) {
      return {
        translated: false,
        markdown,
        reason: "Google Translate gagal (network/HTTP)",
      };
    }
    translated.push(result);
    await sleep(GT_DELAY_MS);
  }
  const out = restore(translated.join(""));
  // Sanity: tidak boleh ada placeholder yang tertinggal
  if (/__P_\d+__/.test(out)) {
    return {
      translated: false,
      markdown,
      reason: "placeholder proteksi tertinggal setelah restore",
    };
  }
  return { translated: true, markdown: out, engine: "google-translate" };
}

/* ---------------- Entry point ---------------- */

/** Terjemahkan satu dokumen markdown. Urutan mesin: Gemini via API key (env) ->
 * Gemini via helper custom.gemini (Secure Vault) -> Google Translate (tanpa key). */
export async function translateMarkdown(
  markdown: string,
  opts: TranslateOptions,
): Promise<TranslateResult> {
  if (!markdown.trim()) {
    return { translated: false, markdown, reason: "dokumen kosong" };
  }
  if (opts.apiKey) return translateWithGemini(markdown, opts);
  if (opts.geminiCli && existsSync(opts.geminiCli)) {
    return translateWithGeminiCli(markdown, opts.geminiCli, opts.doNotTranslate);
  }
  return translateWithGoogle(markdown, opts.doNotTranslate);
}
