--liquibase formatted sql
--changeset shrinidhi.choragi@impactanalytics.co:sync_ph_configuration_mapping runOnChange:true stripComments:false splitStatements:false context:Intial commit labels: updated insert logic for sync_ph_configuration_mapping
--comment: added the logic for insert rows from alerts_product_store_level table: sync_ph_configuration_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_ph_configuration_mapping();
CREATE OR REPLACE PROCEDURE public.sync_ph_configuration_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 
 	begin

	UPDATE inventory_smart.ph_configuration_mapping pcm
    SET auto_allocation_status = false 
    where auto_allocation_update = false ;
			
    with base as (
    select ph_code,channel, article, auto_alloc_alert from  inventory_smart.alerts_product_store_level 
    left join inventory_smart.ph_master using (channel, article)
    where auto_alloc_alert =1 
    group by 1,2,3,4 ),
		
	upsert_data AS (
		    SELECT ph_code, channel, now() as created_at  , true  AS auto_allocation_status
		    FROM base)

	INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, created_at,  auto_allocation_status)
		SELECT ph_code,channel,created_at, auto_allocation_status FROM upsert_data
    ON CONFLICT (ph_code,channel)
	DO nothing;
    	
    UPDATE inventory_smart.ph_configuration_mapping pcm
    SET auto_allocation_status =
        CASE
            WHEN pcm.auto_allocation_update IS TRUE
            THEN pcm.auto_allocation_status
            ELSE
                CASE
                    WHEN a.auto_alloc_alert = 1 THEN TRUE
                    WHEN a.auto_alloc_alert = 0 THEN FALSE
                    ELSE NULL
                END
        END
    FROM (
      select ph_code,channel, article, auto_alloc_alert from  inventory_smart.alerts_product_store_level 
     left join inventory_smart.ph_master using (channel, article)
     where auto_alloc_alert =1
     group by 1,2,3,4 ) a
     where pcm.ph_code = a.ph_code;

 	
 	end
 $procedure$
;