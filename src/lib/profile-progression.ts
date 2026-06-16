import type { PredictionStyle } from '@/lib/types';

export type Trait = 'logic' | 'chaos' | 'loyalty' | 'risk';

export const TRAIT_LABEL: Record<Trait, string> = {
  logic: 'Logic',
  chaos: 'Chaos',
  loyalty: 'Loyalty',
  risk: 'Risk',
};

// Each prediction style leans into one personality trait. This mirrors how the AI profile
// generator reads a fan's style mix into trait scores, but is computed deterministically and
// kept separate from the AI — so we can describe recent picks ("your last few calls lean
// Chaos") without re-running generation or mutating the stored scores.
const STYLE_TRAIT: Record<PredictionStyle, Trait> = {
  head: 'logic',
  tactical: 'logic',
  heart: 'loyalty',
  chaos: 'chaos',
  vibes: 'chaos',
  underdog: 'risk',
};

export type RecentLean = {
  /** Picks made after the profile was last generated. */
  count: number;
  byTrait: Record<Trait, number>;
  /** Dominant trait among the recent picks, or null when there are none. */
  top: Trait | null;
};

export function summarizeRecentPicks(styles: PredictionStyle[]): RecentLean {
  const byTrait: Record<Trait, number> = { logic: 0, chaos: 0, loyalty: 0, risk: 0 };
  for (const style of styles) byTrait[STYLE_TRAIT[style]] += 1;

  const ranked = (Object.entries(byTrait) as [Trait, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  return { count: styles.length, byTrait, top: ranked[0]?.[0] ?? null };
}
