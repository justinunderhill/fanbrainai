import Link from 'next/link';

export function SignInToPredictPanel({ returnTo }: { returnTo: string }) {
  return (
    <section className="animate-pop-in rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5">
      <h2 className="text-xl font-black text-emerald-100">Sign in to predict</h2>
      <p className="mt-2 text-sm text-gray-300">
        Match details are public, but predictions are saved to your FanBrain profile.
      </p>
      <Link
        href={`/auth?next=${encodeURIComponent(returnTo)}`}
        className="btn btn-primary mt-5 px-6 py-3"
      >
        Sign in to predict
      </Link>
    </section>
  );
}
