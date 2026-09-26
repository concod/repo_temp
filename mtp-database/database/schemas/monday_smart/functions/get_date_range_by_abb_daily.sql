--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:get_date_range_by_abb_daily_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding lm, llm, lq, llq support
--rollback: SELECT 1

DROP FUNCTION IF EXISTS monday_smart.get_date_range_by_abb_daily(text, text);

CREATE FUNCTION monday_smart.get_date_range_by_abb_daily(input text, geo text)
 RETURNS TABLE(start_date date, end_date date, start_fw integer, end_fw integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  trailing_weeks_count INTEGER;
  anchor_date DATE;

  -- validated / resolved geo
  effective_geo   TEXT;
  cfg_default_geo TEXT;

BEGIN
  SELECT last_refresh_date::date
  INTO anchor_date
  FROM monday_smart.refresh_date
  ORDER BY last_refresh_date DESC
  LIMIT 1;

  IF anchor_date IS NULL THEN
    RAISE EXCEPTION 'Refresh date not found: monday_smart.refresh_date is empty or last_refresh_date is NULL.';
  END IF;

  -- normalize incoming geo
  effective_geo := NULLIF(BTRIM($2), '');

  -- if missing or not present in the calendar, use default from app-config
  IF effective_geo IS NULL
     OR NOT EXISTS (
           SELECT 1
           FROM monday_smart.fc_fy_fw_level_v2 x
           WHERE x.geo = effective_geo
           LIMIT 1
         )
  THEN
    -- pull default from application config
    SELECT data->>'default'
    INTO cfg_default_geo
    FROM monday_smart.application_config
    WHERE name = 'geo_config'
    LIMIT 1;

    -- hard error if default missing/blank
    IF cfg_default_geo IS NULL OR cfg_default_geo = '' THEN
      RAISE EXCEPTION
        'Geo default is missing in application config (name=geo_config, data.default).';
    END IF;

    -- ensure configured default exists
    IF NOT EXISTS (
         SELECT 1 FROM monday_smart.fc_fy_fw_level_v2 x
         WHERE x.geo = cfg_default_geo
         LIMIT 1
       )
    THEN
      RAISE EXCEPTION
        'Configured default Geo "%" not found in fc_fy_fw_level_v2.', cfg_default_geo;
    END IF;

    effective_geo := cfg_default_geo;
  END IF;

  -- Last Week
  IF input = 'lw' THEN
    RETURN QUERY
    SELECT
      x.fw_start_date,
      x.fw_end_date,
      x.fw_id,
      x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x
    JOIN (
      SELECT prev_fw
      FROM monday_smart.fc_fy_fw_level_v2 y
      WHERE y."date" = anchor_date
        AND y.geo     = effective_geo
      LIMIT 1
    ) p ON x.fw_id = p.prev_fw
    WHERE x.geo = effective_geo
    GROUP BY 1,2,3,4;

  -- Week To Date
  ELSIF input = 'wtd' THEN
    RETURN QUERY
    SELECT
      a.fw_start_date,
      anchor_date,
      a.fw_id,
      a.fw_id
    FROM (
      SELECT fw_start_date, fw_id
      FROM monday_smart.fc_fy_fw_level_v2 z
      WHERE z."date" = anchor_date
        AND z.geo     = effective_geo
      LIMIT 1
    ) AS a
    GROUP BY 1,2,3,4;

  -- Previous Day (anchor_date - 1)
  ELSIF input = 'pd' THEN
    RETURN QUERY
    SELECT
      a."date",
      a."date",
      a.fw_id,
      a.fw_id
    FROM (
      SELECT "date", fw_id
      FROM monday_smart.fc_fy_fw_level_v2 x
      WHERE x."date" = anchor_date - 1
        AND x.geo     = effective_geo
      LIMIT 1
    ) AS a
    GROUP BY 1,2,3,4;

  -- Last Day (anchor_date)
  ELSIF input = 'ld' THEN
    RETURN QUERY
    SELECT
      a."date",
      a."date",
      a.fw_id,
      a.fw_id
    FROM (
      SELECT "date", fw_id
      FROM monday_smart.fc_fy_fw_level_v2 x
      WHERE x."date" = anchor_date
        AND x.geo     = effective_geo
      LIMIT 1
    ) AS a
    GROUP BY 1,2,3,4;

  -- Exact week id, e.g. 202434
  ELSIF input ~ '^\d{6}$' THEN
    RETURN QUERY
    SELECT
      MIN(x.fw_start_date),
      MAX(x.fw_end_date),
      MIN(x.fw_id),
      MAX(x.fw_id)
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x.fw_id = input::INTEGER
      AND x.geo   = effective_geo;

  -- Month string, e.g. 'July 2025'
  ELSIF input ~ '^[A-Za-z]+ \d{4}$' THEN
    RETURN QUERY
    SELECT
      MIN(t.fw_start_date),
      MAX(t.fw_end_date),
      MIN(t.fw_id),
      MAX(t.fw_id)
    FROM monday_smart.fc_fy_fw_level_v2 t
    WHERE t.geo = effective_geo
      AND t.fm_id = (
        SELECT u.fm_id
        FROM monday_smart.fc_fy_fw_level_v2 u
        WHERE u."date" = (TO_DATE(input, 'Month YYYY') + INTERVAL '15 days')::DATE
          AND u.geo     = effective_geo
        LIMIT 1
      );

  -- Fiscal YTD
  ELSIF input = 'ytd' THEN
    RETURN QUERY
    SELECT
      x.fy_start_date,
      anchor_date,
      (
        SELECT MIN(fw_id)
        FROM monday_smart.fc_fy_fw_level_v2 yy
        WHERE yy.fy = x.fy AND yy.geo = effective_geo
      ) AS start_fw,
      (
        SELECT fw_id
        FROM monday_smart.fc_fy_fw_level_v2 ee
        WHERE ee."date" = anchor_date AND ee.geo = effective_geo
        LIMIT 1
      ) AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x."date" = anchor_date
      AND x.geo     = effective_geo
    LIMIT 1;

  -- Fiscal QTD
  ELSIF input = 'qtd' THEN
    RETURN QUERY
    SELECT
      x.fq_start_date,
      anchor_date,
      (
        SELECT MIN(fw_id)
        FROM monday_smart.fc_fy_fw_level_v2 qq
        WHERE qq.fq_id = x.fq_id AND qq.geo = effective_geo
      ) AS start_fw,
      (
        SELECT fw_id
        FROM monday_smart.fc_fy_fw_level_v2 ee
        WHERE ee."date" = anchor_date AND ee.geo = effective_geo
        LIMIT 1
      ) AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x."date" = anchor_date
      AND x.geo     = effective_geo
    LIMIT 1;

  -- Fiscal MTD
  ELSIF input = 'mtd' THEN
    RETURN QUERY
    SELECT
      x.fm_start_date,
      anchor_date,
      (
        SELECT MIN(fw_id)
        FROM monday_smart.fc_fy_fw_level_v2 mm
        WHERE mm.fm_id = x.fm_id AND mm.geo = effective_geo
      ) AS start_fw,
      (
        SELECT fw_id
        FROM monday_smart.fc_fy_fw_level_v2 ee
        WHERE ee."date" = anchor_date AND ee.geo = effective_geo
        LIMIT 1
      ) AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x."date" = anchor_date
      AND x.geo     = effective_geo
    LIMIT 1;

  -- Last-to-last week (two weeks back)
  ELSIF input = 'llw' THEN
    RETURN QUERY
    SELECT
      x.fw_start_date,
      x.fw_end_date,
      x.fw_id,
      x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x
    JOIN (
      SELECT y.prev_fw AS llw_fw
      FROM monday_smart.fc_fy_fw_level_v2 y
      WHERE y.fw_id = (
        SELECT r.prev_fw
        FROM monday_smart.fc_fy_fw_level_v2 r
        WHERE r."date" = anchor_date
          AND r.geo     = effective_geo
        LIMIT 1
      )
        AND y.geo = effective_geo
      LIMIT 1
    ) p ON x.fw_id = p.llw_fw
    WHERE x.geo = effective_geo
    GROUP BY 1,2,3,4;

  -- Trailing_N_weeks (e.g., trailing_8_weeks)
  ELSIF input ~ '^trailing_\d+_weeks$' THEN
    trailing_weeks_count := (regexp_match(input, 'trailing_(\d+)_weeks'))[1]::INTEGER;

    RETURN QUERY
    SELECT
      MIN(a.start_date),
      MAX(a.end_date),
      MIN(a.fw),
      MAX(a.fw)
    FROM (
      SELECT DISTINCT
        fdm.fiscal_year_week::INT AS fw,
        fdm.fiscal_week_begin_date AS start_date,
        fdm.fiscal_week_end_date   AS end_date
      FROM monday_smart.fiscal_date_mapping fdm
      WHERE fdm.geo    = effective_geo
        AND fdm."date" >= anchor_date - 1000
        AND fdm."date" <= anchor_date - 7   -- last full week boundary
      GROUP BY 1,2,3
      ORDER BY 1 DESC
      LIMIT trailing_weeks_count
    ) AS a;

  -- Week range string: 'YYYYWW-YYYYWW'
  ELSIF input ~ '^\d{6}-\d{6}$' THEN
    RETURN QUERY
    SELECT
      MIN(a.fw_start_date),
      MAX(a.fw_end_date),
      MIN(a.fw_id),
      MAX(a.fw_id)
    FROM monday_smart.fc_fy_fw_level_v2 AS a
    WHERE a.geo  = effective_geo
      AND a.fw_id BETWEEN CAST(LEFT(TRIM(input), 6) AS INT)
                      AND CAST(RIGHT(TRIM(input), 6) AS INT);

  -- Trailing N days (e.g., trailing_14_days) -> [anchor_date-(N-1), anchor_date]

  ELSIF input ~ '^trailing_\d+_days$' THEN
  RETURN QUERY
  WITH p AS (
    SELECT
      (anchor_date - (((regexp_match(input, 'trailing_(\d+)_days'))[1])::int - 1))::date AS start_dt,
      anchor_date AS end_dt
  )
  SELECT
    p.start_dt,
    p.end_dt,
    (SELECT MIN(fw_id)
     FROM monday_smart.fc_fy_fw_level_v2 t
     WHERE t.geo = effective_geo
       AND t."date" BETWEEN p.start_dt AND p.end_dt),
    (SELECT MAX(fw_id)
     FROM monday_smart.fc_fy_fw_level_v2 t
     WHERE t.geo = effective_geo
       AND t."date" BETWEEN p.start_dt AND p.end_dt)
  FROM p;


  -- Same day last week (anchor_date - 7)
  ELSIF input = 'same_day_lw' THEN
    RETURN QUERY
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x.geo = effective_geo AND x."date" = anchor_date - 7
    LIMIT 1;

  -- Same day last-to-last week (anchor_date - 14)
  ELSIF input = 'same_day_llw' THEN
    RETURN QUERY
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x.geo = effective_geo AND x."date" = anchor_date - 14
    LIMIT 1;

  -- ---------- last_<weekday> (most recent occurrence on/before anchor_date) ----------
  -- helper formula: last_weekday = anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - <isodow> + 7) % 7)

  ELSIF input = 'last_monday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 1 + 7) % 7))::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_tuesday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 2 + 7) % 7))::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_wednesday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 3 + 7) % 7))::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_thursday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 4 + 7) % 7))::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_friday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 5 + 7) % 7))::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_saturday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 6 + 7) % 7))::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_sunday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 7 + 7) % 7))::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  -- ---------- last_to_last_<weekday> (one week earlier) ----------

  ELSIF input = 'last_to_last_monday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 1 + 7) % 7) - 7)::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_to_last_tuesday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 2 + 7) % 7) - 7)::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_to_last_wednesday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 3 + 7) % 7) - 7)::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_to_last_thursday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 4 + 7) % 7) - 7)::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_to_last_friday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 5 + 7) % 7) - 7)::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_to_last_saturday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 6 + 7) % 7) - 7)::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSIF input = 'last_to_last_sunday' THEN
    RETURN QUERY
    WITH d AS (
      SELECT (anchor_date - ((EXTRACT(ISODOW FROM anchor_date)::int - 7 + 7) % 7) - 7)::date AS dt
    )
    SELECT x."date", x."date", x.fw_id, x.fw_id
    FROM monday_smart.fc_fy_fw_level_v2 x JOIN d ON x."date" = d.dt
    WHERE x.geo = effective_geo
    LIMIT 1;

  ELSEIF input = 'lm' THEN
	RETURN QUERY
	SELECT min(x.fm_start_date), max(x.fm_end_date), min(fw_id), max(fw_id)
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fm_id = (
		SELECT fm_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '1 months'
	) and x.geo = effective_geo;

  ELSEIF input = 'llm' THEN
	RETURN QUERY
	SELECT min(x.fm_start_date), max(x.fm_end_date), min(fw_id), max(fw_id)
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fm_id = (
		SELECT fm_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '2 months'
	) and x.geo = effective_geo;

  ELSEIF input = 'lq' THEN
	RETURN QUERY
	SELECT min(x.fq_start_date), max(x.fq_end_date), min(fw_id), max(fw_id)
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fq_id = (
		SELECT fq_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '3 months'
	) and x.geo = effective_geo;

  ELSEIF input = 'llq' THEN
	RETURN QUERY
	SELECT min(x.fq_start_date), max(x.fq_end_date), min(fw_id), max(fw_id)
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fq_id = (
		SELECT fq_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '6 months'
	) and x.geo = effective_geo;

  END IF;

END
$function$
;