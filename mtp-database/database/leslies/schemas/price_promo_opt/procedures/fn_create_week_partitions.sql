--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_create_week_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_create_week_partitions

DROP PROCEDURE IF EXISTS price_promo_opt.fn_create_week_partitions ;
CREATE OR REPLACE PROCEDURE price_promo_opt.fn_create_week_partitions(IN var_dataset_name character varying, IN var_table_name character varying)
 LANGUAGE plpgsql
AS $procedure$

DECLARE

    start_date DATE;

    end_date DATE;

    week_start DATE;

    partition_name TEXT;

    sql TEXT;

--    sql_queries TEXT[];

BEGIN

FOR week_start, start_date, end_date IN

	select 

    	weeks_start_date,

	 	min(date_id)::date as start_date,

	 	(max(date_id) +  (1 || 'day')::interval)::date as end_date

	from "global".tb_fiscal_date_mapping  ds

	WHERE

		weeks_start_date >= date(timezone('EST', now())) - INTERVAL '7 months'

		and date_id <= date(timezone('EST', now())) + INTERVAL '7 months'

	group by 1 

	order by 1

LOOP

    -- Generate the partition name

    partition_name := var_table_name || '_' || TO_CHAR(week_start, 'yyyymmdd');



    -- Create the SQL statement to create the partition

    sql := 'CREATE TABLE IF NOT EXISTS ' || var_dataset_name || '.' || partition_name || ' PARTITION OF ' || var_dataset_name || '.' || var_table_name ||

           ' FOR VALUES FROM (''' || TO_CHAR(start_date, 'YYYY-MM-DD') || ''') TO (''' || TO_CHAR(end_date, 'YYYY-MM-DD') || ''');';



    -- Execute the SQL statement

    EXECUTE sql;

--    sql_queries := array_append(sql_queries, sql);

    END LOOP;

--    RETURN sql_queries;

END;

$procedure$
;
