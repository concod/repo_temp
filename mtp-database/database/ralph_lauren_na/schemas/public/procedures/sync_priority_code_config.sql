--liquibase formatted sql
--changeset kuldeep.rathore:sync_priority_code_config_changes_new_MTP_98417 runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-98417
--comment:  sync priority code config changes new MTP-98417
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_priority_code_config();
CREATE OR REPLACE PROCEDURE public.sync_priority_code_config()
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_priority_code_config';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	perform public.parellel_insert('WITH rows AS (
insert into inventory_smart.priority_code_configuration(article,store_code,priority_code,channel,l0_name) 
select distinct article,store_code,case when channel=''PFS'' then ''S'' else ''W'' end priority_code ,channel,l0_name from inventory_smart.article_status_tag ast 
join "global".store_attributes_filter saf 
using(channel)
join "global".product_attributes_filter paf 
using(product_code)
{where} and saf.active and paf.active
ON CONFLICT (article,store_code,l0_name) DO nothing
RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'inventory_smart.article_status_tag', 'product_code', null, 500);
		raise notice 'Step2: %', (clock_timestamp() - _st);

perform public.parellel_insert('WITH rows AS (update inventory_smart.priority_code_configuration 
set instore_date=current_date 
{where} and instore_date <current_date
RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'inventory_smart.priority_code_configuration', 'article', null, 500);
		raise notice 'Step2: %', (clock_timestamp() - _st);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;