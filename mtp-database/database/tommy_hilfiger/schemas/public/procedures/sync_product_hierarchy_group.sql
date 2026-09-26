--liquibase formatted sql
--changeset sadhana.j:client_specific runOnChange:true stripComments:false splitStatements:false context:client_specific labels:sync_product_hierarchy_group
--comment: move to client_specific
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_hierarchy_group();
CREATE OR REPLACE PROCEDURE public.sync_product_hierarchy_group()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_hierarchy_group';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
_query text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	insert into assort_smart.product_hierarchy_group
	(hierarchy_code	,
	  path,
	  level,
	  active )
	select
	 a.hierarchy_code::text,
	  a.path,
	  a.level,
	  a.active
	from
	  global.product_hierarchies_filter a
	  where
	  not exists (select 1 from  assort_smart.product_hierarchy_group b
		where
	  a.hierarchy_code::text = b.hierarchy_code
	  and is_custom_hierarchy =false)
	  on conflict("path", "level") do nothing;

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
