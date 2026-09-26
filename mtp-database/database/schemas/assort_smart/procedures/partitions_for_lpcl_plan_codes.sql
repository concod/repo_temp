--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics.co:partitions_for_lpcl_plan_codes runOnChange:true stripComments:false splitStatements:false context:partitions_for_lpcl_plan_codes labels:liquibase_project_start
--comment: Create function for creating partitions 

DROP PROCEDURE IF EXISTS assort_smart.partitions_for_lpcl_plan_codes();
CREATE OR REPLACE PROCEDURE assort_smart.partitions_for_lpcl_plan_codes()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    v_plan_id integer;
    v_part_name text;
    v_exists boolean;
    v_max_plan_id integer;
    v_default_part_name text := 'lpcl_default';
    v_is_partitioned boolean;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'assort_smart.partitions_for_lpcl_plan_codes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
    RAISE NOTICE 'Starting partition creation';

    SELECT EXISTS (
    SELECT 1
    FROM pg_partitioned_table pt
    JOIN pg_class c ON c.oid = pt.partrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'assort_smart'
      AND c.relname = 'line_plan_choice_launch'
   ) INTO v_is_partitioned;

   IF NOT v_is_partitioned THEN
    RAISE NOTICE 'Table assort_smart.line_plan_choice_launch is not partitioned. Skipping partition creation.';
    RETURN;
   END IF;

    SELECT max(line_review_plan_master_id)
      INTO v_max_plan_id
      FROM assort_smart.line_review_plan_master;

    IF v_max_plan_id IS NULL THEN
        v_max_plan_id := 0;
    END IF;

    RAISE NOTICE 'Max line_review_plan_master_id = %', v_max_plan_id;


    SELECT EXISTS (
        SELECT 1
        FROM pg_inherits i
        JOIN pg_class c_child ON c_child.oid = i.inhrelid
        JOIN pg_namespace n_child ON n_child.oid = c_child.relnamespace
        JOIN pg_class c_parent ON c_parent.oid = i.inhparent
        JOIN pg_namespace n_parent ON n_parent.oid = c_parent.relnamespace
        WHERE n_child.nspname = 'assort_smart'
          AND c_child.relname = v_default_part_name
          AND n_parent.nspname = 'assort_smart'
          AND c_parent.relname = 'line_plan_choice_launch'
    ) INTO v_exists;

    IF v_exists THEN
        RAISE NOTICE 'Default partition % already exists', v_default_part_name;
    ELSE
        RAISE NOTICE 'Creating default partition %', v_default_part_name;
        BEGIN
            EXECUTE format(
                'CREATE TABLE %I.%I PARTITION OF %I.%I DEFAULT WITH (
                    autovacuum_vacuum_scale_factor=0.1,
                    autovacuum_vacuum_threshold=50000,
                    autovacuum_analyze_scale_factor=0.05,
                    autovacuum_analyze_threshold=30000
                 )',
                'assort_smart', v_default_part_name,
                'assort_smart', 'line_plan_choice_launch'
            );
            RAISE NOTICE 'Default partition % created', v_default_part_name;
        EXCEPTION
            WHEN duplicate_table THEN
                RAISE NOTICE 'Default partition % already exists (duplicate)', v_default_part_name;
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed creating default partition % due to: %',
                    v_default_part_name, SQLERRM;
                RAISE;
        END;
    END IF;

    FOR v_plan_id IN v_max_plan_id .. v_max_plan_id + 199 LOOP
        v_part_name := 'lpcl_p' || v_plan_id;

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
            RAISE NOTICE 'Partition % already exists, skipping', v_part_name;
            CONTINUE;
        END IF;

        RAISE NOTICE 'Creating partition % for value %', v_part_name, v_plan_id;
        BEGIN
            EXECUTE format(
                'CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES IN (%L) WITH (
                    autovacuum_vacuum_scale_factor=0.1,
                    autovacuum_vacuum_threshold=50000,
                    autovacuum_analyze_scale_factor=0.05,
                    autovacuum_analyze_threshold=30000
                 )',
                'assort_smart', v_part_name,
                'assort_smart', 'line_plan_choice_launch',
                v_plan_id
            );
            RAISE NOTICE 'Partition % created', v_part_name;
        EXCEPTION
            WHEN duplicate_table THEN
                RAISE NOTICE 'Partition % already exists (duplicate)', v_part_name;
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed creating partition % due to: %',
                    v_part_name, SQLERRM;
                RAISE;
        END;
    END LOOP;

    RAISE NOTICE 'Partition creation complete';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
END;
$procedure$;
