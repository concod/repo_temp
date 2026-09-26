--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co liquibase:get_vendor_details stripComments:false splitStatements:false context:Release_1_1 runOnChange:true labels:liquibase_project_start
--comment: initial changeset for get_vendor_details
DROP FUNCTION IF EXISTS source_smart.get_vendor_details(character varying, character varying, character varying, date, date);

CREATE FUNCTION source_smart.get_vendor_details(p_vendor_id character varying, p_vendor_group character varying DEFAULT NULL::character varying, p_country character varying DEFAULT NULL::character varying, p_time_period_start date DEFAULT NULL::date, p_time_period_end date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE sql
    AS $$
WITH vm AS (
    SELECT *
    FROM source_smart.vendor_master
    WHERE vendor_id = p_vendor_id
      AND (p_country IS NULL OR vendor_master.country = p_country)
      AND (p_vendor_group IS NULL OR p_vendor_group = ANY(vendor_master.vendor_group))
)
, capacity_cte AS (
    SELECT 
        vc.v_capacity_id,
        vc.vendor_id,
        vc.monthly_capacity,
        vc.valid_from_date,
        vc.valid_to_date
    FROM source_smart.vendor_capacity vc
    JOIN vm ON vm.vendor_id = vc.vendor_id
    WHERE (p_time_period_start IS NULL OR p_time_period_end IS NULL
           OR (vc.valid_from_date >= p_time_period_start 
               AND vc.valid_to_date   <= p_time_period_end))
)
, construction_types_cte AS (
    SELECT 
        cm.type_name AS construction_type,
        SUM(fctc.monthly_capacity::real) AS monthly_capacity
    FROM source_smart.facility_construction_type_capacity fctc
    JOIN source_smart.facility_master fm ON fctc.facility_id = fm.facility_id
    JOIN vm ON fm.vendor_id = vm.vendor_id
    JOIN source_smart.construction_type_master cm ON cm.construction_type_id = fctc.construction_type_id
    GROUP BY cm.type_name
)
, past_seasons_cte AS (
    SELECT sm.season_name
    FROM source_smart.season_master sm
    JOIN source_smart.production_history ph ON sm.season_id = ph.season_id
    JOIN vm ON vm.vendor_id = ph.vendor_id
)
, performance_cte AS (
    SELECT 
        vs.performance_score_90d::real,
        vs.otif_score_90d::real,
        vs.quality_score_90d::real,
        vs.fill_rate_score_90d::real,
        vs.schedule_adherence_90d::real,
		vs.week_start_date
    FROM (
        SELECT vs.*,
               ROW_NUMBER() OVER (PARTITION BY vs.vendor_id ORDER BY vs.week_start_date DESC) AS seq
        FROM source_smart.vendor_summary_by_construction_type_weekly vs
        JOIN vm ON vs.vendor_id = vm.vendor_id
        WHERE (p_time_period_start IS NULL OR p_time_period_end IS NULL
               OR vs.week_start_date BETWEEN p_time_period_start AND p_time_period_end)
    ) vs
    WHERE seq = 1
)
, facilities_cte AS (
    SELECT 
        fsw.facility_id,
        fsw.week_start_date,
        fsw.facility_name,
        fsw.country,
        fsw.performance_score_90d::real,
        fsw.utilization_90d::real,
        fsw.geo_political_risk::real,
        fsw.store_code
    FROM (
        SELECT fsw.*,
               ROW_NUMBER() OVER (PARTITION BY fsw.facility_id ORDER BY fsw.week_start_date DESC) AS seq
        FROM source_smart.facility_summary_weekly fsw
        JOIN vm ON fsw.vendor_id = vm.vendor_id
        WHERE (p_time_period_start IS NULL OR p_time_period_end IS NULL
               OR fsw.week_start_date BETWEEN p_time_period_start AND p_time_period_end)
    ) fsw
    WHERE seq = 1
)
SELECT jsonb_build_object(
    'vendor_id',          p_vendor_id,
    'capacities',         COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM capacity_cte c), '[]'::jsonb),
    'construction_types', COALESCE((SELECT jsonb_agg(to_jsonb(ct)) FROM construction_types_cte ct), '[]'::jsonb),
    'past_seasons',       COALESCE((SELECT jsonb_agg(ps.season_name ORDER BY ps.season_name DESC) FROM past_seasons_cte ps), '[]'::jsonb),
    'performance',        COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM performance_cte p), '[]'::jsonb),
    'facilities',         COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM facilities_cte f), '[]'::jsonb)
);
$$;

--changeset genuine.basil@impactanalytics.co liquibase:get_vendor_details_v2 stripComments:false splitStatements:false context:Release_1_1 runOnChange:true labels:liquibase_project_start
--comment: add distinct in past_seasons_cte
DROP FUNCTION IF EXISTS source_smart.get_vendor_details(character varying, character varying, character varying, date, date);

CREATE FUNCTION source_smart.get_vendor_details(p_vendor_id character varying, p_vendor_group character varying DEFAULT NULL::character varying, p_country character varying DEFAULT NULL::character varying, p_time_period_start date DEFAULT NULL::date, p_time_period_end date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE sql
    AS $$
WITH vm AS (
    SELECT *
    FROM source_smart.vendor_master
    WHERE vendor_id = p_vendor_id
      AND (p_country IS NULL OR vendor_master.country = p_country)
      AND (p_vendor_group IS NULL OR p_vendor_group = ANY(vendor_master.vendor_group))
)
, capacity_cte AS (
    SELECT 
        vc.v_capacity_id,
        vc.vendor_id,
        vc.monthly_capacity,
        vc.valid_from_date,
        vc.valid_to_date
    FROM source_smart.vendor_capacity vc
    JOIN vm ON vm.vendor_id = vc.vendor_id
    WHERE (p_time_period_start IS NULL OR p_time_period_end IS NULL
           OR (vc.valid_from_date >= p_time_period_start 
               AND vc.valid_to_date   <= p_time_period_end))
)
, construction_types_cte AS (
    SELECT 
        cm.type_name AS construction_type,
        SUM(fctc.monthly_capacity::real) AS monthly_capacity
    FROM source_smart.facility_construction_type_capacity fctc
    JOIN source_smart.facility_master fm ON fctc.facility_id = fm.facility_id
    JOIN vm ON fm.vendor_id = vm.vendor_id
    JOIN source_smart.construction_type_master cm ON cm.construction_type_id = fctc.construction_type_id
    GROUP BY cm.type_name
)
, past_seasons_cte AS (
    SELECT DISTINCT sm.season_name
    FROM source_smart.season_master sm
    JOIN source_smart.production_history ph ON sm.season_id = ph.season_id
    JOIN vm ON vm.vendor_id = ph.vendor_id
)
, performance_cte AS (
    SELECT 
        vs.performance_score_90d::real,
        vs.otif_score_90d::real,
        vs.quality_score_90d::real,
        vs.fill_rate_score_90d::real,
        vs.schedule_adherence_90d::real,
		vs.week_start_date
    FROM (
        SELECT vs.*,
               ROW_NUMBER() OVER (PARTITION BY vs.vendor_id ORDER BY vs.week_start_date DESC) AS seq
        FROM source_smart.vendor_summary_by_construction_type_weekly vs
        JOIN vm ON vs.vendor_id = vm.vendor_id
        WHERE (p_time_period_start IS NULL OR p_time_period_end IS NULL
               OR vs.week_start_date BETWEEN p_time_period_start AND p_time_period_end)
    ) vs
    WHERE seq = 1
)
, facilities_cte AS (
    SELECT 
        fsw.facility_id,
        fsw.week_start_date,
        fsw.facility_name,
        fsw.country,
        fsw.performance_score_90d::real,
        fsw.utilization_90d::real,
        fsw.geo_political_risk::real,
        fsw.store_code
    FROM (
        SELECT fsw.*,
               ROW_NUMBER() OVER (PARTITION BY fsw.facility_id ORDER BY fsw.week_start_date DESC) AS seq
        FROM source_smart.facility_summary_weekly fsw
        JOIN vm ON fsw.vendor_id = vm.vendor_id
        WHERE (p_time_period_start IS NULL OR p_time_period_end IS NULL
               OR fsw.week_start_date BETWEEN p_time_period_start AND p_time_period_end)
    ) fsw
    WHERE seq = 1
)
SELECT jsonb_build_object(
    'vendor_id',          p_vendor_id,
    'capacities',         COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM capacity_cte c), '[]'::jsonb),
    'construction_types', COALESCE((SELECT jsonb_agg(to_jsonb(ct)) FROM construction_types_cte ct), '[]'::jsonb),
    'past_seasons',       COALESCE((SELECT jsonb_agg(ps.season_name ORDER BY ps.season_name DESC) FROM past_seasons_cte ps), '[]'::jsonb),
    'performance',        COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM performance_cte p), '[]'::jsonb),
    'facilities',         COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM facilities_cte f), '[]'::jsonb)
);
$$;