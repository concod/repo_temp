
--liquibase formatted sql
--changeset shaik.azmathulla:build_product_hierarchies_filter_rt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_hierarchies_filter_rt
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.build_product_hierarchies_filter_rt();

CREATE OR REPLACE PROCEDURE global.build_product_hierarchies_filter_rt()
LANGUAGE 'plpgsql'
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_hierarchies_filter_rt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _attr text;
    _hl int;
    _jsonb_cols text[];
--    _h_sqls text[];
    _h_cols text[];
    _combine_sql text;
	_product_phf_sql text;
	_article_phf_sql text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		set work_mem = '10GB';
	    for _attr, _hl in
	        select
	            generic_column_name,
	            hierarchy_level
	        from
	            "global".product_generic_schema_mapping
	        where
	            required_in_product and is_hierarchy
	        order by
	            hierarchy_level asc loop
	        _jsonb_cols := array_append(_jsonb_cols, '''' || _attr || '''');
	        _jsonb_cols := array_append(_jsonb_cols, '(CASE WHEN ' || _attr || ' IS NULL THEN ''-'' ELSE ' || _attr || ' END)');
	        _h_cols := array_append(_h_cols, _attr);
			if _attr = 'article' then
	        	_article_phf_sql := 'select JSONB_BUILD_OBJECT(' || (array_to_string(_jsonb_cols, ', ', '')) || ') as path, ' || _hl || ' AS level from global.product_attributes_filter paf WHERE article IN (SELECT article FROM public.product_delta_table_rt group by 1) GROUP BY ' || array_to_string(_h_cols, ', ', '');
			end if;
			if _attr = 'product_code' then
	        	_product_phf_sql := 'select JSONB_BUILD_OBJECT(' || (array_to_string(_jsonb_cols, ', ', '')) || ') as path, ' || _hl || ' AS level from global.product_attributes_filter paf WHERE product_code IN (SELECT product_code FROM public.product_delta_table_rt group by 1) GROUP BY ' || array_to_string(_h_cols, ', ', '');
			end if;
	    end loop;
	    _product_phf_sql := '
	        CREATE 
			TEMP TABLE
	          product_hierarchies_filter_product_temp AS
	        SELECT
	          x.path,
	          x.level
	        FROM (' || _product_phf_sql || ') X
	        GROUP BY 1,2;';
		raise notice '_product_phf_sql: %', _product_phf_sql;
	    _article_phf_sql := '
	        CREATE 
			TEMP TABLE
	          product_hierarchies_filter_article_temp AS
	        SELECT
	          x.path,
	          x.level
	        FROM (' || _article_phf_sql || ') X
	        GROUP BY 1,2;';
		raise notice '_article_phf_sql: %', _article_phf_sql;
		DROP TABLE IF EXISTS product_hierarchies_filter_product_temp;
	    DROP TABLE IF EXISTS product_hierarchies_filter_article_temp;
	    execute _product_phf_sql;
		execute _article_phf_sql;
--
	    ALTER TABLE product_hierarchies_filter_product_temp ADD CONSTRAINT product_hierarchies_filter_product_temp_un UNIQUE (path, level);
		ALTER TABLE product_hierarchies_filter_article_temp ADD CONSTRAINT product_hierarchies_filter_article_temp_un UNIQUE (path, level);
		
	  -- updating the existing hierarchy_codes for change at product_code level
	    UPDATE global.product_hierarchies_filter t1
	    SET path = t2.path, updated_at = now()
	    FROM product_hierarchies_filter_product_temp t2
	    WHERE t1.path->>'product_code' = t2.path->>'product_code'
	    and t1.level = t2.level
	    and t1.path != t2.path
	    and t1.path->>'product_code' is not null
	    and t1.active = true;
--	
	  -- inserting the remaining records from temp table 
		insert into global.product_hierarchies_filter("path", "level") 
		select 
		  "path", 
		  "level" 
		from 
		  (select * from product_hierarchies_filter_article_temp union all select * from product_hierarchies_filter_product_temp) x on conflict("path", "level") do 
		update 
		set 
		  active = true
		  where excluded."path" not in (
		    SELECT t1.path
		          FROM global.product_hierarchies_filter t1
		          join product_hierarchies_filter_product_temp t2
		          on t1.path->>'product_code' = t2.path->>'product_code'
		          and t1.level = t2.level
		          and t1.path = t2.path
		          WHERE t1.path->>'product_code' IS NOT NULL
		              AND t1.active = true
		  );
	--
		UPDATE 
		  global.product_hierarchies_filter 
		SET 
		  active = false, 
		  updated_at = now() 
		WHERE 
		  hierarchy_code IN (
		    SELECT 
		      hierarchy_code
		    FROM 
		      (select * from global.product_hierarchies_filter where path->>'article' in (SELECT article FROM public.product_delta_table_rt group by 1) and active) t1 
		      LEFT JOIN (select * from product_hierarchies_filter_product_temp union all select * from product_hierarchies_filter_article_temp) t2 using("path", "level") 
		    WHERE 
		      t2."path" is null
		  );
	    DROP TABLE IF EXISTS product_hierarchies_filter_product_temp;
		DROP TABLE IF EXISTS product_hierarchies_filter_article_temp;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$;