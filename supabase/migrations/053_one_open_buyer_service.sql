-- Buyers may only have one live service request at a time.
-- Keep the most advanced open request per customer; close extras so the unique index can be created.
-- Status transitions: pending -> expired; matched/in_progress -> cancelled.

WITH ranked AS (
  SELECT
    id,
    status,
    row_number() OVER (
      PARTITION BY customer_id
      ORDER BY
        CASE status
          WHEN 'in_progress' THEN 0
          WHEN 'matched' THEN 1
          WHEN 'pending' THEN 2
          ELSE 3
        END,
        created_at DESC,
        id DESC
    ) AS rn
  FROM public.buyer_service_requests
  WHERE status IN ('pending', 'matched', 'in_progress')
)
UPDATE public.buyer_service_requests AS b
SET status = CASE WHEN b.status = 'pending' THEN 'expired' ELSE 'cancelled' END
FROM ranked AS r
WHERE b.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS buyer_service_requests_one_open_per_customer
  ON public.buyer_service_requests (customer_id)
  WHERE status IN ('pending', 'matched', 'in_progress');
