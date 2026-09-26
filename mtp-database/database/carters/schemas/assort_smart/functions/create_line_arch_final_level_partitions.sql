--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co liquibase:line_arch_partitions runOnChange:true  stripComments:false splitStatements:false context:Line-Plan labels:liquibase_project_start
--comment: Create line_arch_final_level_partitions
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.create_line_arch_final_level_partitions(text);

CREATE OR REPLACE FUNCTION assort_smart.create_line_arch_final_level_partitions(p_column_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec RECORD;
    partition_name TEXT;
    partition_exists BOOLEAN;
    sql TEXT;
    partition_count INT := 0;
    max_partitions_per_run CONSTANT INT := 500;
    dynamic_sql TEXT;
BEGIN
    -- Validate parameter
    IF p_column_name IS NULL OR p_column_name = '' THEN
        RAISE EXCEPTION 'Column name parameter cannot be null or empty';
    END IF;

    -- Start transaction
    BEGIN
        -- Dynamic SQL to get distinct values from the specified column
        dynamic_sql := format(
            'SELECT DISTINCT %I as column_value FROM global.product_attributes_filter ORDER BY %I',
            p_column_name,
            p_column_name
        );

        -- Loop over distinct values from the specified column
        FOR rec IN EXECUTE dynamic_sql
        LOOP
            -- Check partition limit
            IF partition_count >= max_partitions_per_run THEN
                RAISE NOTICE 'Reached maximum partition limit (%) for this run', max_partitions_per_run;
                EXIT;
            END IF;

            -- Simple and efficient partition naming: p_ + first 16 chars of md5
            partition_name := 'p_' || substr(md5(rec.column_value), 1, 16);

            -- Check for existing partition
            BEGIN
                SELECT EXISTS (
                    SELECT 1
                    FROM pg_inherits i
                    JOIN pg_class c ON i.inhrelid = c.oid
                    WHERE i.inhparent = 'assort_smart.line_arch_store_week'::regclass
                    AND c.relname = partition_name
                ) INTO partition_exists;

                IF NOT partition_exists THEN
                    -- Create partition
                    BEGIN
                        sql := format(
                            'CREATE TABLE assort_smart.%I PARTITION OF assort_smart.line_arch_store_week FOR VALUES IN (%L)',
                            partition_name, rec.column_value
                        );
                        RAISE NOTICE 'Creating partition: %', sql;
                        EXECUTE sql;

                        -- Create index
                        sql := format(
                            'CREATE INDEX %I ON assort_smart.%I (plan_code, placeholder_choice_id, cluster_code)',
                            partition_name || '_idx1', partition_name
                        );
                        RAISE NOTICE 'Creating index: %', sql;
                        EXECUTE sql;

                        partition_count := partition_count + 1;
                    EXCEPTION
                        WHEN OTHERS THEN
                            RAISE WARNING 'Failed to create partition % or its index: %', partition_name, SQLERRM;
                            -- Cleanup on failure
                            EXECUTE format('DROP TABLE IF EXISTS assort_smart.%I', partition_name);
                            CONTINUE;
                    END;
                ELSE
                    RAISE NOTICE 'Partition "%" already exists, skipping.', partition_name;
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Error checking partition existence for %: %', partition_name, SQLERRM;
                    CONTINUE;
            END;
        END LOOP;

        RAISE NOTICE 'Successfully created % partitions', partition_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Fatal error in partition creation: %', SQLERRM;
    END;
END;
$function$
;
