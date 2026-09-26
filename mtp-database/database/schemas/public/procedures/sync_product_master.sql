--liquibase formatted sql
--changeset arun.thamma@impactanalytics.co:sync_product_master runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for sync_product_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_master();
CREATE OR REPLACE PROCEDURE public.sync_product_master()
 LANGUAGE plpgsql
-- SECURITY DEFINER
AS $procedure$
    declare
		_worker text;
		_st TIMESTAMP := clock_timestamp();
		_sql text;
		_final_cols_list text;
		_final_cols_list_excluded text;
		_final_cols_list_pm text;
		_final_cols_list_pvt text;
		_sync_sql text;
		_log_code varchar := gen_random_uuid();
		_sp_name varchar := 'public.sync_product_master';
		_log_step varchar;
    begin
		perform set_config('local.log_code', _log_code, true);
		perform set_config('local.sp_name', _sp_name, true);
		begin
			/* ------------------------------------------------------------------------
			----------- Mark inactive and deleted if not receive in pvt -----------
			------------------------------------------------------------------------ */
			call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
			-- created_at, updated_at, created_by, updated_by, replacement_product_codes, reference_product_codes, is_deleted must not be in pvt
			select 
			  string_agg('"' || generic_column_name || '"', ', '), 
			  string_agg(concat('excluded.', '"' || generic_column_name || '"'), ', '),
			  string_agg(concat('pm.', '"' || generic_column_name || '"'), ', '),
			  string_agg(concat('pvt.', '"' || generic_column_name || '"'), ', ')
			into _final_cols_list, 
			  _final_cols_list_excluded, 
			  _final_cols_list_pm, 
			  _final_cols_list_pvt 
			from 
			  "global".product_generic_schema_mapping pgsm 
			where 
			  required_in_product 
			  and not is_attribute;

			_log_step := 'pm update is_deleted';
			perform set_config('local.log_step', _log_step, true);

			SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.pm_delete, public.pm_delta;');
	        PERFORM public.async_query_status(_worker, 'cleanup');

			_sql :='
			CREATE TABLE public.pm_delete AS 
			select pm.product_code from global.product_master pm left join public.product_validated_table pvt
			using(product_code) where pvt.product_code is null and not(
				pm.active = false and pm.is_deleted = true
			);';
			SELECT async_query INTO _worker FROM public.async_query(_sql);
			PERFORM public.async_query_status(_worker, 'cleanup');
			_sql := 'WITH rows AS (
				UPDATE global.product_master set active = false, is_deleted = true {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;';
			PERFORM public.parellel_insert(_sql, 50, 'public.pm_delete', 'product_code', 'pm_delete_product_code_pk', 2000);
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
	
			/* ------------------------------------------------------------------------
			------------------------------- Ingestion ---------------------------------
			------------------------------------------------------------------------ */
			_log_step := 'pm delta calculate';
			perform set_config('local.log_step', _log_step, true);

			_sql := '
			CREATE TABLE public.pm_delta AS 
			with pm as (
				select ' || _final_cols_list || ' from global.product_master
			),
			pvt as (
				select ' || _final_cols_list || ' from public.product_validated_table
			)
			select product_code
			from pvt left join pm using(product_code)
			where (' || _final_cols_list_pvt || ') is distinct from (' || _final_cols_list_pm || ')';
			SELECT async_query INTO _worker FROM public.async_query(_sql);
			PERFORM public.async_query_status(_worker, 'cleanup');
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null,  (clock_timestamp() - _st)::text, null);

			_log_step := 'parellel_insert';
			perform set_config('local.log_step', _log_step, true);

			_sync_sql := 'insert into global.product_master (' || _final_cols_list || ', is_deleted) 
			select ' || _final_cols_list_pvt || ', false
			from public.product_validated_table pvt {where}
			on conflict(product_code) do 
			update 
			set (' || _final_cols_list || ', is_deleted, updated_at) = (' || _final_cols_list_excluded || ', false, now())';
			perform public.parellel_insert('WITH rows AS (
				' || _sync_sql || '
				RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.pm_delta', 'product_code', 'pm_delta_idx', 2000);
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
