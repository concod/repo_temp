--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_create_predefined_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_predefined_partitions

DROP PROCEDURE IF EXISTS price_promo.pc_create_predefined_partitions;

CREATE OR REPLACE PROCEDURE price_promo.pc_create_predefined_partitions(
    IN table_name_to_fetch_id TEXT,
    IN id_column_name TEXT,
    IN table_to_partition TEXT,
    IN buffer_value INTEGER DEFAULT 100,
    IN secondary_partition_details TEXT DEFAULT ''
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$

DECLARE
    sql TEXT;
    partition_name TEXT;
    parent_partition_name TEXT;
    max_id INTEGER;
    _part INTEGER;
BEGIN
--CALL price_promo.pc_create_predefined_partitions
--('price_promo.scenario_master', 'scenario_id', 'price_promo.ps_recommended_scenarios',100,'PARTITION BY RANGE (recommendation_date)')

    -- Fetch the maximum ID from the specified table
    EXECUTE format('SELECT MAX(%s) FROM %s', id_column_name, table_name_to_fetch_id) INTO max_id;

    -- Loop from max_id to max_id + buffer_value
    FOR _part IN max_id..(max_id + buffer_value)
    LOOP
        -- Create the first-level partition by scenario_id
        parent_partition_name := format('%s_%s', table_to_partition, _part);

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %s PARTITION OF %s
             FOR VALUES IN (%s) %s',
            parent_partition_name,
            table_to_partition,
            _part,
            secondary_partition_details
        );
    END LOOP;

END;

$procedure$;
