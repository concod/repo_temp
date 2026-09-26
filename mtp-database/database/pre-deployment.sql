--liquibase formatted sql
--changeset vishal.kumar@impactanalytics.co:pre_deployment_script runAlways:true stripComments:false splitStatements:false context:Current_Release labels:pre_deployment_script

DO $do$
DECLARE
	_cache_table_exists bool;
	_drop_stmt text;
BEGIN
	SELECT EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema  = 'cache'
		and table_name = 'request_tracker'
		  AND table_catalog = current_database()
	) INTO _cache_table_exists;
	if _cache_table_exists then
		DELETE FROM cache.request_tracker;
		
		for _drop_stmt in select concat('DROP TABLE IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(tablename) || ' cascade;') as drop_stmt from pg_tables where tablename ilike 'cache_result_%' and schemaname = 'cache' loop
			EXECUTE _drop_stmt;
		end loop;
		
		for _drop_stmt in select concat('DROP MATERIALIZED VIEW IF EXISTS "cache".' || quote_ident(matviewname) || ' cascade;') as drop_stmt from pg_matviews where schemaname = 'cache' and matviewname like 'cache_result_%' loop
			EXECUTE _drop_stmt;
		end loop;
	end if;
END;
$do$;

SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE datname = current_database()
and usename like '%impactanalytics.co';
