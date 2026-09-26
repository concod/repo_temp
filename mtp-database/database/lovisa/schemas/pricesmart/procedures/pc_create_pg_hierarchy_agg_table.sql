--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_create_pg_hierarchy_agg_table_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_create_pg_hierarchy_agg_table_1

DROP PROCEDURE if exists pricesmart.pc_create_pg_hierarchy_agg_table;


CREATE OR REPLACE PROCEDURE pricesmart.pc_create_pg_hierarchy_agg_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    col_list TEXT;
    expected_columns TEXT;
    existing_columns TEXT;
    table_exists BOOLEAN;
BEGIN
    -- Generate expected column list from mapping table
    SELECT string_agg(format('%I integer[]', request_key), ', ' ORDER BY id_mapping)
    INTO col_list
    FROM pricesmart.pricesmart_hierarchy_mapping
    WHERE is_product_hierarchy = true;

    -- Add pg_id as a nullable foreign key
    col_list := 'pg_id INT, ' || col_list;

    -- Generate expected column names including pg_id
    SELECT string_agg(request_key, ',' ORDER BY id_mapping)
    INTO expected_columns
    FROM pricesmart.pricesmart_hierarchy_mapping
    WHERE is_product_hierarchy = true;

    expected_columns := 'pg_id,' || expected_columns;

    -- Check if the table exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'pricesmart'
          AND table_name = 'tb_pg_hierarchy_agg_data'
    ) INTO table_exists;

    IF table_exists THEN
        -- Get actual existing column names in the table
        SELECT string_agg(column_name, ',' ORDER BY ordinal_position)
        INTO existing_columns
        FROM information_schema.columns
        WHERE table_schema = 'pricesmart'
          AND table_name = 'tb_pg_hierarchy_agg_data';

        -- If columns mismatch, drop and recreate the table
        IF existing_columns IS DISTINCT FROM expected_columns THEN
            EXECUTE 'DROP TABLE pricesmart.tb_pg_hierarchy_agg_data';
            EXECUTE format(
                'CREATE TABLE pricesmart.tb_pg_hierarchy_agg_data (%s, CONSTRAINT fk_pg_id FOREIGN KEY (pg_id) REFERENCES pricesmart.tb_product_group(pg_id))',
                col_list
            );
        END IF;
    ELSE
        -- Table doesn't exist: create it
        EXECUTE format(
            'CREATE TABLE pricesmart.tb_pg_hierarchy_agg_data (%s, CONSTRAINT fk_pg_id FOREIGN KEY (pg_id) REFERENCES pricesmart.tb_product_group(pg_id))',
            col_list
        );
    END IF;
END;
$procedure$
;
