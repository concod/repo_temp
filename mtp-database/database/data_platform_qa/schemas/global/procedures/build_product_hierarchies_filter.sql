--liquibase formatted sql
--changeset liquibase:build_product_hierarchies_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_hierarchies_filter
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.build_product_hierarchies_filter();
CREATE OR REPLACE PROCEDURE global.build_product_hierarchies_filter()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _attr text;
    _hl int;
    _jsonb_cols text[];
    _h_sqls text[];
    _h_cols text[];
    _combine_sql text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_hierarchies_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
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
        _h_sqls := array_append(_h_sqls, 'select JSONB_BUILD_OBJECT(' || (array_to_string(_jsonb_cols, ', ', '')) || ') as path, ' || _hl || ' AS level from global.product_attributes_filter GROUP BY ' || (array_to_string(_h_cols, ', ', '')));
    end loop;
    _combine_sql := '
        CREATE 
		TEMP TABLE
          product_hierarchies_filter_temp AS
        SELECT
          x.path,
          x.level
        FROM (' || array_to_string(_h_sqls, ' UNION ALL ', '') || ') X
        GROUP BY 1,2;';
	-- raise notice '_combine_sql: %', _combine_sql;
    DROP TABLE IF EXISTS product_hierarchies_filter_temp;
    execute _combine_sql;
  --fetching and inserting records which are going to be updated into expired_products table
    insert into global.expired_products 
          SELECT t1."path", t1."level"
          FROM global.product_hierarchies_filter t1
          join product_hierarchies_filter_temp t2
          on t1.path->>'product_code' = t2.path->>'product_code'
          and t1.level = t2.level
          and t1.path != t2.path
          WHERE t1.path->>'product_code' IS NOT NULL
              AND t1.active = true;

  --updating the existing hierarchy_codes for change at product_code level
    UPDATE global.product_hierarchies_filter  t1
    SET path = t2.path, updated_at = now()
    FROM product_hierarchies_filter_temp  t2
    WHERE t1.path->>'product_code' = t2.path->>'product_code'
    and t1.level = t2.level
    and t1.path != t2.path
    and t1.path->>'product_code' is not null
    and t1.active = true
    	;

  --inserting the remaining records from temp table 
	insert into global.product_hierarchies_filter("path", "level") 
	select 
	  "path", 
	  "level" 
	from 
	  product_hierarchies_filter_temp on conflict("path", "level") do 
	update 
	set 
	  active = true
  where excluded."path" not in (
    SELECT t1.path
          FROM global.product_hierarchies_filter t1
          join product_hierarchies_filter_temp t2
          on t1.path->>'product_code' = t2.path->>'product_code'
          and t1.level = t2.level
          and t1.path = t2.path
          WHERE t1.path->>'product_code' IS NOT NULL
              AND t1.active = true
              
  );

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
	      global.product_hierarchies_filter t1 
	      LEFT JOIN product_hierarchies_filter_temp t2 using("path", "level") 
	    WHERE 
	      t1.active = true 
	      and t2."path" is null
	  );
    DROP TABLE IF EXISTS product_hierarchies_filter_temp;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;

