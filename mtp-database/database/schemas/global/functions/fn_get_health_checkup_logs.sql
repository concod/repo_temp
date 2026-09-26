--liquibase formatted sql
--changeset shaik.azmathulla :fn_get_health_checkup_logs_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:fn_get_health_checkup_logs_v2
--comment: getting db_health_checkup logs for excel report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.fn_get_health_checkup_logs;
CREATE OR REPLACE FUNCTION global.fn_get_health_checkup_logs(input refcursor,catagory_id integer)
RETURNS refcursor
LANGUAGE 'plpgsql'
AS $function$
DECLARE
	pw_date date;
	checkup_catagory_code varchar ;
	_sql text;
	
BEGIN

		DROP TABLE IF EXISTS health_checkup_details;
		
		SELECT catagory_code as catagory_code
		INTO checkup_catagory_code
		FROM global.health_checkup_master 
		WHERE health_checkup_id = catagory_id AND last_run_status = 'S';

		SELECT MAX(completed_at::date) as pw_date 
		INTO pw_date
		FROM global.health_checkup_logs 
		WHERE completed_at::date < current_date AND status = 'S';

		RAISE NOTICE 'Processing health_checkup_id: %', catagory_id;
		RAISE NOTICE 'Processing health_checkup_code: %', checkup_catagory_code;
		--RAISE NOTICE 'from date: %,to date : %', from_date,to_date;
		
		IF checkup_catagory_code = 'TBE' THEN
			
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.table_size AS current_table_size,cd.bloat_size AS current_bloat_size,
			    	cd.bloat_percent AS current_bloat_percent,pd.table_size AS previous_week_table_size,pd.bloat_size AS previous_week_bloat_size,
			    	pd.bloat_percent AS previous_week_bloat_percent
			FROM 	(
				        SELECT 	hcm.catagory_name,completed_at::date AS report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
				            	jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
				            	jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_size' AS table_size,
				            	jsonb_array_elements(hcl.log_result)::jsonb ->> 'bloat_size' AS bloat_size,
				            	jsonb_array_elements(hcl.log_result)::jsonb ->> 'bloat_percent' AS bloat_percent
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT 	hcm.catagory_name,completed_at::date AS report_date,
				   				jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
			            		jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
			            		jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_size' AS table_size,
			            		jsonb_array_elements(hcl.log_result)::jsonb ->> 'bloat_size' AS bloat_size,
			            		jsonb_array_elements(hcl.log_result)::jsonb ->> 'bloat_percent' AS bloat_percent
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT * FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'UI' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.index_name AS current_index_name,cd.index_size AS current_index_size,
			    	pd.index_name AS previous_week_index_name,pd.index_size AS previous_week_index_size
			FROM 	(
				        SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_name' AS index_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_size' AS index_size
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	 SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_name' AS index_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_size' AS index_size
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT * , false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'II' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.index_name AS current_index_name,pd.index_name AS previous_week_index_name
			FROM 	(
				        SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_name' AS index_name
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	 SELECT hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_name' AS index_name
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;
				
			_sql:= ' SELECT * , false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'VNT' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.last_vacuum AS last_vacuum,
					cd.last_autovacuum as last_autovacuum,
					cd.live_tup as live_tuples,
					cd.dead_tup as dead_tuples,
					cd.dead_tup_percent as dead_tup_percent,
					pd.last_vacuum AS previous_week_last_vacuum,
					pd.last_autovacuum as previous_week_last_autovacuum,
					pd.live_tup as previous_week_live_tuples,
					pd.dead_tup as previous_week_dead_tuples,
					pd.dead_tup_percent as previous_week_dead_tup_percent
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_vacuum' AS last_vacuum,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_autovacuum' AS last_autovacuum,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'live_tup' AS live_tup,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'dead_tup' AS dead_tup,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'dead_tup_percent' AS dead_tup_percent
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_vacuum' AS last_vacuum,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_autovacuum' AS last_autovacuum,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'live_tup' AS live_tup,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'dead_tup' AS dead_tup,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'dead_tup_percent' AS dead_tup_percent
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'TWSS' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.last_analyze AS last_analyze,
					cd.last_autoanalyze as last_autoanalyze,
					cd.n_mod_since_analyze as n_mod_since_analyze,
					pd.last_analyze AS previous_week_last_analyze,
					pd.last_autoanalyze as previous_week_last_autoanalyze,
					pd.n_mod_since_analyze as previous_week_n_mod_since_analyze
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_analyze' AS last_analyze,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_autoanalyze' AS last_autoanalyze,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'n_mod_since_analyze' AS n_mod_since_analyze
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_analyze' AS last_analyze,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_autoanalyze' AS last_autoanalyze,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'n_mod_since_analyze' AS n_mod_since_analyze
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'TS' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.table_size AS table_size,
					cd.index_size as index_size,
					pd.table_size AS previous_week_table_size,
					pd.index_size as previous_week_index_size
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_size' AS table_size,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_size' AS index_size
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_size' AS table_size,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_size' AS index_size
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;
				
			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'LI' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.index_name AS index_name,
					cd.index_size as index_size,
					pd.index_name AS previous_week_index_name,
					pd.index_size as previous_week_index_size
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_name' AS index_name,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_size' AS index_size
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_name' AS index_name,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'index_size' AS index_size
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;
				
			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'PS' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.parent_table,pd.parent_table) as parent_table ,
					coalesce(cd.partition_name,pd.partition_name) as partition_table_name ,
					cd.partition_size as partition_size,
					pd.partition_size as previous_week_partition_size
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'parent_table' AS parent_table,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_name' AS partition_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_size' AS partition_size
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'parent_table' AS parent_table,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_name' AS partition_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_size' AS partition_size
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.partition_name = pd.partition_name and cd.parent_table = pd.parent_table AND cd.catagory_name = pd.catagory_name;
				
			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'CAS' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.database_name,pd.database_name) as database_name ,
					coalesce(cd.user_name,pd.user_name) as user_name ,
					cd.query AS query,
					cd.status as status,
					pd.query AS previous_week_query,
					pd.status as previous_week_status
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'database_name' AS database_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'user_name' AS user_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'query' AS query,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'status' AS status
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'database_name' AS database_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'user_name' AS user_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'query' AS query,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'status' AS status
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.database_name = pd.database_name and cd.user_name = pd.user_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';
			
		ELSEIF checkup_catagory_code = 'TWOI' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 		
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.table_name,pd.table_name) as table_name ,
					cd.table_size as table_size,
					pd.table_size as previous_week_table_size
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_size' AS table_size
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_name' AS table_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_size' AS table_size
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.table_name = pd.table_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';

		ELSEIF checkup_catagory_code = 'CPU-IQ' THEN

			CREATE TEMP TABLE health_checkup_details AS 		
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.user_name,pd.user_name) as user_name ,
					cd.query as query,
					cd.query_start as query_start,
					cd.query as duration,
					pd.query as previous_week_query,
					pd.query_start as previous_week_query_start,
					pd.query as previous_week_duration
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query' AS query,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'duration' AS duration,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'user_name' AS user_name,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query_start' AS query_start
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query' AS query,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'duration' AS duration,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'user_name' AS user_name,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query_start' AS query_start
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.user_name = pd.user_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';

		ELSEIF checkup_catagory_code = 'IO-WQ' THEN

	
			CREATE TEMP TABLE health_checkup_details AS 		
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.user_name,pd.user_name) as user_name ,
					cd.query as query,
					cd.query_start as query_start,
					cd.duration as duration,
					cd.wait_event as wait_event,
					cd.wait_event_type as wait_event_type,
					pd.query as previous_week_query,
					pd.query_start as previous_week_query_start,
					pd.duration as previous_week_duration,
					pd.wait_event as previous_week_wait_event,
					pd.wait_event_type as previous_week_wait_event_type
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query' AS query,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'duration' AS duration,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'user_name' AS user_name,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'wait_event' AS wait_event,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query_start' AS query_start,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'wait_event_type' AS wait_event_type
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query' AS query,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'duration' AS duration,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'user_name' AS user_name,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'wait_event' AS wait_event,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'query_start' AS query_start,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'wait_event_type' AS wait_event_type
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.user_name = pd.user_name AND cd.catagory_name = pd.catagory_name;

			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';

		ELSEIF checkup_catagory_code = 'IO-BD' THEN

			CREATE TEMP TABLE health_checkup_details AS 		
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.database_name,pd.database_name) as database_name ,
					cd.blocked_hits as blocked_hits,
					cd.blocked_reads as blocked_reads,
					cd.deleted_tuples as deleted_tuples,
					cd.fetched_tuples as fetched_tuples,
					cd.updated_tuples as updated_tuples,
					cd.cache_hit_ratio as cache_hit_ratio,
					cd.inserted_tuples as inserted_tuples,
					cd.returned_tuples as returned_tuples,
					cd.current_datetime as current_datetime,
					pd.blocked_hits as previous_week_blocked_hits,
					pd.blocked_reads as previous_week_blocked_reads,
					pd.deleted_tuples as previous_week_deleted_tuples,
					pd.fetched_tuples as previous_week_fetched_tuples,
					pd.updated_tuples as previous_week_updated_tuples,
					pd.cache_hit_ratio as previous_week_cache_hit_ratio,
					pd.inserted_tuples as previous_week_inserted_tuples,
					pd.returned_tuples as previous_week_returned_tuples,
					pd.current_datetime as previous_week_datetime
			FROM 	(
				       SELECT    hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'blocked_hits' AS blocked_hits,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'blocked_reads' AS blocked_reads,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'database_name' AS database_name,
								 jsonb_array_elements(hcl.log_result)::jsonb ->> 'deleted_tuples' AS deleted_tuples,
								  jsonb_array_elements(hcl.log_result)::jsonb ->> 'fetched_tuples' AS fetched_tuples,
								   jsonb_array_elements(hcl.log_result)::jsonb ->> 'updated_tuples' AS updated_tuples,
								    jsonb_array_elements(hcl.log_result)::jsonb ->> 'cache_hit_ratio' AS cache_hit_ratio,
									 jsonb_array_elements(hcl.log_result)::jsonb ->> 'inserted_tuples' AS inserted_tuples,
									  jsonb_array_elements(hcl.log_result)::jsonb ->> 'returned_tuples' AS returned_tuples,
									   jsonb_array_elements(hcl.log_result)::jsonb ->> 'current_datetime' AS current_datetime
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT 	hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'blocked_hits' AS blocked_hits,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'blocked_reads' AS blocked_reads,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'database_name' AS database_name,
								 jsonb_array_elements(hcl.log_result)::jsonb ->> 'deleted_tuples' AS deleted_tuples,
								  jsonb_array_elements(hcl.log_result)::jsonb ->> 'fetched_tuples' AS fetched_tuples,
								   jsonb_array_elements(hcl.log_result)::jsonb ->> 'updated_tuples' AS updated_tuples,
								    jsonb_array_elements(hcl.log_result)::jsonb ->> 'cache_hit_ratio' AS cache_hit_ratio,
									 jsonb_array_elements(hcl.log_result)::jsonb ->> 'inserted_tuples' AS inserted_tuples,
									  jsonb_array_elements(hcl.log_result)::jsonb ->> 'returned_tuples' AS returned_tuples,
									   jsonb_array_elements(hcl.log_result)::jsonb ->> 'current_datetime' AS current_datetime
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.database_name = pd.database_name AND cd.catagory_name = pd.catagory_name;
				
			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';

		ELSEIF checkup_catagory_code = 'PLTA' THEN
	
			CREATE TEMP TABLE health_checkup_details AS 		
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.parent_table,pd.parent_table) as parent_table ,
					coalesce(cd.partition_name,pd.partition_name) as partition_table_name ,
					cd.partition_size as partition_size,
					cd.percent_above_avg as percent_above_avg,
					cd.avg_partition_size as avg_partition_size,
					pd.partition_size as previous_week_partition_size,
					pd.percent_above_avg as previous_week_percent_above_avg,
					pd.avg_partition_size as previous_week_avg_partition_size
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'parent_table' AS parent_table,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_name' AS partition_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_size' AS partition_size,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'percent_above_avg' AS percent_above_avg,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'avg_partition_size' AS avg_partition_size
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	SELECT  hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'parent_table' AS parent_table,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_name' AS partition_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'partition_size' AS partition_size,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'percent_above_avg' AS percent_above_avg,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'avg_partition_size' AS avg_partition_size
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.partition_name = pd.partition_name and cd.parent_table = pd.parent_table AND cd.catagory_name = pd.catagory_name;


			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';

	   	ELSEIF checkup_catagory_code = 'SRN' THEN

			CREATE TEMP TABLE health_checkup_details AS 		
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					coalesce(cd.schema_name,pd.schema_name) as schema_name ,
					coalesce(cd.sequence_name,pd.sequence_name) as sequence_name ,
					cd.last_value as last_value,
					cd.increment_by as increment_by,
					cd.max_value as max_value,
					cd.percent_utilized as percent_utilized,
					pd.last_value as previous_week_last_value,
					pd.increment_by as previous_week_increment_by,
					pd.max_value as previous_week_max_value,
					pd.percent_utilized as previous_week_percent_utilized				
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'sequence_name' AS sequence_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_value' AS last_value,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'increment_by' AS increment_by,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'max_value' AS max_value,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'percent_utilized' AS percent_utilized
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd
			LEFT JOIN 
			       ( 	 SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'schema_name' AS schema_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'sequence_name' AS sequence_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'last_value' AS last_value,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'increment_by' AS increment_by,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'max_value' AS max_value,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'percent_utilized' AS percent_utilized
			        	FROM 	global.health_checkup_master hcm
			        	JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
			        	WHERE 	hcl.completed_at::date = pw_date
			            		AND hcm.catagory_code = checkup_catagory_code
			    ) AS pd ON cd.schema_name = pd.schema_name and cd.sequence_name = pd.sequence_name 
				AND cd.catagory_name = pd.catagory_name;


			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';

		ELSEIF checkup_catagory_code = 'IGR' THEN

			CREATE TEMP TABLE health_checkup_details AS 		
			SELECT 	cd.catagory_name,cd.report_date as report_date,
					cd.user_name as user_name,
					cd.table_schema as table_schema		
			FROM 	(
				       SELECT   hcm.catagory_name,completed_at :: date as report_date,
								jsonb_array_elements(hcl.log_result)::jsonb ->> 'user_name' AS user_name,
							    jsonb_array_elements(hcl.log_result)::jsonb ->> 'table_schema' AS table_schema  
				        FROM 	global.health_checkup_master hcm
				        JOIN 	global.health_checkup_logs hcl ON hcm.health_checkup_id = hcl.health_checkup_id
				        WHERE 	hcl.completed_at::date = current_date
				            	AND hcm.catagory_code = checkup_catagory_code
			    	) AS cd;
			
			_sql:= ' SELECT *, false as action_taken FROM health_checkup_details;';
			
		END IF;
	
	RAISE NOTICE 'final_query: %', _sql;
	OPEN $1 FOR execute _sql;
	RETURN $1;
		
END;
$function$;
