--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_remove_empty_partitions stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_remove_empty_partitions
DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_remove_empty_partitions;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_remove_empty_partitions(IN table_name text, IN dry_run boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    partition_record record;
    sql_stmt text;
    row_count bigint;
    removed_count integer := 0;
BEGIN
    -- Loop through all partitions
    FOR partition_record IN (
        SELECT 
            inhrelid::regclass AS partition_name
        FROM 
            pg_inherits
        WHERE 
            inhparent::regclass = ('base_pricing_restaurant.' || table_name)::regclass
    ) LOOP
        -- Extract just the table name from the regclass
        sql_stmt := format(
            'SELECT COUNT(*) FROM %s',
            partition_record.partition_name
        );
        EXECUTE sql_stmt INTO row_count;
        IF row_count = 0 THEN
            -- Partition is empty, remove it
            sql_stmt := format(
                'ALTER TABLE base_pricing_restaurant.%I DETACH PARTITION %s',
                table_name,
                partition_record.partition_name
            );
            IF dry_run THEN
                RAISE NOTICE 'DRY RUN: Would remove empty partition %', 
                    partition_record.partition_name;
            ELSE
                RAISE NOTICE 'Removing empty partition %', 
                    partition_record.partition_name;
                EXECUTE sql_stmt;
                -- Now drop the detached partition
                sql_stmt := format('DROP TABLE %s', partition_record.partition_name);
                EXECUTE sql_stmt;
            END IF;
            removed_count := removed_count + 1;
        END IF;
    END LOOP;
    IF dry_run THEN
        RAISE NOTICE 'DRY RUN COMPLETE: Would remove % empty partitions', removed_count;
    ELSE
        RAISE NOTICE 'COMPLETE: Removed % empty partitions', removed_count;
    END IF;
END;
$procedure$
;