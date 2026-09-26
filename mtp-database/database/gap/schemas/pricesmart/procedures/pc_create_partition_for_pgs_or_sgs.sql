--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_create_partition_for_pgs_or_sgs_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_create_partition_for_pgs_or_sgs_2

DROP PROCEDURE if exists pricesmart.pc_create_partition_for_pgs_or_sgs;


CREATE OR REPLACE PROCEDURE pricesmart.pc_create_partition_for_pgs_or_sgs(IN _table_name text, IN _id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	partition_table_name text;
	partition_create_query text;
BEGIN
    partition_table_name = format('%s_%s', _table_name, _id::text);
    partition_create_query = format(
        'CREATE TABLE IF NOT EXISTS pricesmart.%I PARTITION OF pricesmart.%I FOR VALUES IN (%L)',
        partition_table_name, _table_name, _id::text
    );
    
    -- Raise notice to show the generated query
    RAISE NOTICE 'partition_create_query: %', partition_create_query;

    -- Execute the partition creation query
    EXECUTE partition_create_query;
END;
$procedure$
;
