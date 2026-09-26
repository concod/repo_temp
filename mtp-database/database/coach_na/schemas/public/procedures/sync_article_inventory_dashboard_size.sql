--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_article_inventory_dashboard_size runOnChange:true stripComments:false splitStatements:false context:sync_article_inventory_dashboard_size labels:first commit
--comment: sync_article_inventory_dashboard_size
--rollback: SELECT 1



DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard_size();

CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard_size()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard_size';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM inventory_smart.article_inventory_dashboard_size;

    INSERT INTO inventory_smart.article_inventory_dashboard_size (
        article, article_orig, product_code, store_code, size, channel, lw_sales_units, wtd_sales_units
    )
    SELECT
        article, article_orig, product_code, store_code, size, channel, lw_sales_units, wtd_sales_units
    FROM
        public.article_inventory_dashboard_size;  -- <- changed to a source table

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
