--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_create_date_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_create_date_partitions

DROP PROCEDURE if exists price_promo_opt.pc_create_date_partitions;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_create_date_partitions(IN var_dataset_name character varying, IN var_table_name character varying, IN var_partition_type character varying, IN var_partition_interval character varying, IN var_partition_direction character varying DEFAULT 'both'::character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

	partition_start DATE;

	partition_end DATE;

    start_date DATE;

    end_date DATE;

    week_start DATE;

    partition_name TEXT;

    sql TEXT;

BEGIN

	IF var_partition_direction = 'forward' THEN

    	EXECUTE 'SELECT CURRENT_DATE AT TIME ZONE ''EST'' - INTERVAL ''1 day''' INTO partition_start;

 	ELSE

 		EXECUTE 'SELECT CURRENT_DATE AT TIME ZONE ''EST'' - INTERVAL ''' || var_partition_interval || '''' INTO partition_start;

    END IF;



	IF var_partition_direction = 'backward' THEN

    	EXECUTE 'SELECT CURRENT_DATE AT TIME ZONE ''EST'' + INTERVAL ''1 day''' INTO partition_end;

 	ELSE

 		EXECUTE 'SELECT CURRENT_DATE AT TIME ZONE ''EST'' + INTERVAL ''' || var_partition_interval || '''' INTO partition_end;

    END IF;



    IF var_partition_type = 'day' THEN

		FOR start_date, end_date IN

			SELECT

				(date_id)::date as start_date,

				(date_id +  (1 || 'day')::interval)::date as end_date

			from "pricesmart".tb_fiscal_date_mapping  ds

			WHERE

				date_id between partition_start AND partition_end

			group by 1, 2

			order by 1

		LOOP

		    -- partition names

		    partition_name := var_table_name || '_' || TO_CHAR(start_date, 'yyyymmdd');



		    -- SQL statements to create the partition

		    sql := 'CREATE TABLE IF NOT EXISTS ' || var_dataset_name || '.' || partition_name || ' PARTITION OF ' || var_dataset_name || '.' || var_table_name ||

		           ' FOR VALUES FROM (''' || TO_CHAR(start_date, 'YYYY-MM-DD') || ''') TO (''' || TO_CHAR(end_date, 'YYYY-MM-DD') || ''');';



		    -- Execute or return

		    RAISE NOTICE 'Executing SQL QUERY: %', sql;

		    EXECUTE sql;

	    END LOOP;

    ELSIF var_partition_type = 'week' THEN

		FOR week_start, start_date, end_date IN

			select

		    	simulation_week_start_date,

			 	min(date_id)::date as start_date,

			 	(max(date_id) +  (1 || 'day')::interval)::date as end_date

			from "pricesmart".tb_fiscal_date_mapping  ds

			WHERE

				simulation_week_start_date >= partition_start

				and date_id <= partition_end

			group by 1

			order by 1

		LOOP

		    -- partition names

		    partition_name := var_table_name || '_' || TO_CHAR(week_start, 'yyyymmdd');



		    -- SQL statements to create the partition

		    sql := 'CREATE TABLE IF NOT EXISTS ' || var_dataset_name || '.' || partition_name || ' PARTITION OF ' || var_dataset_name || '.' || var_table_name ||

		           ' FOR VALUES FROM (''' || TO_CHAR(start_date, 'YYYY-MM-DD') || ''') TO (''' || TO_CHAR(end_date, 'YYYY-MM-DD') || ''');';



		    -- Execute or return

            RAISE NOTICE 'Executing SQL QUERY: %', sql;

		    EXECUTE sql;

	    END LOOP;

    END IF;

END;

$procedure$
;

