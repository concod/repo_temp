--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:sync_hybrid_attributes_with_rcl_support_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:DGAP-300-3
--comment: added set_week and inner_pack_size cte 2
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_hybrid_attributes();
CREATE OR REPLACE PROCEDURE public.sync_hybrid_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_hybrid_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_rcl_hash text;
	_rcl_levels text;
	_worker text;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select 
		  string_agg(distinct v, ' || ') into _rcl_hash 
		from 
		  (
		    select 
		      'jsonb_build_object(' || global.get_rcl_hash_query_v2(rcl_code, level) || ')' as v,
		      unnest(level) as l 
		    from 
		      global.rcl_master 
		    where 
		      not is_deleted
		  ) x;
		perform public.parellel_insert('WITH rows AS (
			update 
			  global.product_attributes_filter t1 
			set 
			  rcl_hash = coalesce(t2.rcl_hash, ''{}''::jsonb),
			  l0_status = t2.l0_status,
			  allocation_status_flag = t2.allocation_status_flag,
			  set_date = t2.set_week,
			  inner_pack_size = t2.inner_pack_size
			from 
			  (
				with base AS(
					select distinct dpc.pack_type_id, CASE WHEN dpc.article <> dpc.pack_type_id THEN 1 ELSE dpc.units_in_pack END as  units_in_pack
					from public.dc_pack_configurations dpc
				)
			    select 
			      paf.product_code, 
			      ' || _rcl_hash || ' as rcl_hash,
				  (select case 
						when plan_start_date is null or plan_end_date is null then ''unavailable''
						when plan_end_date < current_date then ''expired''
						when plan_start_date <= current_date and plan_end_date >= current_date then ''active''
						when plan_start_date > current_date then ''upcoming''
						else ''NA''
					end from global.plan_info pi where pi.l0_code = paf.l0_code) as l0_status,
				(select case 
						when plan_start_date <= current_date and plan_end_date + ''30 day''::interval >= current_date then true
						else false
					end from global.plan_info pi2 where pi2.l0_code = paf.l0_code) as allocation_status_flag,
				(select psd.set_week from public.product_set_date as psd where psd.product_code = paf.product_code) as set_week,
				(
					select units_in_pack
					from base as dpc2
					where dpc2.pack_type_id = paf.product_code
				) as inner_pack_size
			    from global.product_attributes_filter paf 
			    {where} and paf.active = true
			  ) t2 
			where 
			  t1.product_code = t2.product_code returning 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'global.product_attributes_filter', 'product_code', null, 5000);
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
