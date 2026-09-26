

--liquibase formatted sql
--changeset shaik.azmathulla:db_health_checkup_v2 runOnChange:true stripComments:false splitStatements:false context:db_health_checkup labels:db_health_checkup_v2
--comment: Initial changeset for db_health_checkup
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.db_health_checkup;
CREATE OR REPLACE PROCEDURE global.db_health_checkup()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.db_health_checkup';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	result_  jsonb;
	_log_id INT ;
	tbe_size INT;
	tbl_size bigint;
	vnt_size int ;
	li_size int ;
	part_size int ;
	twoi_size int;
	plta_size int;
	srn_size int;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	--Table bloat estimation size
	SELECT thresh_hold
	INTO tbe_size
	FROM global.health_checkup_master 
	WHERE catagory_code = 'TBE' AND catagory_name = 'Table bloat estimation' AND is_active;

	--Large indexes
	SELECT thresh_hold 
	INTO li_size
	FROM global.health_checkup_master 
	WHERE catagory_code = 'LI' AND catagory_name = 'Large indexes' AND is_active;

	--Partitions larger than average
	SELECT thresh_hold 
	INTO plta_size 
	FROM global.health_checkup_master 
	WHERE catagory_code = 'PLTA' AND catagory_name = 'Partitions larger than average' AND is_active;

	--Tables size
	SELECT thresh_hold 
	INTO tbl_size 
	FROM global.health_checkup_master 
	WHERE catagory_code = 'TS' AND catagory_name = 'Tables size' AND is_active;

	--Partition Size
	SELECT thresh_hold 
	INTO part_size 
	FROM global.health_checkup_master 
	WHERE catagory_code = 'PS' AND catagory_name = 'Partition Size' AND is_active;

	--Tables Without Index
	SELECT thresh_hold 
	INTO twoi_size
	FROM global.health_checkup_master 
	WHERE catagory_code = 'TWOI' AND catagory_name = 'Tables Without Index' AND is_active;
	
	--Serial Report
	SELECT thresh_hold 
	INTO srn_size
	FROM global.health_checkup_master 
	WHERE catagory_code = 'SRN' AND catagory_name = 'Serial Report' AND is_active;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'TBE' AND is_active)
	THEN
	
		-- Table bloat estimation
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'TBE' AND catagory_name = 'Table bloat estimation' AND is_active
		RETURNING log_id INTO _log_id;

		with foo as (
		  SELECT
		    schemaname, tablename, hdr, ma, bs,
		    SUM((1-null_frac)*avg_width) AS datawidth,
		    MAX(null_frac) AS maxfracsum,
		    hdr+(
		      SELECT 1+COUNT(*)/8
		      FROM pg_stats s2
		      WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
		    ) AS nullhdr
		  FROM pg_stats s, (
		    SELECT
		      (SELECT current_setting('block_size')::NUMERIC) AS bs,
		      CASE WHEN SUBSTRING(v,12,3) IN ('8.0','8.1','8.2') THEN 27 ELSE 23 END AS hdr,
		      CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma
		    FROM (SELECT version() AS v) AS foo
		  ) AS constants
		  GROUP BY 1,2,3,4,5  
		), rs as (
		  select 
		    ma,bs,schemaname,tablename,
		    (datawidth+(hdr+ma-(CASE WHEN hdr%ma=0 THEN ma ELSE hdr%ma END)))::NUMERIC AS datahdr,
		    (maxfracsum*(nullhdr+ma-(CASE WHEN nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
		  FROM foo  
		), sml as (
		  SELECT
		    schemaname, tablename, cc.reltuples, cc.relpages, bs,
		    CEIL((cc.reltuples*((datahdr+ma-
		      (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::FLOAT)) AS otta
		 FROM rs
		  JOIN pg_class cc ON cc.relname = rs.tablename
		  JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname 
		  AND nn.nspname not in (
		 'pg_catalog', 'information_schema', 'public'
		)
		AND tablename not like 'cache_result_%'
		  
		)
		, final as (
		SELECT
		  current_database(), schemaname, tablename, 
		  ROUND((CASE WHEN otta=0 THEN 0.0 ELSE sml.relpages::FLOAT/otta END)::NUMERIC,1) AS tbloat,
		  CASE WHEN sml.relpages < otta THEN 0 ELSE bs*(sml.relpages-otta)::BIGINT END AS wastedbytes, sml.reltuples as estimated_row_count,
		  ROUND(
		  CASE
		    WHEN relpages = 0 OR relpages < otta THEN 0.00
		    ELSE ((relpages - otta)::FLOAT / relpages)::NUMERIC * 100
		  END, 2
		) AS bloat_percent
		from sml )
		SELECT jsonb_agg(
			   jsonb_build_object('schema_name', schemaname,'table_name', tablename,'table_size', pg_total_relation_size(schemaname || '.' || tablename),
						   		  'bloat_size', ROUND((wastedbytes / 1048576.0)::NUMERIC, 0),
									 'bloat_percent', bloat_percent
						 		  ) ORDER BY bloat_percent DESC ) AS result
		INTO result_
		from final where bloat_percent > tbe_size ;

		UPDATE 	global.health_checkup_logs SET 	completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
		
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
				  	
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'UI' AND is_active)
	THEN
	
		-- Unused indexes 
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'UI' AND catagory_name = 'Unused indexes' AND is_active
		RETURNING log_id INTO _log_id;
	
		SELECT jsonb_agg(jsonb_build_object('schema_name', schemaname,'table_name', relname, 'index_name', indexrelname,
	           								'index_size', pg_relation_size(i.indexrelid),'idx_scan', idx_scan
	         								) ORDER BY idx_scan ASC, pg_relation_size(i.indexrelid) DESC
	       				) AS result
		INTO result_
		FROM pg_stat_user_indexes ui
		JOIN pg_index i ON ui.indexrelid = i.indexrelid
		WHERE NOT indisunique AND idx_scan < 50  -- Threshold: rarely used non-unique indexes
		AND pg_relation_size(i.indexrelid) > 10 * 1024 * 1024  ;-- Larger than 10MB
	
		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'II' AND is_active)
	THEN
	
		-- Invalid indexes
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'II' AND catagory_name = 'Invalid indexes' AND is_active
		RETURNING log_id INTO _log_id;
	
		SELECT jsonb_agg(jsonb_build_object('schema_name',  n.nspname,'table_name', c.relname , 'index_name',  i.relname )) AS result
		INTO result_
		FROM pg_catalog.pg_class c
		JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
		JOIN pg_catalog.pg_index x ON c.oid = x.indrelid
		JOIN pg_catalog.pg_class i ON i.oid = x.indexrelid
		LEFT JOIN pg_catalog.pg_constraint con ON con.conindid = x.indexrelid
		WHERE c.relkind = 'r' AND i.relkind = 'i' AND x.indisvalid = false
		AND n.nspname not in (
		 'pg_catalog', 'information_schema', 'public'
		)
		AND c.relname not like 'cache_result_%';
	
		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'CAS' AND is_active)
	THEN
	
		-- Current Autovacuum Status
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'CAS' AND catagory_name = 'Current Autovacuum Status' AND is_active
		RETURNING log_id INTO _log_id;
	
		SELECT jsonb_agg(jsonb_build_object('database_name',  datname,'user_name', usename , 'query',  query, 'status',state )) AS result
		INTO result_
		FROM pg_stat_activity 
		WHERE query LIKE '%vacuum%' AND pid <> pg_backend_pid() and datname = current_database();
	
		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'VNT' AND is_active)
	THEN
	
		-- Vacuum Needed Tables
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'VNT' AND catagory_name = 'Vacuum Needed Tables' AND is_active
		RETURNING log_id INTO _log_id;
	
		SELECT jsonb_agg( jsonb_build_object(
	           'schema_name', schemaname,
	           'table_name', relname,
	           'live_tup', n_live_tup,
	           'dead_tup', n_dead_tup,
	           'last_vacuum', last_vacuum,
	           'last_autovacuum', last_autovacuum,
	           'dead_tup_percent', round(n_dead_tup::numeric / n_live_tup * 100, 2)
	         ) ORDER BY round(n_dead_tup::numeric / n_live_tup * 100, 2) DESC
	       ) AS table_stats
		INTO result_
		FROM pg_stat_user_tables
		WHERE n_live_tup > 0 AND n_dead_tup > 50 AND round(n_dead_tup::numeric / n_live_tup * 100, 2) > vnt_size 
		AND schemaname not in (
		 'pg_catalog', 'information_schema', 'public'
		)
		AND relname not like 'cache_result_%' ;
	
		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
						  
	END IF;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'TWSS' AND is_active)
	THEN
	
		--Tables with stale statistics
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'TWSS' AND catagory_name = 'Tables with stale statistics' AND is_active
		RETURNING log_id INTO _log_id;
	
		SELECT jsonb_agg( jsonb_build_object( 'schema_name', schemaname,'table_name', relname,'last_analyze', last_analyze,'last_autoanalyze', last_autoanalyze,
	           				'n_mod_since_analyze', n_mod_since_analyze )ORDER BY n_mod_since_analyze DESC
	       				) AS table_stats
		INTO result_
		--select schemaname,relname,last_analyze,last_autoanalyze,n_mod_since_analyze,n_live_tup
		FROM pg_stat_user_tables
		WHERE (  (last_analyze IS NULL OR last_autoanalyze IS NULL) AND (n_mod_since_analyze > 100000) )
			AND schemaname not in (
		 'pg_catalog', 'information_schema', 'public'
		)
		AND relname not like 'cache_result_%' ;
		
	
		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
						  
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'TS' AND is_active)
	THEN
	
		--Tables size
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'TS' AND catagory_name = 'Tables size' AND is_active
		RETURNING log_id INTO _log_id;
		
		SELECT json_agg(json_build_object( 'schema_name', a.schema_name,'table_name', a.table_name,'table_size',table_size
	         	) ORDER BY table_size DESC
	         ) AS tables_info
		INTO result_
		from         
		(
		SELECT n.nspname as schema_name, c.relname AS table_name ,pg_relation_size(c.oid) as table_size
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relkind = 'r' 
		AND n.nspname not in (
		 'pg_catalog', 'information_schema', 'public'
		)
		AND c.relname not like 'cache_result_%'
		AND pg_total_relation_size(c.oid) > tbl_size::bigint * 1024*1024*1024   -- 1GB in bytes
		
		UNION ALL
		
		SELECT n.nspname as schema_name,parent.relname AS table_name,SUM(pg_total_relation_size(child.oid)) AS total_size
		FROM pg_inherits
		JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
		JOIN pg_namespace n ON n.oid = parent.relnamespace
		JOIN pg_class child ON pg_inherits.inhrelid = child.oid
		WHERE n.nspname not in ('pg_catalog', 'information_schema', 'public')
		AND parent.relname not like 'cache_result_%'
		and parent.relkind in ('p')
		GROUP BY n.nspname ,parent.relname
		having SUM(pg_total_relation_size(child.oid)) > tbl_size::bigint * 1024*1024*1024 
		) a ; 

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'LI' AND is_active)
	THEN
	
		--Large indexes
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'LI' AND catagory_name = 'Large indexes' AND is_active
		RETURNING log_id INTO _log_id;
	
		SELECT jsonb_agg( jsonb_build_object('schema_name', n.nspname,'table_name', t.relname,'index_name', i.relname,'index_size', pg_relation_size(i.oid)
		  									 )ORDER BY pg_relation_size(i.oid) DESC
						) AS index_info
		INTO result_
		FROM pg_class t
		JOIN pg_index x ON t.oid = x.indrelid
		JOIN pg_class i ON i.oid = x.indexrelid
		JOIN pg_namespace n ON n.oid = t.relnamespace
		WHERE t.relkind = 'r' AND n.nspname not in ('pg_catalog', 'information_schema', 'public')
		AND tablename not like 'cache_result_%' AND pg_relation_size(i.oid) > li_size::bigint * 1024*1024*1024 ;
	
		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF; 

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'PS' AND is_active)
	THEN
	
		--Partition Size
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'PS' AND catagory_name = 'Partition Size' AND is_active
		RETURNING log_id INTO _log_id;
	
		SELECT jsonb_agg( jsonb_build_object( 'parent_table', parent.relname, 'partition_name', child.relname,'partition_size', pg_relation_size(child.oid)
	  									 )ORDER BY pg_relation_size(child.oid) DESC
					) AS partitions_info
		INTO result_
		FROM pg_inherits
		JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
		JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
		JOIN pg_class child ON pg_inherits.inhrelid = child.oid
		WHERE parent.relkind = 'p'
		AND pg_relation_size(child.oid) > part_size::bigint * 1024*1024*1024 --Alert on partitions larger than 1GB
		and nmsp_parent.nspname not in ('pg_catalog', 'information_schema', 'public')
				AND parent.relname not like 'cache_result_%';

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'TWOI' AND is_active)
	THEN
	
		--Tables Without Index
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'TWOI' AND catagory_name = 'Tables Without Index' AND is_active
		RETURNING log_id INTO _log_id;

		WITH TableStats 
		AS (
		    SELECT t.schemaname, t.tablename, pg_relation_size(quote_ident(t.schemaname) || '.' || quote_ident(t.tablename)) as size_bytes,
		        	COALESCE(COUNT(i.indexname), 0) as index_count
		    FROM	pg_tables t
		    LEFT JOIN	pg_indexes i ON t.schemaname = i.schemaname AND t.tablename = i.tablename
		    WHERE t.schemaname not in ('pg_catalog', 'information_schema', 'public')
			AND t.tablename not like 'cache_result_%' and t.schemaname not like '%pg_temp_%'
			AND pg_relation_size(quote_ident(t.schemaname) || '.' || quote_ident(t.tablename)) > twoi_size::BIGINT * 1024*1024*1024
		    GROUP BY t.schemaname, t.tablename
			having COALESCE(COUNT(i.indexname), 0) = 0
		)
		SELECT jsonb_agg (jsonb_build_object( 'schema_name',schemaname,'table_name', tablename, 
									'table_size',size_bytes
								  ) order by size_bytes DESC
						) as table_details
		INTO result_
		FROM TableStats
		WHERE  index_count = 0   ;  -- Tables with 0 or 1 index

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'CPU-IQ' AND is_active)
	THEN
	
		--CPU-intensive queries currently running
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'CPU-IQ' AND catagory_name = 'CPU-intensive queries' AND is_active
		RETURNING log_id INTO _log_id;

		SELECT jsonb_agg (jsonb_build_object( 'user_name',usename,'query_start', query_start, 
									'duration',now() - query_start, 'query',query
								  ) order by now() - query_start DESC
						) as table_details
		INTO result_
		FROM pg_stat_activity
		WHERE state = 'active'
		AND wait_event_type IS NULL  AND pid <> pg_backend_pid()AND datname = current_database() ;
		
		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'IO-WQ' AND is_active)
	THEN
	
		--I/O-waiting queries
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'IO-WQ' AND catagory_name = 'I/O-waiting queries' AND is_active
		RETURNING log_id INTO _log_id;

		SELECT jsonb_agg (jsonb_build_object( 'user_name',usename,'query_start', query_start, 
									'duration',now() - query_start, 'query',query, 'wait_event_type',wait_event_type , 'wait_event',wait_event
								  ) order by now() - query_start DESC
						) as table_details
		INTO result_
		FROM pg_stat_activity
		WHERE wait_event_type IN ('IO', 'BufferPin', 'Lock', 'LWLock') AND pid <> pg_backend_pid() and datname = current_database();

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'IO-BD' AND is_active)
	THEN
	
		--I/O-bottleneck detection
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'IO-BD' AND catagory_name = 'I/O-bottleneck detection' AND is_active
		RETURNING log_id INTO _log_id;

		SELECT jsonb_agg (jsonb_build_object( 'database_name',datname,'blocked_reads', blks_read, 
									'blocked_hits',blks_hit, 'cache_hit_ratio',blks_hit::float / (blks_read + blks_hit), 
									'returned_tuples',tup_returned , 'fetched_tuples',tup_fetched,
									'inserted_tuples',tup_inserted , 'updated_tuples',tup_updated, 'deleted_tuples',tup_deleted,
									'current_datetime' ,concat(current_date,' ',current_time)
								  ) order by blks_hit::float / (blks_read + blks_hit) ASC
						) as table_details
		INTO result_
		FROM pg_stat_database
		WHERE datname = current_database();

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'PLTA' AND is_active)
	THEN
	
		--Partitions larger than average
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'PLTA' AND catagory_name = 'Partitions larger than average' AND is_active
		RETURNING log_id INTO _log_id;

		
		WITH partition_sizes
		AS (
			  SELECT
			  	parent.relname as parent_table,
			    child.relname as partition_name,
			    pg_stat_get_live_tuples(child.oid) as row_count,
			    pg_relation_size(child.oid) as size_in_bytes
			  FROM pg_inherits
			  JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
			  JOIN pg_class child ON pg_inherits.inhrelid = child.oid
			  JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace
			  JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
			  WHERE parent.relkind = 'p' 
			   and nmsp_parent.nspname not in ('pg_catalog', 'information_schema', 'public')
				AND parent.relname not like 'cache_result_%'
			)
			, 
			avg_size AS (
			  SELECT parent_table,AVG(size_in_bytes) as avg_size_in_bytes
			  FROM partition_sizes
			  --where parent_table like '%gurobi%'
			  group by parent_table
			)

		SELECT jsonb_agg (jsonb_build_object( 'parent_table',ps.parent_table,'partition_name', ps.partition_name, 
									'partition_size',size_in_bytes, 'avg_partition_size',avg_size_in_bytes,
									'percent_above_avg', ROUND(100.0 * (ps.size_in_bytes - a.avg_size_in_bytes) / a.avg_size_in_bytes, 2)
								  ) order by size_in_bytes ASC
						) as table_details
		INTO result_
		FROM partition_sizes ps
		JOIN avg_size a on ps.parent_table = a.parent_table
		WHERE size_in_bytes > 1::bigint * 1024*1024*1024 AND (size_in_bytes >= avg_size_in_bytes) 
		AND ROUND(100.0 * (ps.size_in_bytes - a.avg_size_in_bytes) / a.avg_size_in_bytes, 2) > plta_size ;

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'SRN' AND is_active)
	THEN

		--Serial Report
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'SRN' AND catagory_name = 'Serial Report' AND is_active
		RETURNING log_id INTO _log_id;

		SELECT jsonb_agg (jsonb_build_object( 'schema_name',schema_name,'sequence_name', sequence_name, 
									'last_value',last_value, 'increment_by',increment_by,'max_value',max_value,
									'percent_utilized', percent_utilized
								  )
						) as table_details
		INTO result_
		FROM
		(
			SELECT 	schemaname AS schema_name,sequencename AS sequence_name,last_value,increment_by,max_value,
	    			ROUND(100.0 * last_value / max_value, 4) AS percent_utilized
			FROM 	pg_sequences
			WHERE 	max_value IS NOT NULL
			AND schemaname not in (
					 'pg_catalog', 'information_schema', 'public'
					)
					AND sequencename not like 'cache_result_%' 
					and ROUND(100.0 * last_value / max_value, 4)  > 60
			ORDER BY percent_utilized DESC
		) a;

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		
	END IF ;

	IF EXISTS (SELECT 1 FROM global.health_checkup_master WHERE catagory_code = 'IGR' AND is_active)
	THEN

		--Individual Generic Role
		INSERT INTO global.health_checkup_logs(health_checkup_id,status)
		SELECT 	health_checkup_id, 'P' AS status
		FROM	global.health_checkup_master 
		WHERE   catagory_code = 'IGR' AND catagory_name = 'Individual Generic Role' AND is_active
		RETURNING log_id INTO _log_id;
	
		with cte as 
		(
		--individual generic role
		SELECT  u.rolname AS user_name,r.rolname AS assigned_role
		FROM	pg_auth_members m
		JOIN 	pg_roles u ON m.member = u.oid
		JOIN 	pg_roles r ON m.roleid = r.oid
		WHERE 	r.rolname not in ('mtp-dev','mtp-readonly','mtp-uat-readonly') 
			 	and u.rolname like '%@impactanalytics.co%'
		     	and u.rolcanlogin = true
		)
		SELECT jsonb_agg (jsonb_build_object( 'user_name',grantee,'table_schema', table_schema) ) as table_details
		INTO result_
		--SELECT 	grantee as user_name, table_schema
		FROM 	information_schema.role_table_grants
		WHERE	grantee in (select user_name from  cte)  -- Replace with your read-only role name
				and table_schema <> 'public'
		        AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
		GROUP BY grantee,table_schema;

		UPDATE 	global.health_checkup_logs SET completed_at = NOW(),log_result = result_,status= 'S'
		WHERE 	log_id =_log_id;
	
		UPDATE global.health_checkup_master AS cm
		SET  last_run_status = 'S',
    		 last_run_date = CURRENT_DATE
		FROM global.health_checkup_logs AS cl
		WHERE  cm.health_checkup_id = cl.health_checkup_id 
    	AND cl.log_id = _log_id;

		INSERT INTO global.health_checkup_summary (health_checkup_id,max_log_id,summary_date,health_summary)
		SELECT cm.health_checkup_id,log_id as max_log_id,last_run_date as summary_date,coalesce (jsonb_array_length(log_result),0) as health_summary 
		FROM global.health_checkup_master cm
		JOIN global.health_checkup_logs cl using (health_checkup_id)
		WHERE cl.log_id = _log_id
		AND NOT EXISTS (SELECT 1 FROM global.health_checkup_summary hcs 
						  WHERE  cm.health_checkup_id = hcs.health_checkup_id AND cl.log_id = hcs.max_log_id AND cm.last_run_date = hcs.summary_date);
		

	END IF ;
	
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
