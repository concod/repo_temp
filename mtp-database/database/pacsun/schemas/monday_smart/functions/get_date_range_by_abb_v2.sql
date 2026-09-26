--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:get_date_range_by_abb_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_date_range_by_abb_v2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS monday_smart.get_date_range_by_abb_v2(text, text, text);

CREATE OR REPLACE FUNCTION monday_smart.get_date_range_by_abb_v2(input text, geo text, anchor_date_inp text DEFAULT NULL::text)
 RETURNS TABLE(start_date date, end_date date, start_fw integer, end_fw integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  trailing_weeks_count INTEGER;
  effective_geo TEXT;
  cfg_default_geo TEXT;
  anchor_date DATE;
  anchor_date_db DATE;
BEGIN

  SELECT last_refresh_date::date
  INTO anchor_date_db
  FROM monday_smart.refresh_date
  ORDER BY last_refresh_date DESC
  LIMIT 1;

  IF $3::date IS NULL OR $3::date > anchor_date_db THEN
	  anchor_date := anchor_date_db;
  ELSE
	 SELECT $3::date into anchor_date;
  END IF;

  IF anchor_date IS NULL THEN
    RAISE EXCEPTION 'Refresh date not found: monday_smart.refresh_date is empty or last_refresh_date is NULL.';
  END IF;

  -- normalize incoming geo
  effective_geo := NULLIF(BTRIM($2), '');

  -- validate/fallback to default from application_config
  IF effective_geo IS NULL
     OR NOT EXISTS (
          SELECT 1
          FROM monday_smart.fc_fy_fw_level_v2 g
          WHERE g.geo = effective_geo
          LIMIT 1
        )
  THEN
    SELECT ac.data->>'default'
    INTO cfg_default_geo
    FROM monday_smart.application_config ac
    WHERE ac.name = 'geo_config'
    LIMIT 1;

    IF cfg_default_geo IS NULL OR cfg_default_geo = '' THEN
      RAISE EXCEPTION
        'Geo default is missing in application config (name=geo_config, data.default).';
    END IF;

    IF NOT EXISTS (
         SELECT 1 FROM monday_smart.fc_fy_fw_level_v2 g2
         WHERE g2.geo = cfg_default_geo
         LIMIT 1
       )
    THEN
      RAISE EXCEPTION
        'Configured default Geo "%" not found in monday_smart.fc_fy_fw_level_v2.', cfg_default_geo;
    END IF;

    effective_geo := cfg_default_geo;
  END IF;

  -- ================= BRANCHES =================

  IF $1 = 'lw' THEN
    RETURN QUERY
    SELECT
      x.fw_start_date,
      x.fw_end_date,
      x.fw_id AS start_fw,
      x.fw_id AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    JOIN (
      SELECT prev_fw
      FROM monday_smart.fc_fy_fw_level_v2 y
      WHERE date = anchor_date
        AND y. geo  = effective_geo
      LIMIT 1
    ) y ON x.fw_id = y.prev_fw
    WHERE x.geo = effective_geo
    GROUP BY 1,2,3,4;

  ELSIF $1 = 'ld' THEN
    RETURN QUERY
    SELECT
      a.fw_start_date,
      a.fw_end_date,
      a.fiscal_year_week AS start_fw,
      a.fiscal_year_week AS end_fw
    FROM (
      SELECT
        fiscal_year_week,
        date AS fw_start_date,
        date AS fw_end_date
      FROM monday_smart.fiscal_date_mapping y
      WHERE date = anchor_date - 1
        AND y. geo  = effective_geo
    ) AS a
    GROUP BY 1,2,3,4;

  ELSIF $1 ~ '^\d{6}$' THEN
    RETURN QUERY
    SELECT
      MIN(x.fw_start_date) AS fw_start_date,
      MAX(x.fw_end_date)   AS fw_end_date,
      MAX(x.fw_id)         AS start_fw,
      MAX(x.fw_id)         AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x.fw_id = $1::INTEGER
      AND x.geo   = effective_geo;

  ELSIF $1 ~ '^[A-Za-z]+ \d{4}$' THEN
    RETURN QUERY
    SELECT
      MIN(fw_start_date) AS fw_start_date,
      MAX(fw_end_date)   AS fw_end_date,
      MIN(fw_id)         AS start_fw,
      MAX(fw_id)         AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE x. geo = effective_geo
      AND fm_id = (
        SELECT fm_id
        FROM monday_smart.fc_fy_fw_level_v2 y
        WHERE date = (TO_DATE($1, 'Month YYYY') + INTERVAL '15 days')::DATE
          AND y. geo  = effective_geo
        LIMIT 1
      );

  ELSIF $1 = 'ytd' THEN
    RETURN QUERY
    SELECT
      fy_start_date,
      fw_end_date,
      (
        SELECT MIN(fw_id)
        FROM monday_smart.fc_fy_fw_level_v2 y
        WHERE fy  = x.fy
          AND y. geo = effective_geo
      ) AS start_fw,
      fw_id AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE date = anchor_date-7
      AND x. geo  = effective_geo;

  ELSIF $1 = 'qtd' THEN
    RETURN QUERY
    SELECT
      fq_start_date,
      fw_end_date,
      (
        SELECT MIN(fw_id)
        FROM monday_smart.fc_fy_fw_level_v2 y
        WHERE fq_id = x.fq_id
          AND y. geo   = effective_geo
      ) AS start_fw,
      fw_id AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE date = anchor_date-7
      AND x. geo  = effective_geo;

  ELSIF $1 = 'mtd' THEN
    RETURN QUERY
    SELECT
      fm_start_date,
      fw_end_date,
      (
        SELECT MIN(fw_id)
        FROM monday_smart.fc_fy_fw_level_v2 y
        WHERE fm_id = x.fm_id
          AND y. geo   = effective_geo
      ) AS start_fw,
      fw_id AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 x
    WHERE date = anchor_date-7
      AND x. geo  = effective_geo;

  ELSIF $1 = 'llw' THEN
    RETURN QUERY
    SELECT
      b.fw_start_date,
      b.fw_end_date,
      b.start_fw,
      b.end_fw
    FROM (
      SELECT
        last_to_last_fiscal_week AS start_fw,
        last_to_last_fiscal_week AS end_fw,
        MIN(fdm2."date") AS fw_start_date,
        MAX(fdm2."date") AS fw_end_date
      FROM (
        SELECT
          fdm.fiscal_year_week,
          MIN(fdm.fiscal_week_begin_date) AS fw_start_date,
          MIN(fdm.fiscal_week_end_date)   AS fw_end_date,
          LAG(fdm.fiscal_year_week, 2) OVER (ORDER BY fdm.fiscal_year_week) AS last_to_last_fiscal_week
        FROM "monday_smart".fiscal_date_mapping fdm
        WHERE fdm.date >= anchor_date - 100
          AND fdm.date <= anchor_date
          AND fdm.geo  = effective_geo
        GROUP BY 1
        ORDER BY 1 DESC
      ) AS a
      JOIN "monday_smart".fiscal_date_mapping fdm2
        ON fdm2.fiscal_year_week = a.last_to_last_fiscal_week
       AND fdm2.geo              = effective_geo
      GROUP BY 1,2
      ORDER BY 1 DESC
      LIMIT 1
    ) b;

  ELSIF input ~ '^trailing_\d+_weeks$' THEN
    -- Extract the number of weeks from the input
    trailing_weeks_count := (regexp_match(input, 'trailing_(\d+)_weeks'))[1]::INTEGER;

    RETURN QUERY
    SELECT
      MIN(a.start_date)          AS fw_start_date,
      MAX(a.end_date)            AS fw_end_date,
      MIN(a.fiscal_year_week)    AS start_fw,
      MAX(a.fiscal_year_week)    AS end_fw
    FROM (
      SELECT DISTINCT
        fiscal_year_week,
        fiscal_week_begin_date AS start_date,
        fiscal_week_end_date   AS end_date
      FROM monday_smart.fiscal_date_mapping fdm
      WHERE fdm.date >= anchor_date - 1000
        AND fdm.date <= anchor_date - 7
        AND fdm.geo  = effective_geo
      GROUP BY 1,2,3
      ORDER BY 1 DESC
      LIMIT trailing_weeks_count
    ) AS a;

  ELSIF $1 ~ '\d+-\d+' THEN
    RETURN QUERY
    SELECT
      MIN(a.fw_start_date) AS fw_start_date,
      MAX(a.fw_end_date)   AS fw_end_date,
      MIN(a.fw_id)         AS start_fw,
      MAX(a.fw_id)         AS end_fw
    FROM monday_smart.fc_fy_fw_level_v2 AS a
    WHERE a.geo = effective_geo
      AND a.fw_id IN (
        CAST(RIGHT(TRIM($1), 6) AS INT),
        CAST(LEFT(TRIM($1), 6)  AS INT)
      );


  ELSEIF input = 'lm' THEN
	RETURN QUERY
	SELECT min(x.fm_start_date) as fw_start_date
		, max(x.fm_end_date) as fw_end_date
		, min(fw_id) as start_fw
		, max(fw_id) as end_fw
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fm_id = (
		SELECT fm_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '1 months'
	) and x.geo = effective_geo;

  ELSEIF input = 'llm' THEN
	RETURN QUERY
	SELECT min(x.fm_start_date) as fw_start_date
		, max(x.fm_end_date) as fw_end_date
		, min(fw_id) as start_fw
		, max(fw_id) as end_fw
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fm_id = (
		SELECT fm_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '2 months'
	) and x.geo = effective_geo;

  ELSEIF input = 'lq' THEN
	RETURN QUERY
	SELECT min(x.fq_start_date) as fw_start_date
		, max(x.fq_end_date) as fw_end_date
		, min(fw_id) as start_fw
		, max(fw_id) as end_fw
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fq_id = (
		SELECT fq_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '3 months'
	) and x.geo = effective_geo;

  ELSEIF input = 'llq' THEN
	RETURN QUERY
	SELECT min(x.fq_start_date) as fw_start_date
		, max(x.fq_end_date) as fw_end_date
		, min(fw_id) as start_fw
		, max(fw_id) as end_fw
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE fq_id = (
		SELECT fq_id
		FROM
			monday_smart.fc_fy_fw_level_v2
		WHERE date = anchor_date - interval '6 months'
	) and x.geo = effective_geo;

  ELSEIF input = 'l5d'THEN
	RETURN QUERY
	SELECT min(date) as fw_start_date
		, max(date) as fw_end_date
		, min(fw_id) as start_fw
		, max(fw_id) as end_fw
	FROM monday_smart.fc_fy_fw_level_v2 x
	WHERE
		date >= anchor_date - 4	
		and date <= anchor_date
		and x.geo = effective_geo;

  END IF;

END
$function$
;
