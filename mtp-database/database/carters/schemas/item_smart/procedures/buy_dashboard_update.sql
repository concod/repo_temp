--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:get_tableau_summary runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_buy_dashboard_update
--comment: initial changeset for buy_dashboard_update
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS item_smart.buy_dashboard_update(IN ingestion_type TEXT, IN mode_type TEXT);

CREATE OR REPLACE PROCEDURE item_smart.buy_dashboard_update(IN ingestion_type text, IN mode_type text)
 LANGUAGE plpgsql
AS $procedure$
BEGIN
    -- Validate input
    IF ingestion_type NOT IN ('daily', 'weekly') THEN
        RAISE EXCEPTION 'Invalid ingestion_type: %, expected ''daily'' or ''weekly''.', ingestion_type;
    END IF;

    IF mode_type NOT IN ('historic', 'periodic') THEN
        RAISE EXCEPTION 'Invalid mode_type: %, expected ''historic'' or ''periodic''.', mode_type;
    END IF;

    -- Handle HISTORIC MODE
    IF mode_type = 'historic' THEN
		 TRUNCATE TABLE item_smart.buystatus_master;
         INSERT INTO item_smart.buystatus_master (
            dept,
            channel,
            hierarchy_code,
            season,
            total_receipt_units,
            status_value,
            status_last_week
        )
        WITH season_week_mapping AS (
            SELECT DISTINCT sm.name AS season
            FROM global.fiscal_date_mapping f
            JOIN global.season_master sm
              ON f.fiscal_week_begin_date BETWEEN sm.season_start_date AND sm.season_end_date
            WHERE f.calendar_date > CURRENT_DATE - INTERVAL '1 YEAR'
              AND f.calendar_date < CURRENT_DATE + INTERVAL '2 YEAR 3 MONTHS'
        ),
        hier AS (
            SELECT l0_name as dept,l1_name as channel, hierarchy_code
            FROM  item_smart.mv_product_hierarchies_filter mphf
            WHERE mphf.country = 'USA' 
        ),
        base_data AS (
            SELECT h.dept, h.channel, h.hierarchy_code, s.season
            FROM hier h
            CROSS JOIN season_week_mapping s
            GROUP BY 1, 2, 3, 4
        )
        SELECT 
            b.dept,
            b.channel,
            b.hierarchy_code,
            b.season,
            0::FLOAT,
            'Initial',
            'Initial'
        FROM base_data b
        ON CONFLICT (dept, channel, hierarchy_code, season)
        DO UPDATE SET
            total_receipt_units = EXCLUDED.total_receipt_units,
            status_value = EXCLUDED.status_value,
            status_last_week = EXCLUDED.status_last_week;
    END IF;

    -- Handle PERIODIC MODE
    IF mode_type = 'periodic' THEN
        INSERT INTO item_smart.buystatus_master (
            dept,
            channel,
            hierarchy_code,
            season,
            total_receipt_units,
            status_value,
            status_last_week
        )
        WITH season_week_mapping AS (
            SELECT DISTINCT sm.name AS season
            FROM global.fiscal_date_mapping f
            JOIN global.season_master sm
              ON f.fiscal_week_begin_date BETWEEN sm.season_start_date AND sm.season_end_date
            WHERE f.calendar_date > CURRENT_DATE - INTERVAL '1 YEAR'
              AND f.calendar_date < CURRENT_DATE + INTERVAL '2 YEAR 3 MONTHS'
        ),
        hier AS (
            SELECT l0_name as dept,l1_name as channel, hierarchy_code
            FROM  item_smart.mv_product_hierarchies_filter mphf
            WHERE mphf.country = 'USA' 
        ),
        base_data AS (
            SELECT h.dept, h.channel, h.hierarchy_code, s.season
            FROM hier h
            CROSS JOIN season_week_mapping s
            GROUP BY 1, 2, 3, 4
        )
        SELECT 
            b.dept,
            b.channel,
            b.hierarchy_code,
            b.season,
            0::FLOAT,
            COALESCE(e.status_value, 'Initial'),
            CASE
                WHEN ingestion_type = 'weekly' THEN COALESCE(e.status_value, 'Initial')
                WHEN ingestion_type = 'daily' THEN COALESCE(e.status_last_week, 'Initial')
                ELSE 'Initial'
            END
        FROM base_data b
        LEFT JOIN item_smart.buystatus_master e
          ON b.hierarchy_code = e.hierarchy_code
         AND b.season = e.season
         AND b.dept = e.dept
         AND b.channel = e.channel
        ON CONFLICT (dept, channel, hierarchy_code, season)
        DO UPDATE SET
            status_value = EXCLUDED.status_value,
            status_last_week = EXCLUDED.status_last_week;
    END IF;

END;
$procedure$;