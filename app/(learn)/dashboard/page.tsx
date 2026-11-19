export default function DashboardPage() {
  // Shell sudah menyediakan <main id="main-content"> (learner-layout.tsx),
  // jadi halaman ini memakai <div> agar tidak ada landmark ganda.
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Selamat datang di AIE Learn. Halaman ini masih placeholder — daftar
        materi dan tombol &ldquo;Lanjutkan belajar&rdquo; hadir di task
        berikutnya.
      </p>
    </div>
  );
}
