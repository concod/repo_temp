--liquibase formatted sql
--changeset sri.harsha:sync_update_target_wos_dashboard runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: sync_update_target_wos_dashboard
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_update_target_wos_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_update_target_wos_dashboard()
LANGUAGE plpgsql
AS $$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_update_target_wos_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_psm_product_store_article 
    ON public.product_store_mapping(product_code, store_code, article);

    -- Update dashboard table
    UPDATE inventory_smart.article_inventory_dashboard aid
    SET wos_target = calc.target_wos
    FROM (
        SELECT 
            psm.article,
            psm.store_code,
            AVG(frt.wos) as target_wos
        FROM public.product_store_mapping psm
        INNER JOIN inventory_smart.final_result_table frt 
            ON psm.product_code = frt.product_code 
            AND psm.store_code = frt.store_code
        WHERE psm.article IS NOT NULL
            AND frt.wos IS NOT NULL
        GROUP BY psm.article, psm.store_code
    ) calc
    WHERE aid.article = calc.article 
        AND aid.store_code = calc.store_code;
    
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;