--liquibase formatted sql
--changeset aman.lakkoju:sync_product_store_attributes_filter_multi_store_att_updates runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:multi_store_attribute_product_store_attributes_filter
--comment: sync_product_store_attributes_filter_multi_store_att_updates

drop procedure if exists public.sync_product_store_attributes_filter();

CREATE OR REPLACE PROCEDURE public.sync_product_store_attributes_filter()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_attributes_filter';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete
from
	"global".product_store_attributes_filter
where true;

insert
	into
	"global".product_store_attributes_filter(
 	l0_name,
	l1_name, 
	store_code, 
	volume_cd, 
	store_concept, 
	q_str_grade,
    psa_name,
	psa_code,
	store_hierarchy_level) 
 		
select 	
	l0_name,
	l1_name, 
	store_code, 
	volume_cd, 
	store_concept, 
	psa_name,
	psa_name,
	psa_code,
	store_hierarchy_level
from
	public.product_store_attributes_filter a ;

-- Step 3: Clear rcl_psa_config_table
    TRUNCATE TABLE "inventory_smart".rcl_psa_config_table;
    
    -- Step 4: Insert data into rcl_psa_config_table
    INSERT INTO "inventory_smart".rcl_psa_config_table (
        l0_name,
        l1_name,
        q_str_grade,
        volume_cd,
        store_concept,
        psa_code,
        sub_psa_code,
        updated_at
    )
    SELECT DISTINCT
        l0_name,
        l1_name,
        case when 'q_str_grade' = any(store_hierarchy_level) then q_str_grade else null end,
        case when 'volume_cd' = any(store_hierarchy_level) then volume_cd else null end,
        case when 'store_concept' = any(store_hierarchy_level) then store_concept else null end,
        psa_code,
        case when store_hierarchy_level = '{}' then 'all' else substr(psa_code, 5) end,
        now()
    FROM global.product_store_attributes_filter x
    ON CONFLICT DO NOTHING;
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