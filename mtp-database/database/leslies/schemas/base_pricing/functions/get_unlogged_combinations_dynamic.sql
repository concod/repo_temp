--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:get_unlogged_combinations_dynamic_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.get_unlogged_combinations_dynamic_10

DROP FUNCTION IF EXISTS base_pricing.get_unlogged_combinations_dynamic;

CREATE OR REPLACE FUNCTION base_pricing.get_unlogged_combinations_dynamic(p_strategy_id integer, p_is_kvi boolean DEFAULT NULL::boolean)
 RETURNS TABLE(product_id integer, store_id integer, segment_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_partition_name text;
BEGIN
    v_partition_name := 'bp_unlogged_combinations_' || p_strategy_id ||
                   CASE 
                       WHEN p_is_kvi IS NULL THEN ''
                       WHEN p_is_kvi THEN '_true'
                       ELSE '_false'
                   END;
    
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'base_pricing' 
        AND tablename = v_partition_name
    ) THEN
        RETURN QUERY EXECUTE format(
            'SELECT DISTINCT product_id, store_id, segment_id
            FROM base_pricing.%I',
            v_partition_name
        );
    END IF;
    
    RETURN;
END;
$function$
;