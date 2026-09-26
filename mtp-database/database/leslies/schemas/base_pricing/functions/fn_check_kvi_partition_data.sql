--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_check_kvi_partition_data_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_check_kvi_partition_data_10

DROP FUNCTION IF EXISTS base_pricing.fn_check_kvi_partition_data;

CREATE OR REPLACE FUNCTION base_pricing.fn_check_kvi_partition_data(p_strategy_id integer)
 RETURNS TABLE(has_kvi_data boolean, has_non_kvi_data boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_true_partition text := 'bp_unlogged_combinations_' || p_strategy_id || '_true';
    v_false_partition text := 'bp_unlogged_combinations_' || p_strategy_id || '_false';
    v_true_count bigint := 0;
    v_false_count bigint := 0;
BEGIN
    -- Check true partition
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'base_pricing' 
        AND tablename = v_true_partition
    ) THEN
        EXECUTE format('SELECT COUNT(*) FROM base_pricing.%I', v_true_partition)
        INTO v_true_count;
    END IF;

    -- Check false partition  
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'base_pricing' 
        AND tablename = v_false_partition
    ) THEN
        EXECUTE format('SELECT COUNT(*) FROM base_pricing.%I', v_false_partition)
        INTO v_false_count;
    END IF;

    -- Return results
    has_kvi_data := (v_true_count > 0);
    has_non_kvi_data := (v_false_count > 0);
    
    RETURN;
END;
$function$
;
