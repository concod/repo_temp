--liquibase formatted sql
--changeset liquibase:build_store_attributes_filter_delta runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_store_attributes_filter_delta
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.build_store_attributes_filter_delta();
CREATE OR REPLACE PROCEDURE global.build_store_attributes_filter_delta()
 LANGUAGE plpgsql
AS $procedure$
declare
	_sql text;
	_final_cols_list text;
	_final_cols_list_excluded text;
	_final_cols_list_sa text;
	_final_cols_list_saf text;
	_sync_sql text;
	_worker text;
    _log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.build_store_attributes_filter_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  
        /* ------------------------------------------------------------------------
        -------------------------- Get required cols list -------------------------
        ------------------------------------------------------------------------ */
        select 
          string_agg('"' || generic_column_name || '"', ', '), 
          string_agg(concat('excluded.', '"' || generic_column_name || '"'), ', '),
          string_agg(concat('sa.', '"' || generic_column_name || '"'), ', '),
          string_agg(concat('saf.', '"' || generic_column_name || '"'), ', ') into _final_cols_list, 
          _final_cols_list_excluded, 
          _final_cols_list_sa,
          _final_cols_list_saf
        from 
          (
            select 
              generic_column_name
            from 
              global.store_generic_schema_mapping 
            where 
              required_in_product and generic_column_name not in ('dc_code')
            union 
            select 
              column_name as generic_column_name 
            from 
              information_schema."columns" c 
            where 
              table_name = 'store_master' 
              and table_schema = 'global'
          ) x;
        select 
          ' SELECT * FROM 
		  	(
		    	SELECT sm.* 
				FROM global.store_master sm 
				JOIN public.store_delta_table sdt USING(store_code)
			) sm ' || string_agg(_tsql, ' ') into _sql
        from 
          (
            select 
              'LEFT JOIN (SELECT store_code, attribute_value::' || _attr_dt || ' AS ' || _attr || ' FROM global.store_attributes WHERE attribute_name = ''' || _attr || ''') X' || _counter || ' USING(store_code)' as _tsql 
            from 
              (
                select 
                  generic_column_name as _attr, 
                  generic_column_datatype as _attr_dt, 
                  row_number() OVER () as _counter 
                from 
                  global.store_generic_schema_mapping pgsm 
                where 
                  required_in_product 
                  and is_attribute 
				  and generic_column_name not in ('dc_code')
                order by 
                  hierarchy_level asc
              ) x
          ) x;
		
        /* ------------------------------------------------------------------------
        ------------------------------- Ingestion ---------------------------------
        ------------------------------------------------------------------------ */
		_log_step := 'new saf calculate';
		perform set_config('local.log_step', _log_step, true);
		SELECT async_query INTO _worker FROM public.async_query('call global.build_list_partitions(''store_attributes_filter'');');
        PERFORM public.async_query_status(_worker, 'cleanup');

		SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.saf_delete, public.new_saf, public.new_saf_delta;');
        PERFORM public.async_query_status(_worker, 'cleanup');

		SELECT async_query INTO _worker FROM public.async_query('create table public.new_saf as ' || _sql);
        PERFORM public.async_query_status(_worker, 'cleanup');
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		
		_log_step := 'saf upsert';
		perform set_config('local.log_step', _log_step, true);
        _sync_sql := 'insert into global.store_attributes_filter (' || _final_cols_list || ') 
        select ' || _final_cols_list || '
        from public.new_saf {where}
        on conflict(store_code) do 
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
          rows;', 50, 'public.new_saf', 'store_code', 'new_saf_idx', 2000);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;
