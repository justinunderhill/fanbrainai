# Luna Review — FanBrain AI

Date: 2026-07-26

## Executive summary

The recent changes move FanBrain AI from a World Cup MVP toward a credible, year-round football fan-engagement platform. The strongest work is the provider-neutral multi-competition foundation, scoped leaderboards, private leagues, standings, club crests, prediction streaks, push notifications, PWA support, sharing, and analytics.

The core emotional loop is now clear:

> Make a call → get judged → see how you compare → return for the next match.

The next phase should focus less on adding isolated features and more on making this loop faster, more visible, and more socially meaningful. The main opportunities are persistent progress, stronger rivalry mechanics, clearer competition context, and a more focused mobile experience.

## Engineering review

### Validation

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` compiles and completes TypeScript validation, but fails during Serwist service-worker page collection with a filesystem access error involving `src/app/sw.ts`.

The build issue appears related to the current environment or service-worker integration, but it should be resolved before treating deployment readiness as confirmed.

### What is working well

#### Multi-competition architecture

The competition expansion follows the project architecture rules well:

- Provider data remains isolated in `src/lib/fixtures/football-data.ts`.
- The application uses `competitions` and `matches.competition_id`.
- Commercial API details do not reach the browser.
- Schema changes are implemented through migrations.
- Existing World Cup data remains reachable through archived competition views.

This is the right level of abstraction for football today without prematurely creating a generic multi-sport engine.

#### Competition-scoped rankings

The new leaderboard function correctly distinguishes between:

- Current active competitions.
- A specific competition.
- Archived competitions.

That prevents an old tournament from permanently defining the main leaderboard while still allowing historical results to be revisited.

#### Stronger prediction flow

The prediction experience now includes:

- Score prediction.
- Prediction styles such as Head, Heart, Chaos, and Underdog.
- Optional reasoning.
- AI verdicts.
- Optional safe roasts.
- Prediction editing before kickoff.
- Knockout penalty-advance picks.
- A next-match continuation prompt.

This is a good foundation for habit formation because the product rewards the user immediately after making a prediction.

#### Social and return mechanics

The application now has several useful retention primitives:

- Prediction streaks.
- Results recap.
- Leaderboards.
- Private leagues.
- Share cards.
- Push reminders.
- Result notifications.
- PWA installation.
- Vercel Analytics.

These features support a genuine social prediction product rather than a static fixture browser.

### Risks and areas to watch

#### “Global” leaderboard ambiguity

The default leaderboard excludes archived competitions, while profiles and historical predictions can still include them. A user may therefore see totals on their profile that differ from the visible leaderboard.

The UI should explicitly distinguish:

- Current season.
- Active competitions.
- Competition leaderboard.
- All-time history.
- Archived tournaments.

#### Standings should be labelled unofficial

`src/lib/standings.ts` derives tables from stored match results. It does not model every provider-specific rule, including point deductions, postponed games, or unusual tie-break rules.

The UI should use wording such as “FanBrain table” or “Unofficial table” so it does not appear to be an official competition records source.

#### Homepage information density

The homepage currently includes the hero, next action, competition leaders, sharing, live matches, upcoming matches, and results recap. This is useful content, but the hierarchy is crowded, particularly on mobile.

The primary action—making the next prediction—should remain visually dominant.

#### Prediction form has many decisions before the payoff

The user currently encounters score selection, prediction style, optional reasoning, saving, AI verdicts, roasts, and push opt-in. This creates depth, but also friction.

The score should be the required first step. Style, reasoning, roast, and notification opt-in should feel like optional enrichment around the main action.

#### Six-item mobile navigation

The current mobile navigation contains Home, Matches, Picks, Board, Leagues, and Profile. All are valid destinations, but six bottom-navigation items create visual and cognitive density.

Leagues and Profile are lower-frequency destinations than Matches and Picks. A “More” destination could contain Leagues, Profile, notifications, and settings.

## UX and UI recommendations

### Priority 1: Make the next prediction impossible to miss

The home page should begin with a personalised action card for signed-in users:

> Your next pick: Arsenal vs Chelsea
> Closes in 3h 24m
> You have predicted 4 of your last 6 matches

The card should include a clear countdown, competition label, team badges, and one primary button: “Make your pick”.

For users with no upcoming prediction opportunity, show the next best action:

- Review your latest result.
- Join a league.
- Finish your fan profile.
- Invite a rival.

### Priority 2: Make the AI reaction the emotional reward

After saving a prediction, the interface should immediately focus attention on the AI verdict. The preferred flow is:

1. Select score.
2. Save prediction.
3. Reveal AI verdict.
4. Offer roast mode and reasoning as optional follow-ups.

The user should never be unsure whether their prediction was saved or what they should do next.

### Priority 3: Add persistent progress

The product needs a visible season journey. Useful progress indicators include:

- Predictions made this week.
- Current correct-call streak.
- Best streak.
- Exact scores.
- Points needed to overtake the next rival.
- Distance to the next milestone.
- Competition rank movement.

This transforms isolated match interactions into an ongoing personal campaign.

Example:

> You are 7 points behind Sam. One exact score puts you ahead.

### Priority 4: Make results more social

Results should not only report points. They should explain movement and create a reason to share:

- “You moved up 12 places.”
- “You were one of only 8 fans to call this result.”
- “Your friend beat you by 3 points this round.”
- “Your Chaos streak is now 4 matches.”

These messages should lead directly to share cards or league comparisons.

### Priority 5: Strengthen private leagues

Private leagues are likely to become the strongest long-term retention surface. Recommended improvements:

- League-specific upcoming fixtures.
- Weekly league rounds.
- Rival comparison.
- Position-change notifications.
- Weekly awards such as “Best Call”, “Biggest Climber”, and “Chaos Merchant”.
- League season summaries.
- Custom league badges or colour themes.
- One-tap invite sharing.

The league page should feel like an active group room, not only a table of standings.

### Priority 6: Improve competition context

Competition filters should explain what the user is seeing. For example:

> Showing 24 upcoming matches across Premier League and Champions League.

Archived competitions should be clearly identified as history:

> World Cup 2026 archive

Avoid making active seasons and past tournaments look equivalent.

### Priority 7: Reduce mobile navigation density

Consider changing the bottom navigation to:

- Home.
- Matches.
- My Picks.
- Leaderboard.
- More.

Place Leagues, Profile, notifications, and settings within More. This gives the primary prediction loop more room and improves thumb-level clarity.

### Priority 8: Improve empty states

Empty states should always provide an action. Examples:

- No upcoming matches: “Follow a competition” or “Browse archived results”.
- No predictions: “Make your first pick”.
- No league memberships: “Create a league” or “Join friends”.
- No profile yet: “Make three predictions to unlock your fan profile”.

Avoid dead-end messages that only describe the absence of data.

## Retention strategy

The highest-value retention system is a combination of:

1. Upcoming-match reminders.
2. Immediate AI feedback.
3. Visible prediction streaks.
4. Rival and league movement.
5. Weekly milestones.
6. Shareable identity moments.

Push notifications should be selective and useful rather than frequent. Good notification types include:

- A match deadline reminder.
- Your result is ready.
- You moved up in your league.
- A rival overtook you.
- Your streak is at risk.
- Your new personality insight is ready.

The notification should deep-link directly to the relevant screen and action.

## Subscription opportunities

The subscription should add depth without removing the free product’s core fun. Strong premium candidates include:

- Advanced prediction history.
- Streak and form analytics.
- AI season reviews.
- Deeper fan-personality evolution.
- Private-league analytics.
- Rival tracking.
- Custom AI roast modes.
- Exclusive profile themes and share cards.
- Early access to new competitions.

The basic prediction loop, core leaderboard, and basic AI verdict should remain accessible. Those features drive acquisition and habit formation.

The most credible premium promise is not “pay to predict”. It is:

> Understand your football brain more deeply, compete more closely, and express your fan identity.

## Merchandise opportunities

Merchandise becomes more compelling once personality types feel memorable and earned through behaviour. Potential identities include:

- The Chaos Merchant.
- The Tactical Oracle.
- The Loyalist.
- The Contrarian.
- The Crisis Predictor.

These can become profile badges, share-card motifs, stickers, shirts, caps, or limited competition drops.

The product should first establish that users care about the identity. Merchandise should follow demonstrated demand rather than precede it.

## Recommended sequence

### Now

- Resolve the Serwist production build failure.
- Clarify active versus all-time leaderboard totals.
- Label derived standings as unofficial.
- Make the next prediction the dominant home-page action.
- Reduce the prediction form’s perceived friction.

### Next

- Add persistent progress and milestone cards.
- Add rank movement and rival messaging.
- Improve private leagues with weekly competition and awards.
- Add stronger empty states and competition context.
- Reconsider the six-item mobile navigation.

### Later

- Add premium analytics and deeper personality reports.
- Add custom profile/share themes.
- Test paid league tools.
- Test limited personality-led merchandise.

## Final assessment

The recent work is directionally strong and gives FanBrain AI a much more defensible product shape. The app already has the ingredients for a sticky football prediction community.

The biggest opportunity is not another data source or another isolated AI feature. It is making users feel that every prediction contributes to a visible personal story and a live social contest.

That should guide the next product phase.
