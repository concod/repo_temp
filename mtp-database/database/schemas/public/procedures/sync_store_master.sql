--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:sync_store_master runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for sync_store_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_master();
CREATE OR REPLACE PROCEDURE public.sync_store_master()
 LANGUAGE plpgsql
-- SECURITY DEFINER
AS $procedure$
    declare
		_worker text;
		_st TIMESTAMP := clock_timestamp();
		_sql text;
		_final_cols_list text;
		_final_cols_list_excluded text;
		_final_cols_list_sm text;
		_final_cols_list_svt text;
		_sync_sql text;
		_log_code varchar := gen_random_uuid();
		_sp_name varchar := 'public.sync_store_master';
		_log_step varchar;
    begin
		perform set_config('local.log_code', _log_code, true);
		perform set_config('local.sp_name', _sp_name, true);
		begin
			/* ------------------------------------------------------------------------
			----------- Mark inactive and deleted if not receive in svt -----------
			------------------------------------------------------------------------ */
			call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
			-- created_at, updated_at, created_by, updated_by, is_deleted must not be in svt
			select 
			  string_agg('"' || generic_column_name || '"', ', '), 
			  string_agg(concat('excluded.', '"' || generic_column_name || '"'), ', '),
			  string_agg(concat('sm.', '"' || generic_column_name || '"'), ', '),
			  string_agg(concat('svt.', '"' || generic_column_name || '"'), ', ')
			into _final_cols_list, 
			  _final_cols_list_excluded, 
			  _final_cols_list_sm, 
			  _final_cols_list_svt 
			from 
			  "global".store_generic_schema_mapping pgsm 
			where 
			  required_in_product 
			  and not is_attribute;

			_log_step := 'sm update is_deleted';
			perform set_config('local.log_step', _log_step, true);

			SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.sm_delete, public.sm_delta;');
	        PERFORM public.async_query_status(_worker, 'cleanup');

			_sql :='
			CREATE TABLE public.sm_delete AS 
			select sm.store_code from global.store_master sm left join public.store_validated_table svt
			using(store_code) where svt.store_code is null and not(
				sm.active = false and sm.is_deleted = true
			);';
			SELECT async_query INTO _worker FROM public.async_query(_sql);
			PERFORM public.async_query_status(_worker, 'cleanup');
			_sql := 'WITH rows AS (
				UPDATE global.store_master set active = false, is_deleted = true {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;';
			PERFORM public.parellel_insert(_sql, 50, 'public.sm_delete', 'store_code', 'sm_delete_store_code_pk', 2000);
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
	
			/* ------------------------------------------------------------------------
			------------------------------- Ingestion ---------------------------------
			------------------------------------------------------------------------ */
			_log_step := 'sm delta calculate';
			perform set_config('local.log_step', _log_step, true);

			_sql := '
			CREATE TABLE public.sm_delta AS 
			with sm as (
				select ' || _final_cols_list || ' from global.store_master
			),
			svt as (
				select ' || _final_cols_list || ' from public.store_validated_table
			)
			select store_code
			from svt left join sm using(store_code)
			where (' || _final_cols_list_svt || ') is distinct from (' || _final_cols_list_sm || ')';
			SELECT async_query INTO _worker FROM public.async_query(_sql);
			PERFORM public.async_query_status(_worker, 'cleanup');
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null,  (clock_timestamp() - _st)::text, null);

			_log_step := 'parellel_insert';
			perform set_config('local.log_step', _log_step, true);

			_sync_sql := 'insert into global.store_master (' || _final_cols_list || ', is_deleted) 
			select ' || _final_cols_list_svt || ', false
			from public.store_validated_table svt {where}
			on conflict(store_code) do 
			update 
			set (' || _final_cols_list || ', is_deleted, updated_at) = (' || _final_cols_list_excluded || ', false, now())';
			perform public.parellel_insert('WITH rows AS (
				' || _sync_sql || '
				RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.sm_delta', 'store_code', 'sm_delta_idx', 2000);
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null,  (clock_timestamp() - _st)::text, null);
		exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
		end;
			call global.data_ingestion_logs(_log_code, _sp_name, 'end', null,  (clock_timestamp() - _st)::text, null);
    end
$procedure$
;
