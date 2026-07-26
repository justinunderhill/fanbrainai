import Image from 'next/image';
import type { Team } from '@/lib/types';

const FLAG_CODE_BY_COUNTRY_CODE: Record<string, string> = {
  ALG: 'dz',
  ARG: 'ar',
  AUS: 'au',
  AUT: 'at',
  BEL: 'be',
  BIH: 'ba',
  BRA: 'br',
  CAN: 'ca',
  CHE: 'ch',
  CIV: 'ci',
  COD: 'cd',
  COL: 'co',
  CPV: 'cv',
  CRO: 'hr',
  CUW: 'cw',
  CZE: 'cz',
  DEU: 'de',
  ECU: 'ec',
  EGY: 'eg',
  ENG: 'gb-eng',
  ESP: 'es',
  FRA: 'fr',
  GER: 'de',
  GHA: 'gh',
  HAI: 'ht',
  HRV: 'hr',
  HTI: 'ht',
  IRN: 'ir',
  IRQ: 'iq',
  JOR: 'jo',
  JPN: 'jp',
  KOR: 'kr',
  KSA: 'sa',
  MAR: 'ma',
  MEX: 'mx',
  NGA: 'ng',
  NED: 'nl',
  NLD: 'nl',
  NOR: 'no',
  NZL: 'nz',
  PAN: 'pa',
  PAR: 'py',
  POR: 'pt',
  PRY: 'py',
  QAT: 'qa',
  RSA: 'za',
  SCO: 'gb-sct',
  SEN: 'sn',
  SUI: 'ch',
  SWE: 'se',
  TUN: 'tn',
  TUR: 'tr',
  URU: 'uy',
  URY: 'uy',
  USA: 'us',
  UZB: 'uz',
};

const sizeClass = {
  sm: 'h-7 w-9 rounded-lg',
  md: 'h-10 w-12 rounded-xl',
  lg: 'h-14 w-16 rounded-2xl',
};

export function TeamBadge({ team, size = 'md' }: { team: Team; size?: keyof typeof sizeClass }) {
  // is_national_team is set explicitly at sync time (which competition type
  // the team came from), not inferred from country_code — that heuristic
  // broke on any club whose 3-letter code collides with a real ISO code
  // (e.g. Chelsea FC's TLA 'CHE' also being Switzerland's ISO code).
  const flagCode = team.is_national_team ? FLAG_CODE_BY_COUNTRY_CODE[team.country_code?.toUpperCase()] : undefined;
  const fallback = team.emoji_flag ?? team.country_code ?? '?';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${sizeClass[size]}`}
      title={team.name}
    >
      {flagCode ? (
        // National team: flag reads better than football-data's federation
        // crest, when we have a flag for its ISO code.
        <Image
          src={`https://flagcdn.com/w80/${flagCode}.png`}
          width={80}
          height={60}
          alt={`${team.name} flag`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : team.crest_url ? (
        // Club team, or a national team with no flag-code mapping — show its
        // crest. object-contain since crests are transparent badges, not
        // rectangular photos.
        <Image
          src={team.crest_url}
          width={80}
          height={80}
          alt={`${team.name} crest`}
          className="h-full w-full object-contain p-1"
          loading="lazy"
          unoptimized
        />
      ) : (
        <span className="text-sm font-black text-gray-200">{fallback}</span>
      )}
    </span>
  );
}
