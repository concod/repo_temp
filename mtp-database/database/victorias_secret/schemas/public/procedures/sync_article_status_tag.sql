--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_article_status_tag runOnChange:true stripComments:false splitStatements:false context:Victorias_Secret_Inventory_Smart labels:VPP-310
--comment: Updated sync_article_status_tag for VS
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_status_tag();
CREATE OR REPLACE PROCEDURE public.sync_article_status_tag()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_status_tag';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.article_status_tag 
		where 
		  true;
		INSERT INTO inventory_smart.article_status_tag (
		  product_code, channel, article_status_tag, 
		  "size", new_size, "order"
		) 
		SELECT 
		  product_code, 
		  channel, 
		  article_status_tag, 
		  "size", 
		  "size" as new_size, 
		  size_order 
		FROM 
		  public.article_status_tag x 
		  join global.product_master pm using(product_code)
		  on conflict do nothing; 
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