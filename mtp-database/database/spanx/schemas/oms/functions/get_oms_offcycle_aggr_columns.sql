--liquibase formatted sql
--changeset chandra.nil.ghosh:Added_get_oms_offcycle_aggr_columns_4 runOnChange:true stripComments:false splitStatements:false context:MTP-56850 labels:get_offcycle_columns_api
--comment: Created get_offcycle_columns_api function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_offcycle_aggr_columns(draft_id text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_offcycle_aggr_columns(draft_id text,  date_filter jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    weeks jsonb;
	start_week INT;
    result_json jsonb;
    v_query TEXT;
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
BEGIN
    /*
       Fetch DISTINCT fiscal weeks.
       Using DISTINCT ON ensures only unique fiscal_year_week values.
    */

 --------------------------------------------------------------------
    -- Parse date_filter if provided
    --------------------------------------------------------------------
    IF date_filter IS NOT NULL AND jsonb_typeof(date_filter) = 'array' THEN
        SELECT
            CASE WHEN df->>'start_date' <> '' THEN to_date(df->>'start_date','MM-DD-YYYY') END,
            CASE WHEN df->>'end_date' <> '' THEN to_date(df->>'end_date','MM-DD-YYYY') END
        INTO v_start_date, v_end_date
        FROM jsonb_array_elements(date_filter) AS t(df)
        WHERE df->>'attribute_name' = 'deep_dive_dates'
        LIMIT 1;
    END IF;

    --------------------------------------------------------------------
    -- Convert to fiscal week numbers
    --------------------------------------------------------------------
    IF v_start_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_start_week
        FROM global.fiscal_date_mapping fdm
        WHERE calendar_date = v_start_date LIMIT 1;
    END IF;

    IF v_end_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_end_week
        FROM global.fiscal_date_mapping fdm
        WHERE calendar_date = v_end_date LIMIT 1;
    END IF;


   SELECT jsonb_agg(to_jsonb(fw))
    INTO weeks
    FROM (
        SELECT DISTINCT fiscal_year_week
        FROM global.fiscal_date_mapping
        WHERE  date >= CURRENT_DATE
            AND (v_start_week IS NULL OR fiscal_year_week >= v_start_week)
            AND (v_end_week   IS NULL OR fiscal_year_week <= v_end_week)
        ORDER BY fiscal_year_week
        LIMIT 52
    ) AS fw;


    -- Build final API response
    RETURN jsonb_build_array(
               jsonb_build_object(
                   'column_name', 'metrics',
                   'label', 'Metrics'
               )
           )
           ||
           (
               SELECT jsonb_agg(
                   jsonb_build_object(
                       'column_name', (w->>'fiscal_year_week'),
                       'label',       (w->>'fiscal_year_week')
                   )
               )
               FROM jsonb_array_elements(weeks) w
           );
END;
$function$
;
