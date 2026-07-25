import { TeamBadge } from '@/components/TeamBadge';
import type { Team } from '@/lib/types';
import type { FormResult, TeamForm as TeamFormData } from '@/lib/team-form';

const RESULT_STYLES: Record<FormResult, string> = {
  W: 'bg-emerald-400/90 text-gray-950',
  D: 'bg-amber-300/90 text-gray-950',
  L: 'bg-rose-500/90 text-white',
};

function FormPill({ result }: { result: FormResult }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${RESULT_STYLES[result]}`}
      aria-hidden
    >
      {result}
    </span>
  );
}

/**
 * Compact recent-form readout for one team: a summary line, a row of W/D/L pills
 * (chronological), and the underlying results so a fan can sanity-check their
 * scoreline before locking it in. Renders a graceful empty state early in the
 * tournament when a side hasn't finished a match yet.
 */
function TeamFormCard({ team, form }: { team: Team; form: TeamFormData }) {
  const played = form.matches.length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <TeamBadge team={team} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-black">{team.name}</span>
        {played > 0 && (
          <span className="shrink-0 text-xs font-bold tabular-nums text-gray-400">
            {form.wins}W {form.draws}D {form.losses}L
          </span>
        )}
      </div>

      {played === 0 ? (
        <p className="mt-3 text-xs text-gray-500">No completed matches yet this tournament.</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-1.5">
            {form.matches.map((m) => (
              <FormPill key={m.matchId} result={m.result} />
            ))}
            <span className="ml-auto text-xs font-bold tabular-nums text-gray-400">
              {form.goalsFor}–{form.goalsAgainst} <span className="font-medium text-gray-500">GF/GA</span>
            </span>
          </div>

          <ul className="mt-3 space-y-1.5">
            {/* Most recent first reads naturally in a list, opposite the pills. */}
            {[...form.matches].reverse().map((m) => (
              <li key={m.matchId} className="flex items-center gap-2 text-xs text-gray-300">
                <FormPill result={m.result} />
                <span className="tabular-nums font-bold text-gray-100">
                  {m.teamScore}–{m.opponentScore}
                </span>
                <span className="text-gray-500">vs</span>
                <TeamBadge
                  team={{ ...m.opponent, id: '', group_name: null } as Team}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate">{m.opponent.name}</span>
                <span className="hidden shrink-0 text-gray-500 sm:inline">{m.stage}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Side-by-side recent form for both teams in a fixture, shown above the
 * prediction form so picks can be backed by how each side has actually played.
 * Renders nothing if neither team has any completed matches yet.
 */
export function TeamFormPanel({
  homeTeam,
  awayTeam,
  homeForm,
  awayForm,
}: {
  homeTeam: Team;
  awayTeam: Team;
  homeForm: TeamFormData;
  awayForm: TeamFormData;
}) {
  if (homeForm.matches.length === 0 && awayForm.matches.length === 0) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-1 text-xl font-black">Recent form</h2>
      <p className="mb-4 text-sm text-gray-400">How each side has played so far — a quick gut-check for your scoreline.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TeamFormCard team={homeTeam} form={homeForm} />
        <TeamFormCard team={awayTeam} form={awayForm} />
      </div>
    </section>
  );
}
