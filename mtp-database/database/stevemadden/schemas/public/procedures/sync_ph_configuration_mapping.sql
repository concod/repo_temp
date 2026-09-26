--liquibase formatted sql
--changeset shrinidhi.choragi@impactanalytics.co:sync_ph_configuration_mapping runOnChange:true stripComments:false splitStatements:false context:Intial commit labels:sync_ph_configuration_mapping
--comment: initial changeset for sync_ph_configuration_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_ph_configuration_mapping();
CREATE OR REPLACE PROCEDURE public.sync_ph_configuration_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_ph_configuration_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    UPDATE inventory_smart.ph_configuration_mapping pcm
    SET auto_allocation_status = 
    CASE
        WHEN pcm.auto_allocation_update is TRUE
        THEN pcm.auto_allocation_status
        ELSE 
            CASE 
            WHEN apsl.auto_alloc_alert= 1 THEN TRUE
            WHEN apsl.auto_alloc_alert= 0 THEN FALSE
            ELSE NULL 
            END
    END
    FROM (
    "global".product_hierarchies_filter AS phf 
    JOIN 
     (select channel, article, auto_alloc_alert from  
    inventory_smart.alerts_product_store_level 
    group by 1,2,3 ) AS apsl 
    ON channel = apsl.channel AND (phf.path->>'article')::TEXT = apsl.article) 
    where ph_code = phf.hierarchy_code;
 	
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
