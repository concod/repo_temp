--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:new_partitions_for_lpcl_plan_codes_carters  runOnChange:true stripComments:false splitStatements:false context:new_partitions_for_lpcl_plan_codes  labels:liquibase_project_start
--comment: new partitions for lpcl plan codes
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.create_partitions_for_lpcl_plan_codes(_int4);
CREATE OR REPLACE FUNCTION assort_smart.create_partitions_for_lpcl_plan_codes(p_plan_codes integer[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_plan_code integer;
    v_part_name text;
    v_exists boolean;
BEGIN
    IF p_plan_codes IS NULL OR array_length(p_plan_codes, 1) IS NULL THEN
        RAISE EXCEPTION 'Plan codes array cannot be null or empty';
    END IF;

    LOCK TABLE assort_smart.line_plan_choice_launch IN SHARE UPDATE EXCLUSIVE MODE;

    FOREACH v_plan_code IN ARRAY p_plan_codes LOOP
        IF v_plan_code IS NULL THEN
            CONTINUE;
        END IF;

        v_part_name := 'lpcl_p' || v_plan_code;

        SELECT EXISTS (
            SELECT 1
            FROM pg_inherits i
            JOIN pg_class c_child ON c_child.oid = i.inhrelid
            JOIN pg_namespace n_child ON n_child.oid = c_child.relnamespace
            JOIN pg_class c_parent ON c_parent.oid = i.inhparent
            JOIN pg_namespace n_parent ON n_parent.oid = c_parent.relnamespace
            WHERE n_child.nspname = 'assort_smart'
              AND c_child.relname = v_part_name
              AND n_parent.nspname = 'assort_smart'
              AND c_parent.relname = 'line_plan_choice_launch'
        ) INTO v_exists;

        IF v_exists THEN
            CONTINUE;
        END IF;

        BEGIN
            EXECUTE format(
                'CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES IN (%L)',
                'assort_smart', v_part_name,
                'assort_smart', 'line_plan_choice_launch',
                v_plan_code
            );
        EXCEPTION
            WHEN duplicate_table THEN
                NULL;
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed creating partition % due to: %', v_part_name, SQLERRM;
                RAISE;
        END;
    END LOOP;

    RETURN;
END;
$function$
;