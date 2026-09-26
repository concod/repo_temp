--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_bp_insert_rule_product_store_mapping_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_bp_insert_rule_product_store_mapping_v1


DROP PROCEDURE IF EXISTS base_pricing.sp_create_partition_for_pgs_or_sgs(text, int4);

CREATE OR REPLACE PROCEDURE base_pricing.sp_create_partition_for_pgs_or_sgs(IN _table_name text, IN _id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    partition_table_name text;
    partition_create_query text;
BEGIN
    partition_table_name = format('%s_%s', _table_name, _id::text);
    partition_create_query = format(
        'CREATE TABLE IF NOT EXISTS base_pricing.%I PARTITION OF base_pricing.%I FOR VALUES IN (%L)',
        partition_table_name, _table_name, _id::text
    );
    
    -- Raise notice to show the generated query
    RAISE NOTICE 'partition_create_query: %', partition_create_query;

    -- Execute the partition creation query
    EXECUTE partition_create_query;
END;
$procedure$
;
