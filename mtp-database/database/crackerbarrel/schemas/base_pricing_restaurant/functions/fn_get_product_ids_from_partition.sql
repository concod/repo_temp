--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_get_product_ids_from_partition stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_get_product_ids_from_partition

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_get_product_ids_from_partition;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_get_product_ids_from_partition(p_strategy_id integer, p_is_kvi boolean)
 RETURNS TABLE(product_id integer)
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
        WHERE schemaname = 'base_pricing_restaurant' 
        AND tablename = v_partition_name
    ) THEN
        RETURN; -- Return empty result if partition doesn't exist
    END IF;

    -- Execute the query and return product_ids
    RETURN QUERY EXECUTE format(
        'SELECT DISTINCT product_id FROM base_pricing_restaurant.%I',
        v_partition_name
    );
END;
$function$
;