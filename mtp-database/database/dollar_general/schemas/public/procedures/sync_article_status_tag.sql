--liquibase formatted sql
--changeset liquibase:sync_article_status_tag runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:MTP-28454
--comment: initial changeset for sync_article_status_tag
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
		  product_code, l0_code, primary_sku, channel, article_status_tag, 
		  "size", new_size, "order"
		) 
		SELECT 
		distinct 
		  article,
          l0_code,
          primary_sku, 
		  channel, 
		  article_status_tag, 
		  "size", 
		  new_size, 
		  "order" 
		FROM 
		  public.article_status_tag x 
		  join global.product_master pm on pm.product_code = x.article
		   where not exists (select 'p' from inventory_smart.article_status_tag b
		 where x.article=b.product_code and x.channel=b.channel   
		 )
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
