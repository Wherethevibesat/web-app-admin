-- Time-windowed leaderboard (weekly / seasonal) from the points ledger
-- Run after 032_rewards.sql
--
-- All-time rank still lives in user_rankings; this aggregates positive point
-- events within a rolling window so we can show "This week" boards without a reset.

CREATE OR REPLACE FUNCTION public.leaderboard_window(
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 25
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  profile_image_url TEXT,
  points BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pe.user_id, u.name, u.profile_image_url, SUM(pe.points)::BIGINT AS points
  FROM public.points_events pe
  JOIN public.users u ON u.id = pe.user_id
  WHERE pe.points > 0
    AND pe.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY pe.user_id, u.name, u.profile_image_url
  HAVING SUM(pe.points) > 0
  ORDER BY points DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.leaderboard_window(INTEGER, INTEGER) TO authenticated, anon;

-- ========== SAMPLE PLATFORM REWARDS (only if catalog is empty) ==========
-- Safe demo data so the rewards catalog works end-to-end. Remove or edit freely.
INSERT INTO public.rewards (title, description, reward_type, cost_points, terms)
SELECT * FROM (VALUES
  ('Skip the line', 'Walk past the queue at any participating venue tonight.', 'perk', 500, 'Subject to venue capacity. Valid same night.'),
  ('$5 off your tab', 'Take $5 off your bill at participating venues.', 'discount', 750, 'One per visit. Cannot combine with other offers.'),
  ('Free welcome drink', 'Redeem a house drink on arrival.', 'free_item', 1000, 'Must be 21+. Valid ID required.'),
  ('VIP table for the night', 'Reserved VIP seating for you and your crew.', 'experience', 5000, 'Reservations subject to availability.')
) AS v(title, description, reward_type, cost_points, terms)
WHERE NOT EXISTS (SELECT 1 FROM public.rewards);
