--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_create_missing_partitions_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_create_missing_partitions_10

DROP PROCEDURE IF EXISTS base_pricing.sp_create_missing_partitions;

CREATE OR REPLACE PROCEDURE base_pricing.sp_create_missing_partitions(IN p_parent_table text, IN p_partition_column text, IN p_source_table text)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_partition_value TEXT;
    v_partition_name TEXT;
    v_exists BOOLEAN;
    v_parent_schema TEXT;
    v_parent_table TEXT;
BEGIN
    -- Split schema and table
    v_parent_schema := split_part(p_parent_table, '.', 1);
    v_parent_table := split_part(p_parent_table, '.', 2);

    -- Create partitions for each distinct value
    FOR v_partition_value IN
        EXECUTE 'SELECT DISTINCT ' ||
            quote_ident(p_partition_column) ||
            '::text FROM ' ||
            p_source_table ||
            ' ORDER BY 1'
    LOOP
        v_partition_name := format('%s_%s', v_parent_table, v_partition_value);

        -- Check if partition already exists
        SELECT EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_inherits i ON i.inhrelid = c.oid
            JOIN pg_class p ON i.inhparent = p.oid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = v_partition_name
              AND p.relname = v_parent_table
              AND n.nspname = v_parent_schema
        )
        INTO v_exists;

        -- Create partition if it does not exist
        IF NOT v_exists THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.%I FOR VALUES IN (%s)',
                v_parent_schema,
                v_partition_name,
                v_parent_schema,
                v_parent_table,
                v_partition_value
            );
        END IF;
    END LOOP;

    -- Insert data with deduplication
    EXECUTE format(
        'INSERT INTO %I.%I SELECT * FROM %s ON CONFLICT DO NOTHING',
        v_parent_schema,
        v_parent_table,
        p_source_table
    );
END;
$procedure$
;
