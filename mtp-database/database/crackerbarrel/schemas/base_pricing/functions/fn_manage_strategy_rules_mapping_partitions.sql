--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_manage_strategy_rules_mapping_partitions stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_manage_strategy_rules_mapping_partitions

DROP FUNCTION IF EXISTS base_pricing.fn_manage_strategy_rules_mapping_partitions;

CREATE OR REPLACE FUNCTION base_pricing.fn_manage_strategy_rules_mapping_partitions(p_strategy_id integer, p_look_ahead integer DEFAULT 50)
 RETURNS TABLE(action text, partition_name text, strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_partition_name TEXT;
    v_exists BOOLEAN;
    v_sql TEXT;
    i INTEGER;
BEGIN
    -- Loop to create partitions within the range
    FOR i IN p_strategy_id..(p_strategy_id + p_look_ahead) LOOP
        v_partition_name := format('bp_strategy_rules_mapping_%s', i);

        -- Check if the partition already exists
        SELECT EXISTS (
            SELECT 1
            FROM pg_inherits inh
            JOIN pg_class c ON inh.inhrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = v_partition_name
            AND n.nspname = 'base_pricing'
        ) INTO v_exists;

        IF NOT v_exists THEN
            -- Create the partition if it doesn't exist
            v_sql := format(
                'CREATE TABLE base_pricing.%I 
                 PARTITION OF base_pricing.bp_strategy_rules_mapping 
                 FOR VALUES IN (%s)',
                v_partition_name,
                i
            );

            EXECUTE v_sql;

            action := 'CREATED';
            partition_name := v_partition_name;
            strategy_id := i;
            RETURN NEXT;
        ELSE
            -- Skip creation and log the existing partition
            action := 'EXISTS';
            partition_name := v_partition_name;
            strategy_id := i;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$function$
;