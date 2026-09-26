--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_article_status_tag runOnChange:true stripComments:false splitStatements:false context:sync_article_status_tag labels:first commit
--comment: sync_article_status_tag
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
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   -- Clear the destination table
   DELETE FROM inventory_smart.article_status_tag;
  
   -- Use a CTE to deduplicate the data before insertion
   WITH deduplicated_data AS (
       SELECT DISTINCT ON (product_code, channel)
           product_code,
           channel,
           article_status_tag,
           COALESCE("size", 'NA') as "size",
           COALESCE("size", 'NA') as new_size,
           COALESCE(order_of_size, 1000) as "order" ,article
       FROM
           public.article_status_tag x
           JOIN global.product_master pm USING(product_code)
   )
   INSERT INTO inventory_smart.article_status_tag (
       product_code, channel, article_status_tag,article,
       "size", new_size, "order"
   )
   SELECT  product_code, channel, article_status_tag,article,
       "size", new_size, "order" FROM deduplicated_data;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
