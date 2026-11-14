import { AuthForm } from "@/modules/auth/ui/form";

export const metadata = {
  title: "Login",
  description: "Login to your account",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {callbackURL && (
        <p className="mb-4 text-sm text-muted-foreground">
          Masuk untuk membuka materi.
        </p>
      )}
      <AuthForm variant="login" callbackURL={callbackURL} />
    </div>
  );
}
