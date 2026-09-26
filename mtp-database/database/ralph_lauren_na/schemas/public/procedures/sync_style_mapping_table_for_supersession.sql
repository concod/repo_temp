--liquibase formatted sql
--changeset kuldeep.rathore@imapctanalytics.co:Added missing upload_flag column and delete from statements in Sync SP MTP-38297 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-38297
--comment: Added missing upload_flag column and delete from statements MTP-38297
--rollback: SELECT 1
DROP procedure IF EXISTS public.sync_style_mapping_table_for_supersession();
CREATE OR REPLACE PROCEDURE public.sync_style_mapping_table_for_supersession()
 LANGUAGE plpgsql
AS $procedure$
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
    old_size_name,
    old_model_description, 
    old_brand,
    upload_flag 
    )
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
    old_brand,
    upload_flag 
from
    public.style_mapping_table;
delete  from inventory_smart.intermediate_supersession_upload isu 
where concat(new_article,old_article) in (select concat(new_article,old_article) from inventory_smart.style_mapping_table smt);
delete from inventory_smart.intermediate_supersession_upload isu  
where concat(old_article,coalesce(old_size,''),new_article) not in (select concat(old_article,coalesce(split_part( old_size,'-',1),''),new_article) from inventory_smart.style_mapping_table smt)
and is_deleted =1;
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
