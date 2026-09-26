
--liquibase formatted sql
--changeset aaqib.khan:sister_store_id in test runOnChange:true stripComments:false splitStatements:false context:Release_2_0 labels:levis_test
--comment: sister_store_id in test
--rollback: SELECT 1





DROP PROCEDURE IF EXISTS  public.sync_tb_store_level_buy_qty();

CREATE OR REPLACE PROCEDURE public.sync_tb_store_level_buy_qty()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_store_level_buy_qty';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  INSERT INTO size_smart.store_level_buy_qty (
    l0_name,
    display_article,
    store_code,
    sister_store_id,
    master_store_code,
    season,
    "year",
    buy_qty,
    floorset_date,
    created_at,
    updated_at
  )
  SELECT DISTINCT
    l0_name,
    display_article,
    store_code,
    sister_store_id,
    master_store_code,
    season,
    "year",
    buy_qty,
    floorset_date,
    created_at::timestamptz AT TIME ZONE 'Asia/Kolkata',
    updated_at::timestamptz AT TIME ZONE 'Asia/Kolkata'
  FROM public.size_SSC

   ON CONFLICT (
      l0_name,
      display_article,
      store_code, 
      sister_store_id,
      master_store_code,
      season,
      "year"
   ) DO UPDATE
   SET
      buy_qty = EXCLUDED.buy_qty,
      floorset_date = EXCLUDED.floorset_date,
      updated_at = EXCLUDED.updated_at;
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
