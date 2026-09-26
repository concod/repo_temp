--liquibase formatted sql
--changeset mohini.baliram@impactanalytics.co:sync_new_store_default_group runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_new_store_default_group
--rollback: SELECT 1
    
DROP PROCEDURE if exists public.sync_new_store_default_group();
CREATE OR REPLACE PROCEDURE public.sync_new_store_default_group()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_new_store_default_group';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    begin
call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    
  -- DELETE
  -- FROM global.store_groups_mapping
  -- WHERE sg_code = 9;

         WITH config AS (
            SELECT 
                key AS channel,
                value::int AS sg_code
            FROM global.tenant_attribute_master tam,
                 jsonb_each_text(
                     tam.attribute_value::jsonb -> 'default_store_group' -> 'ns'
                 )
            WHERE tam.name = 'default_store_group_config'
        ),
        new_stores AS (
            SELECT DISTINCT
                saf.store_code,
                c.sg_code::text, 
                NULL::int AS ref_sg_code,
                saf.channel
            FROM global.store_attributes_filter saf
            JOIN config c 
             ON c.channel = saf.channel
            WHERE 
                saf.channel IS NOT NULL
                AND saf.is_deleted IS FALSE
                AND saf.active  
                
         UNION

            SELECT DISTINCT 
                store_code, 
                UNNEST(store_groups) AS sg_code, 
                NULL::int AS ref_sg_code,
                saf.channel
            FROM 
                global.new_store_attributes nsa
                join global.store_attributes_filter saf using(store_code)
            WHERE 
                nsa.is_deleted IS FALSE and saf.is_deleted IS false
                AND saf.active AND store_group_mapping_date <= CURRENT_DATE 
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
$procedure$
;