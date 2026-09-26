--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_create_column_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_column_partitions

DROP PROCEDURE IF EXISTS price_promo_opt.pc_create_column_partitions ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_create_column_partitions(IN var_dataset_name character varying, IN var_table_name character varying, IN var_column_name character varying, IN var_column_value character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

	distinct_value TEXT;

    query TEXT;

    partition_name TEXT;

BEGIN

	-- name the partition

    partition_name := var_table_name || '_' || var_column_name || '_' || var_column_value::text;



    -- SQL statements to create the partition

    query := FORMAT(

    	'CREATE TABLE IF NOT EXISTS %I.%I

        PARTITION OF %I.%I

    	FOR VALUES IN (%s);', var_dataset_name, partition_name, var_dataset_name, var_table_name, var_column_value);

	RAISE NOTICE 'Executing : %', query;

	EXECUTE query;

END;

$procedure$
;
