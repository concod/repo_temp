--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_get_partition_segment_ids stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_get_partition_segment_ids

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_get_partition_segment_ids;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_get_partition_segment_ids(p_strategy_id integer, p_is_kvi boolean)
 RETURNS TABLE(segment_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_partition_name text;
BEGIN
    v_partition_name := 'bp_unlogged_combinations_' || p_strategy_id || '_' || 
                       CASE WHEN p_is_kvi THEN 'true' ELSE 'false' END;
    
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'base_pricing_restaurant' 
        AND tablename = v_partition_name
    ) THEN
        RETURN QUERY EXECUTE format(
            'SELECT DISTINCT segment_id FROM base_pricing_restaurant.%I',
            v_partition_name
        );
    END IF;
    
    RETURN;
END;
$function$
;