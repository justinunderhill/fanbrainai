-- Penalty shootout prediction: additive migration.
-- Lets a fan call which team advances on penalties for a level knockout pick. Mirrors
-- matches.winner_team_id so the same scoring helper grades both the predicted and actual
-- side. Purely additive: the new column is nullable (existing rows backfill to null) and
-- no existing column, policy, or grant is removed.

alter table public.predictions
  add column if not exists predicted_winner_team_id uuid references public.teams(id);

-- Authenticated fans may write the new column (additive; existing grants are unchanged).
grant insert (predicted_winner_team_id) on public.predictions to authenticated;
grant update (predicted_winner_team_id) on public.predictions to authenticated;

-- The kickoff lock must cover edits that only touch the advance pick, so re-create the
-- trigger with the new column in its `update of` list (recreating is idempotent).
drop trigger if exists prevent_late_prediction_trigger on public.predictions;
create trigger prevent_late_prediction_trigger
before insert or update of predicted_home_score, predicted_away_score, predicted_outcome, predicted_winner_team_id, prediction_style, user_reason
on public.predictions
for each row execute function public.prevent_late_prediction();
