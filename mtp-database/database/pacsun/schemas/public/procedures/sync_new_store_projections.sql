--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_new_store_data_v3 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_new_store_data
--comment: initial changeset for sync_new_store_data 

DROP PROCEDURE if exists  public.sync_new_store_projections();

CREATE OR REPLACE PROCEDURE public.sync_new_store_projections()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_projections';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    delete from
      "global".new_store_projections
    where
      true;
    INSERT INTO "global".new_store_projections (
      l0_name,
      l1_name,
      l2_name,
      l3_id_name,
      -- l4_id,
      -- l4_name,
      -- ladder,
      -- markdown_ind,
      -- fit,
      -- launch_date,
      brand,
      store_code_name,
--      style_color_description,
      store_code,
      store_name,
      -- article,
      sister_store_code,
      s0_name,
      channel,
      channel_name,
      multiplier,
      wos,
      projected_units,
      projected_value
    )
    SELECT
      l0_name,
      l1_name,
      l2_name,
      l3_id_name,
      -- l4_id,
      -- l4_name,
      -- ladder,
      -- markdown_ind,
      -- fit,
      -- launch_date,
      brand,
      store_code_name,
--      style_color_description,
      store_code,
      store_name,
      -- article,
      sister_store_code,
      s0_name,
      channel,
      channel_name,
      multiplier,
      wos,
      projected_units,
      projected_value
    FROM
      public.new_store_projections;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
  end
$procedure$;

