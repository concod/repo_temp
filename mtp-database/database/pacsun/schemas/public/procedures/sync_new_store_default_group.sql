--liquibase formatted sql
--changeset bhaskar.reddy@impactanalytics.co:sync_new_store_default_group_v3 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_alerts_product_zone_level
--comment: initial changeset for sync_new_store_default_group_v3

DROP PROCEDURE if exists  public.sync_new_store_default_group();

CREATE OR REPLACE PROCEDURE public.sync_new_store_default_group()
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_default_group';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  DELETE
  FROM global.store_groups_mapping
  WHERE sg_code = 5;

  WITH new_stores AS (SELECT DISTINCT 
                sta.store_code, 
                '5' AS sg_code, 
                NULL AS ref_sg_code
            FROM 
                global.store_time_attributes sta
            WHERE 
                sta.store_code NOT IN ('4901')
                AND sta.attribute_value = 'active'
                AND CURRENT_DATE BETWEEN sta.start_time AND sta.end_time
                AND NOT EXISTS (
                    SELECT 1
                    FROM global.new_store_attributes nsa
                    WHERE nsa.store_code = sta.store_code
                      AND (nsa.store_group_mapping_date > CURRENT_DATE
                           OR (nsa.status <> 3 AND NOT nsa.is_deleted))
                )
            
            UNION 
            
            SELECT DISTINCT 
                store_code, 
                UNNEST(store_groups) AS sg_code, 
                NULL AS ref_sg_code
            FROM 
                global.new_store_attributes nsa
                join global.store_attributes_filter saf using(store_code)
            WHERE 
                nsa.is_deleted IS FALSE and saf.is_deleted IS false
                and saf.active AND store_group_mapping_date <= CURRENT_DATE 
                AND status = 3
  )
  INSERT INTO global.store_groups_mapping (sg_code, store_code, ref_sg_code)
  SELECT
    sg_code::int,
    store_code,
    ref_sg_code::int
  FROM new_stores
  ON CONFLICT (sg_code, store_code) DO NOTHING;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;