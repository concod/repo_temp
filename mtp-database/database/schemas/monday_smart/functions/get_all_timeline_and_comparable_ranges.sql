--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:get_all_timeline_and_comparable_ranges runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updation of the if condition
--rollback: SELECT 1


DROP FUNCTION if exists monday_smart.get_all_timeline_and_comparable_ranges(varchar, bool);

CREATE FUNCTION monday_smart.get_all_timeline_and_comparable_ranges(p_geo character varying DEFAULT ''::character varying, p_use_daily boolean DEFAULT true)
 RETURNS TABLE(timeline_input text, timeline_type text, current_start_date date, current_end_date date, current_start_week_id integer, current_end_week_id integer, compare_start_date date, compare_end_date date, compare_start_week_id integer, compare_end_week_id integer, refresh_date date, refresh_week_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_timeline_type TEXT;
    v_refresh_date DATE;
    v_refresh_week_id INTEGER;
    v_timeline_list TEXT[];
    v_timeline_input TEXT;
    v_current_start_date DATE;
    v_current_end_date DATE;
    v_current_start_week_id INTEGER;
    v_current_end_week_id INTEGER;
    v_compare_start_date DATE;
    v_compare_end_date DATE;
    v_compare_start_week_id INTEGER;
    v_compare_end_week_id INTEGER;
BEGIN
    -- Get last refresh date from refresh_date table
    SELECT last_refresh_date, last_refresh_week 
    INTO v_refresh_date, v_refresh_week_id
    FROM monday_smart.refresh_date
    LIMIT 1;
    
    -- Determine timeline type and supported timelines
    IF p_use_daily THEN
        v_timeline_type := 'daily';
        -- Daily timeline abbreviations
        v_timeline_list := ARRAY['ld', 'pd', 'mtd', 'qtd', 'ytd', 'wtd', 'trailing_5_weeks', 'trailing_13_weeks'];
    ELSE
        v_timeline_type := 'weekly';
        -- Weekly timeline abbreviations  
        v_timeline_list := ARRAY['lw', 'pw', 'mtw', 'qtw', 'ytw', 'trailing_5_weeks', 'trailing_13_weeks'];
    END IF;
    
    -- Loop through all timeline inputs
    FOREACH v_timeline_input IN ARRAY v_timeline_list
    LOOP
        -- Get current timeline data using existing SPs
        IF p_use_daily THEN
            -- For daily timelines, use get_date_range_by_abb_daily
            SELECT start_date, end_date 
            INTO v_current_start_date, v_current_end_date
            FROM monday_smart.get_date_range_by_abb_daily(v_timeline_input, p_geo);
            
            -- Get week IDs for the current dates
            SELECT fw_id INTO v_current_start_week_id
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE date = v_current_start_date
            LIMIT 1;
            
            SELECT fw_id INTO v_current_end_week_id
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE date = v_current_end_date
            LIMIT 1;
            
        ELSE
            -- For weekly timelines, use get_date_range_by_abb_v2
            SELECT start_fw, end_fw 
            INTO v_current_start_week_id, v_current_end_week_id
            FROM monday_smart.get_date_range_by_abb_v2(v_timeline_input, p_geo);
            
            -- Get dates for the current week IDs
            SELECT date INTO v_current_start_date
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE fw_id = v_current_start_week_id
            LIMIT 1;
            
            SELECT date INTO v_current_end_date
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE fw_id = v_current_end_week_id
            LIMIT 1;
        END IF;
        
        -- Calculate comparable timeline (last year)
        IF p_use_daily THEN
            -- For daily: use comparable_calendar_dl table for last year comparison
            SELECT 
                min(ly_comparable_dt) as start_date, 
                max(ly_comparable_dt) as end_date
            INTO v_compare_start_date, v_compare_end_date
            FROM (
                SELECT min(ly_comparable_dt) as min_date, max(ly_comparable_dt) as max_date
                FROM monday_smart.comparable_calendar_dl ccd 
                WHERE date_id >= v_current_start_date
                AND date_id <= v_current_end_date 
            ) a
            JOIN monday_smart.comparable_calendar_dl b
            ON b.date_id BETWEEN a.min_date AND a.max_date;
            
            -- Get week IDs for comparable dates
            SELECT fw_id INTO v_compare_start_week_id
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE date = v_compare_start_date
            LIMIT 1;
            
            SELECT fw_id INTO v_compare_end_week_id
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE date = v_compare_end_date
            LIMIT 1;
            
        ELSE
            -- For weekly: subtract 100 weeks (1 year) from current week IDs
            v_compare_start_week_id := v_current_start_week_id - 100;
            v_compare_end_week_id := v_current_end_week_id - 100;
            
            -- Get dates for comparable week IDs
            SELECT date INTO v_compare_start_date
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE fw_id = v_compare_start_week_id
            LIMIT 1;
            
            SELECT date INTO v_compare_end_date
            FROM monday_smart.fc_fy_fw_level_v2
            WHERE fw_id = v_compare_end_week_id
            LIMIT 1;
        END IF;
        
        -- Return data for this timeline
        RETURN QUERY SELECT
            v_timeline_input,
            v_timeline_type,
            v_current_start_date,
            v_current_end_date,
            v_current_start_week_id,
            v_current_end_week_id,
            v_compare_start_date,
            v_compare_end_date,
            v_compare_start_week_id,
            v_compare_end_week_id,
            v_refresh_date,
            v_refresh_week_id;
            
    END LOOP;
    
END;
$function$
;