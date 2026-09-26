-- liquibase formatted sql
-- changeset vaibhav.singh@impactanalytics.co:sync_store_master_promo_vs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_store_master_promo
-- comment: derived table for store master promo vs

DROP  PROCEDURE if exists public.sync_store_master_promo();

CREATE OR REPLACE PROCEDURE public.sync_store_master_promo()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
  _log_code varchar := gen_random_uuid();
  _sp_name varchar := 'public.sync_store_master_promo';
  _log_step varchar;
  _st TIMESTAMP := clock_timestamp();
begin
  call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
  perform set_config('local.log_code', _log_code, true);
  perform set_config('local.sp_name', _sp_name, true);
  begin
          TRUNCATE TABLE  global.tb_store_master;



          INSERT INTO global.tb_store_master
          (
                s0_name,
                s0_id,
                s0_cid,
                s1_name,
                s1_id,
                s1_cid,
                s2_name,
                s2_id,
                s2_cid,
                s3_name,
                s3_id,
                s3_cid,
                s4_name,
                s4_id,
                s4_cid,
                s5_name,
                s5_id,
                s5_cid,
                store_code,
                store_name,
                type,
                store_open_flag,
                active,
                latitude,
                longitude,
                open_date,
                close_date,
                is_active,
                store_id,
                market_name,
                market_id,
                currency_id,
                zone_nm,
        state,
        city,
                is_active_value,
                ps_reco_level
          )
      select
                s0_name,
                s0_id,
                s0_cid,
                s1_name,
                s1_id,
                s1_cid,
                s2_name,
                s2_id,
                s2_cid,
                s3_name,
                s3_id,
                s3_cid,
                s4_name,
                s4_id,
                s4_cid,
                s5_name,
                s5_id,
                s5_cid,
                store_code,
                store_name,
                type,
                store_open_flag,
                active,
                latitude,
                longitude,
                open_date,
                close_date,
                is_active,
                store_id,
                market_name,
                market_id,
                currency_id,
                zone_nm,
        state,
        city,
                CASE WHEN is_active = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END as is_active_value,
                CONCAT(s0_id,'_',s3_id) as ps_reco_level
      from public.store_master_promo
    group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37;
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