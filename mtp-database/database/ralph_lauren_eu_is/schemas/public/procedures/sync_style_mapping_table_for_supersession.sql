--liquibase formatted sql
--changeset saad_adeeb:sync_style_mapping_table_for_supersession_added_model_desc runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-39663
--comment: Added model description, MTP-46877
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
	updated_by,
	old_product_description,
	old_l0_name,
	old_l1_name,
	old_l2_name,
	old_l3_name,
	old_l4_name,
	old_size,
	old_size_name,old_model_description, upload_flag)
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
	updated_by,
	old_product_description,
	old_l0_name,
	old_l1_name,
	old_l2_name,
	old_l3_name,
	old_l4_name,
	old_size,
	old_size_name,
	old_model_description,
	upload_flag
from
	public.style_mapping_table;
delete  from inventory_smart.intermediate_supersession_upload isu
where concat(new_article,old_article) in (select concat(new_article,old_article) from inventory_smart.style_mapping_table smt);
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
