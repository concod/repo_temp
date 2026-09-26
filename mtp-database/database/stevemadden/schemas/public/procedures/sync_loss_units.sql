--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:sync_loss_units runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sm_sync_loss_units
--comment: initial changeset for sync_loss_units
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_loss_units(bool);

CREATE OR REPLACE PROCEDURE public.sync_loss_units(IN _is_historic boolean DEFAULT false)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    _worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_loss_units';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN	 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Step 1: Cleanup
    IF _is_historic THEN 
        SELECT async_query INTO _worker 
        FROM public.async_query('DELETE FROM inventory_smart.loss_units WHERE TRUE;');
        PERFORM public.async_query_status(_worker, 'cleanup');
        RAISE NOTICE 'Step1: %', (clock_timestamp() - _st);
    ELSE
        DELETE FROM inventory_smart.loss_units  
        WHERE (fiscal_year * 100 + fiscal_week) <
              (SELECT fiscal_year_week
               FROM "global".fiscal_date_mapping fdm 
               WHERE date = current_date - 365
               LIMIT 1);

        RAISE NOTICE 'Step1 (rolling cleanup): %', (clock_timestamp() - _st);
    END IF;

    -- Step 2: Insert fresh data
    PERFORM public.parellel_insert('WITH rows AS 
	(
	INSERT INTO inventory_smart.loss_units 
		(
          product_hierarchy, store_code, fiscal_year, 
          fiscal_week, "date", opening_inventory, 
          quantity, cluster_avg_sales, lost_units, 
          lost_sales
        ) 
        SELECT 
          product_code, 
          store_code, 
          fiscal_year, 
          fiscal_week, 
          "date", 
          opening_inventory, 
          units, 
          cluster_avg_sales, 
          lost_units,  
          lost_revenue 
        FROM 
          public.loss_units
		{where} ON CONFLICT DO NOTHING RETURNING 1
	)
	SELECT 
	  count(1) as cnt 
	FROM 
	  rows;', 50, 'public.loss_units', 'product_code', 'loss_units_un', 4000);

    RAISE NOTICE 'Step2: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;
