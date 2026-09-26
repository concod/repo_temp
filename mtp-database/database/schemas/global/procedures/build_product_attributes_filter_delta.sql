--liquibase formatted sql
--changeset liquibase:build_product_attributes_filter_delta runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_attributes_filter_delta
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.build_product_attributes_filter_delta();
CREATE OR REPLACE PROCEDURE global.build_product_attributes_filter_delta()
LANGUAGE 'plpgsql'
AS $procedure$
declare
	_sql text;
	_final_cols_list text;
	_final_cols_list_excluded text;
	_final_cols_list_pa text;
	_final_cols_list_paf text;
	_sync_sql text;
	_worker text;
    _log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_product_attributes_filter_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
  _p_cnt INT;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

  	SELECT COUNT(*) AS cnt 
		INTO _p_cnt
		FROM global.product_master pm
		WHERE NOT EXISTS( SELECT 1 FROM global.product_attributes  pa 
						   WHERE pm.product_code = pa.product_code AND attribute_name = 'l0_name');

		IF _p_cnt > 0 THEN 
		
		 RAISE EXCEPTION 'Ingestion needs attention: % products without attributes.', _p_cnt;
		 
	  END IF;
        /* ------------------------------------------------------------------------
        -------------------------- Get required cols list -------------------------
        ------------------------------------------------------------------------ */
        select 
          string_agg('"' || generic_column_name || '"', ', '), 
          string_agg(concat('excluded.', '"' || generic_column_name || '"'), ', '),
          string_agg(concat('pa.', '"' || generic_column_name || '"'), ', '),
          string_agg(concat('paf.', '"' || generic_column_name || '"'), ', ') into _final_cols_list, 
          _final_cols_list_excluded, 
          _final_cols_list_pa,
          _final_cols_list_paf
        from 
          (
            select 
              generic_column_name
            from 
              global.product_generic_schema_mapping 
            where 
              required_in_product and generic_column_name not in ('product_tag', 'ordering', 'sku_grade', 
	        'clearance_article', 'product_direct_channel', 
	        'articlestatustag', 'replenishment_status',
	        'psa_codes', 'rcl_hash')
            union 
            select 
              column_name as generic_column_name 
            from 
              information_schema."columns" c 
            where 
              table_name = 'product_master' 
              and table_schema = 'global'
          ) x;
        select 
          ' SELECT * FROM 
		  	(
		    	SELECT pm.* 
				FROM global.product_master pm 
				JOIN public.product_delta_table pdt USING(product_code)
			) pm ' || string_agg(_tsql, ' ') into _sql
        from 
          (
            select 
              'LEFT JOIN (SELECT product_code, attribute_value::' || _attr_dt || ' AS ' || _attr || ' FROM global.product_attributes WHERE attribute_name = ''' || _attr || ''') X' || _counter || ' USING(product_code)' as _tsql 
            from 
              (
                select 
                  generic_column_name as _attr, 
                  generic_column_datatype as _attr_dt, 
                  row_number() OVER () as _counter 
                from 
                  global.product_generic_schema_mapping pgsm 
                where 
                  required_in_product 
                  and is_attribute 
                order by 
                  hierarchy_level asc
              ) x
          ) x;
		
        /* ------------------------------------------------------------------------
        ------------------------------- Ingestion ---------------------------------
        ------------------------------------------------------------------------ */
		_log_step := 'new paf calculate';
		perform set_config('local.log_step', _log_step, true);
		SELECT async_query INTO _worker FROM public.async_query('call global.build_list_partitions(''product_attributes_filter'');');
        PERFORM public.async_query_status(_worker, 'cleanup');

		SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.paf_delete, public.new_paf, public.new_paf_delta;');
        PERFORM public.async_query_status(_worker, 'cleanup');

		SELECT async_query INTO _worker FROM public.async_query('create table public.new_paf as ' || _sql);
        PERFORM public.async_query_status(_worker, 'cleanup');
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		------------------------------------------------------------------------
		
		_log_step := 'paf upsert';
		perform set_config('local.log_step', _log_step, true);
        _sync_sql := 'insert into global.product_attributes_filter (' || _final_cols_list || ') 
        select ' || _final_cols_list || '
        from public.new_paf {where}
        on conflict(product_code, l0_name) do 
        update 
        set (' || _final_cols_list || ') = (' || _final_cols_list_excluded || ')';
        raise notice '_sync_sql: %', _sync_sql;
        perform public.parellel_insert('WITH rows AS (
            ' || _sync_sql || '
            RETURNING 1
        ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;', 50, 'public.new_paf', 'product_code', 'new_paf_idx', 2000);
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		
        /* ------------------------------------------------------------------------
        ----------------------- Cleanup for old l0_names --------------------------
        ------------------------------------------------------------------------ */
		_log_step := 'calculate products with old l0 names';
		perform set_config('local.log_step', _log_step, true);
        _sql :='CREATE TABLE public.paf_delete AS 
        SELECT 
          product_code, 
          l0_name 
        FROM 
          global.product_attributes_filter paf 
        WHERE 
          NOT EXISTS(
            SELECT 
              1 
            FROM 
              global.product_attributes pa 
            where 
              attribute_name = ''l0_name'' 
              and paf.product_code = pa.product_code 
              and paf.l0_name = pa.attribute_value
          );';
        SELECT async_query INTO _worker FROM public.async_query(_sql);
        PERFORM public.async_query_status(_worker, 'cleanup');
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		
		------------------------------------------------------------------------
		
		_log_step := 'deleting products with old l0 names';
		perform set_config('local.log_step', _log_step, true);
        _sql := 'WITH rows AS (
        DELETE FROM 
          global.product_attributes_filter paf {where} 
          AND EXISTS(
            SELECT 
              1 
            FROM 
              public.paf_delete pd 
            WHERE 
              paf.product_code = pd.product_code 
              and paf.l0_name = pd.l0_name
          ) RETURNING 1
        ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;';
        PERFORM public.parellel_insert(_sql, 50, 'public.paf_delete', 'product_code', 'paf_delete_product_code_pk', 500);
		------------------------------------------------------------------------
--		can not cleanup public.paf_delete, public.new_paf, public.new_paf_delta as it's pass as input to above parellel_insert query will lock this SP
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null,  (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;
