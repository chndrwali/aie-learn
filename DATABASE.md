# DATABASE.md

Tambahan model di atas skema auth bawaan starter (`User`, `Account`, `Session`, `Verification`, dll).
**Jangan ubah model auth.** Satu-satunya perubahan pada `User` adalah relasi balik (lihat bawah).

Ikuti konvensi penamaan yang sudah ada di `prisma/schema.prisma`. Jika starter memakai `@@map` snake_case, terapkan juga pada model baru.

## Schema (tambahkan ke `prisma/schema.prisma`)

```prisma
enum LessonType {
  LEARN
  BUILD
}

enum ProgressStatus {
  IN_PROGRESS
  COMPLETED
}

model Phase {
  id        String   @id @default(cuid())
  slug      String   @unique            // nama folder upstream, mis. "00-setup-and-tooling"
  number    Int      @unique            // prefix folder, 0..19
  title     String
  tagline   String?
  isActive  Boolean  @default(true)
  lessons   Lesson[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Lesson {
  id               String      @id @default(cuid())
  phaseId          String
  phase            Phase       @relation(fields: [phaseId], references: [id], onDelete: Restrict)
  slug             String                      // nama folder lesson, mis. "01-dev-environment"
  number           Int                         // prefix folder; TIDAK kontigu
  sortOrder        Int                         // urutan global 1..N, dihitung saat ingest
  title            String
  motto            String?
  type             LessonType?                 // null jika metadata tidak ada
  languages        String[]
  prerequisites    String?
  estimatedMinutes Int?
  contentMd        String      @db.Text        // body markdown tanpa H1/motto/meta, link sudah ditulis ulang, dalam Bahasa Indonesia (terjemahan dari docs/en.md)
  contentHash      String                      // sha256(contentMd + metadata)
  sourcePath       String      @unique         // "phases/00-setup-and-tooling/01-dev-environment"
  sourceSha        String                      // commit upstream saat ingest
  isActive         Boolean     @default(true)
  progress         LessonProgress[]
  notes            Note[]
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  @@unique([phaseId, slug])
  @@index([phaseId, sortOrder])
  @@index([sortOrder])
}

model LessonProgress {
  id            String         @id @default(cuid())
  userId        String
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId      String
  lesson        Lesson         @relation(fields: [lessonId], references: [id], onDelete: Restrict)
  status        ProgressStatus @default(IN_PROGRESS)
  firstViewedAt DateTime       @default(now())
  lastViewedAt  DateTime       @default(now())
  completedAt   DateTime?

  @@unique([userId, lessonId])
  @@index([userId, status])
  @@index([userId, lastViewedAt(sort: Desc)])
  @@index([userId, completedAt])
}

model Note {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId  String
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Restrict)
  body      String   @db.Text
  updatedAt DateTime @updatedAt

  @@unique([userId, lessonId])
}

model ContentSync {
  id             String   @id @default(cuid())
  repoUrl        String
  ref            String
  sha            String
  phases         Int
  lessonsActive  Int
  lessonsSkipped Int
  report         Json
  createdAt      DateTime @default(now())

  @@index([createdAt(sort: Desc)])
}
```

Relasi balik yang ditambahkan pada model `User` yang sudah ada:

```prisma
  lessonProgress LessonProgress[]
  notes          Note[]
```

Could Have (jangan dibuat sebelum diminta):

```prisma
// model Bookmark { id, userId, lessonId, createdAt  @@unique([userId, lessonId]) }
```

## Keputusan desain

| Keputusan | Alasan |
| --- | --- |
| Konten di database, bukan di file | Satu sumber kebenaran, bisa di-query/cari, deploy tidak perlu membawa folder konten. Perkiraan ukuran beberapa MB sampai puluhan MB; **ukur setelah sync pertama**. |
| `Lesson` tidak pernah di-hard-delete | Progress dan catatan merujuk ke sana. Relasi memakai `onDelete: Restrict` supaya penghapusan tidak sengaja gagal, bukan menghapus progress diam-diam. |
| Progress sparse | Tidak ada baris = belum dimulai. Hanya dua status tersimpan: `IN_PROGRESS`, `COMPLETED`. |
| "Lanjutkan" diturunkan dari `lastViewedAt` | Tidak perlu tabel state tambahan. Indeks `(userId, lastViewedAt desc)` cukup. |
| Streak dari `completedAt` | Tidak perlu tabel aktivitas. Catatan: `lastViewedAt` hanya menyimpan kunjungan terakhir per materi, jadi heatmap kunjungan tidak akurat. Heatmap memakai `completedAt`. |
| `sortOrder` global | Prev/next lintas fase menjadi satu query (`sortOrder > x`), tanpa logika batas fase. |
| `sourcePath` unik | Kunci stabil untuk upsert saat re-sync. Jika upstream me-rename folder, lesson lama nonaktif dan lesson baru dibuat (progress lama tidak ikut pindah otomatis; lihat report sync). |
| Persen progress tidak disimpan | Dihitung dari data, selalu konsisten saat lesson ditambah atau dinonaktifkan. |

## Query penting

Semua query progress **wajib** memfilter `userId` dari session.

```ts
// Total materi aktif per fase
const totals = await prisma.lesson.groupBy({
  by: ["phaseId"],
  where: { isActive: true, phase: { isActive: true } },
  _count: { _all: true },
});

// Materi selesai milik user (maks ~550 baris), hitung per fase di JS
const done = await prisma.lessonProgress.findMany({
  where: { userId, status: "COMPLETED", lesson: { isActive: true } },
  select: { lesson: { select: { phaseId: true } } },
});

// Materi terakhir dibuka
const last = await prisma.lessonProgress.findFirst({
  where: { userId, lesson: { isActive: true } },
  orderBy: { lastViewedAt: "desc" },
  include: { lesson: { include: { phase: true } } },
});

// Berikutnya / sebelumnya (lintas fase)
const next = await prisma.lesson.findFirst({
  where: { isActive: true, sortOrder: { gt: current.sortOrder } },
  orderBy: { sortOrder: "asc" },
});
const prev = await prisma.lesson.findFirst({
  where: { isActive: true, sortOrder: { lt: current.sortOrder } },
  orderBy: { sortOrder: "desc" },
});
```

### Upsert progress (idempotent)

```ts
// visit: tidak pernah menurunkan COMPLETED
await prisma.lessonProgress.upsert({
  where: { userId_lessonId: { userId, lessonId } },
  create: { userId, lessonId },                       // IN_PROGRESS
  update: { lastViewedAt: new Date() },
});

// markComplete: completedAt tidak berubah jika sudah COMPLETED
const existing = await prisma.lessonProgress.findUnique({
  where: { userId_lessonId: { userId, lessonId } },
  select: { status: true, completedAt: true },
});
await prisma.lessonProgress.upsert({
  where: { userId_lessonId: { userId, lessonId } },
  create: { userId, lessonId, status: "COMPLETED", completedAt: new Date() },
  update: {
    status: "COMPLETED",
    lastViewedAt: new Date(),
    completedAt: existing?.status === "COMPLETED" ? existing.completedAt : new Date(),
  },
});
```

## Pencarian

- **MVP (FR-102)**: `ILIKE` pada `title` dan `motto`. Dengan ≤ ~600 baris ini cukup cepat.
- **Nanti**: pencarian isi materi. Tambahkan lewat migrasi SQL manual (`tsvector` + indeks GIN, atau `pg_trgm`), karena Prisma tidak mendukung kolom generated secara native. Jangan dikerjakan sebelum ada kebutuhan.

## Migrasi

```bash
npx prisma migrate dev --name add_learning_models
npx prisma generate
```

- Data fase/lesson **tidak** di-seed lewat `prisma db seed`. Satu-satunya jalur adalah `npm run content:sync`.
- Gunakan database terpisah untuk development dan production (Neon branch).
- Jangan pernah `prisma migrate reset` pada database yang berisi progress asli.
