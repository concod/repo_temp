--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_article_instock runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_article_instock
--comment: initial changeset for sync_article_instock_01

DROP PROCEDURE IF EXISTS public.sync_article_instock();

CREATE OR REPLACE PROCEDURE public.sync_article_instock()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_instock';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.article_instock
 		where 
 		  true;
 		insert into inventory_smart.article_instock (
 		article,in_stock_count,total_count,dc_instock_count,dc_instock_total_count
 		)
		select article,
		sum(in_stock_count) in_stock_count,
		sum(total_count) total_count,
		sum(dc_instock_count) dc_instock_count,
		sum(dc_instock_total_count) dc_instock_total_count
		from inventory_smart.article_inventory_dashboard
		group by 1
 		;
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