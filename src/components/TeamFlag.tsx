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

export function TeamFlag({ team, size = 'md' }: { team: Team; size?: keyof typeof sizeClass }) {
  const flagCode = FLAG_CODE_BY_COUNTRY_CODE[team.country_code?.toUpperCase()];
  const fallback = team.emoji_flag ?? team.country_code ?? '?';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${sizeClass[size]}`}
      title={team.name}
    >
      {flagCode ? (
        <Image
          src={`https://flagcdn.com/w80/${flagCode}.png`}
          width={80}
          height={60}
          alt={`${team.name} flag`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="text-sm font-black text-gray-200">{fallback}</span>
      )}
    </span>
  );
}
