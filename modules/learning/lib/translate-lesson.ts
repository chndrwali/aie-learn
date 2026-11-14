/**
 * translate-lesson.ts — Pass 2b ingest: terjemahkan contentMd ke Bahasa Indonesia.
 *
 * Mesin: Gemini API (free tier, model gemini-2.5-flash-lite — sama seperti yang
 * dipakai chatbot portfolio-v3). Tanpa GEMINI_API_KEY, fungsi mengembalikan
 * translated: false dan isi dibiarkan English; ingest mencatatnya di report
 * (bukan gagal). Code block, inline code, URL, dan nama file TIDAK diterjemahkan.
 */

const GEMINI_MODEL = "gemini-2.5-flash-lite";

export interface TranslateOptions {
  apiKey: string | undefined;
  /** istilah yang wajib tetap Bahasa Inggris (dari content-meta/glossary.json) */
  doNotTranslate: string[];
}

export interface TranslateResult {
  translated: boolean;
  markdown: string;
  reason?: string;
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

/** Terjemahkan satu dokumen markdown. Mengembalikan teks asli bila gagal/tanpa key. */
export async function translateMarkdown(
  markdown: string,
  opts: TranslateOptions,
): Promise<TranslateResult> {
  if (!opts.apiKey) {
    return { translated: false, markdown, reason: "GEMINI_API_KEY tidak diset" };
  }
  if (!markdown.trim()) {
    return { translated: false, markdown, reason: "dokumen kosong" };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: buildPrompt(markdown, opts.doNotTranslate) }] },
        ],
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
    return {
      translated: false,
      markdown,
      reason: `Gemini HTTP ${res.status}`,
    };
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
  // Model kadang membungkus output dengan ```markdown — kupas.
  const cleaned = text
    .replace(/^```markdown\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return { translated: true, markdown: cleaned };
}
