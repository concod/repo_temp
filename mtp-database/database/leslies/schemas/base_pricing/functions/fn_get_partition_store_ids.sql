--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_get_partition_store_ids_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_get_partition_store_ids_10

DROP FUNCTION IF EXISTS base_pricing.fn_get_partition_store_ids;

CREATE OR REPLACE FUNCTION base_pricing.fn_get_partition_store_ids(p_strategy_id integer, p_is_kvi boolean)
 RETURNS TABLE(store_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_partition_suffix text;
    v_partition_name text;
BEGIN
    -- Determine the suffix based on is_kvi
    IF p_is_kvi THEN
        v_partition_suffix := 'true';
    ELSE
        v_partition_suffix := 'false';
    END IF;

    -- Construct the full partition name
    v_partition_name := 'bp_unlogged_combinations_' || p_strategy_id || '_' || v_partition_suffix;

    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'base_pricing' 
        AND tablename = v_partition_name
    ) THEN
        RETURN;
    END IF;

    -- Execute the query and return store_id
    RETURN QUERY EXECUTE format(
        'SELECT DISTINCT store_id FROM base_pricing.%I',
        v_partition_name
    );
END;
$function$
;