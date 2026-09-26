--liquibase formatted sql
--changeset saad_adeeb:sync_style_mapping_table_for_supersession runOnChange:true stripComments:false splitStatements:false context:VS_InventorySmart labels:MTP-19191
--comment: initial changeset for sync_style_mapping_table_for_supersession
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_style_mapping_table_for_supersession();
create or replace
procedure public.sync_style_mapping_table_for_supersession()
	language plpgsql
as $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_style_mapping_table_for_supersession';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from inventory_smart.style_mapping_table
		where true;
insert
	into
	inventory_smart.style_mapping_table 
	(new_article,
	new_cvsc,
	old_cvsc,
	new_product_code,
	old_article,
	old_product_code,
	mapping_type,
	priority,
	effective_date,
	updated_at,
	updated_by)
select
	new_article,
	new_cvsc,
	old_cvsc,
	new_product_code,
	old_article,
	old_product_code,
	mapping_type,
	priority,
	effective_date,
	updated_at,
	updated_by
from
	public.style_mapping_table;
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
