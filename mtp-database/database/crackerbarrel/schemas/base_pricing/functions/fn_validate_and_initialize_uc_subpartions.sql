--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_validate_and_initialize_uc_subpartions stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_validate_and_initialize_uc_subpartions

DROP FUNCTION IF EXISTS base_pricing.fn_validate_and_initialize_uc_subpartions;

CREATE OR REPLACE FUNCTION base_pricing.fn_validate_and_initialize_uc_subpartions(strategy_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    sql_query text;
BEGIN
    -- Create subpartitioned table
    sql_query := format(
        'CREATE TABLE IF NOT EXISTS base_pricing.bp_unlogged_combinations_%s
            PARTITION OF base_pricing.bp_unlogged_combinations
            FOR VALUES IN (%s)
            PARTITION BY LIST (is_kvi);',
        strategy_id, strategy_id
    );
    RAISE NOTICE '%', sql_query;
    EXECUTE sql_query;
    -- Create subpartitions
    sql_query := format(
        'CREATE TABLE IF NOT EXISTS base_pricing.bp_unlogged_combinations_%s_true
            PARTITION OF base_pricing.bp_unlogged_combinations_%s
            FOR VALUES IN (true);',
        strategy_id, strategy_id
    );
    RAISE NOTICE '%', sql_query;
    EXECUTE sql_query;
    sql_query := format(
        'CREATE TABLE IF NOT EXISTS base_pricing.bp_unlogged_combinations_%s_false
            PARTITION OF base_pricing.bp_unlogged_combinations_%s
            FOR VALUES IN (false);',
        strategy_id, strategy_id
    );
    RAISE NOTICE '%', sql_query;
    EXECUTE sql_query;
END;
$function$
;
