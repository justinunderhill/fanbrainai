export function SetupNotice() {
  return (
    <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">
      <h2 className="font-black">Supabase is not configured yet</h2>
      <p className="mt-2 text-sm">
        Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`,
        then restart the dev server.
      </p>
    </div>
  );
}
