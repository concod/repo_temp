--liquibase formatted sql
--changeset liquibase:clean_caches runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for clean_caches
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS cache.clean_caches();
CREATE OR REPLACE PROCEDURE cache.clean_caches()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 /*
 * Function/Procedure name: global.clean_cache
 * Created by: Ashish Gupta
 * Created at: 29-Dec-2022
 * No of input parameter: 0
 * Parameter Description: 
 * if any modification done in same function/procedure please record the changes in below format
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 */
	declare
	  _mv_id text;
	begin
--		delete from 
--		  cache.request_tracker;
		delete
		from
			cache.request_tracker
		where
			req_code in (
			select
				req_code
			from
				(
				select
					req_code,
					bool_and(
					    rd.tu = psu.n_tup_upd 
					    and rd.ti = psu.n_tup_ins 
					    and rd.td = psu.n_tup_del 
					    and rd.thu = psu.n_tup_hot_upd 
					    and rd.lt = psu.n_live_tup 
					    and rd.dt = psu.n_dead_tup
					  ) as is_valid
				from
					cache.request_dependencies rd
				left join pg_stat_user_tables psu on
					split_part(dep_name, '.', 1) = psu.schemaname
						and split_part(dep_name, '.', 2) = psu.relname
					group by
						req_code) x
			where
				not is_valid);
		-- delete outdated cache
		delete FROM 
		  cache.request_tracker 
		WHERE 
		  NOT (
		    req_code IN (
		      SELECT 
		        max(req_code) AS max 
		      FROM 
		        cache.request_tracker 
		      GROUP BY 
		        payload
		    )
		  );
		delete from 
		  cache.request_tracker 
		where 
		  req_code in(
		    select 
		      req_code 
		    from 
		      cache.request_data 
		    where 
		      value->>'table' not in(
		        select 
		          matviewname 
		        from 
		          pg_matviews 
		        where 
		          schemaname = 'cache'
		      )
		  );
		-- delete unlinked cache
		for _mv_id in 
		select 
		  matviewname 
		from 
		  pg_matviews 
		where 
		  schemaname = 'cache' 
		  and matviewname like 'cache_result_%' 
		  and matviewname not in(
		    select 
		      value->>'table' 
		    from 
		      cache.request_data
		  ) loop execute 'DROP MATERIALIZED VIEW IF EXISTS "cache"."' || _mv_id || '" CASCADE;';
		end loop;
	end
$procedure$
;
