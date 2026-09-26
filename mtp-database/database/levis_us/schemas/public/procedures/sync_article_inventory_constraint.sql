--liquibase formatted sql
--changeset himansh.bhardwaj:aic_dc_flag_addition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: aic_dc_flag_addition
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_article_inventory_constraint();
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_constraint()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_constraint';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
      delete from inventory_smart.article_inventory_constraint x
      where concat(article,dc_code) not in (
            Select distinct concat(article,dc.dc_code)
            from public.article_inventory_constraint x
            JOIN global.distribution_centres dc 
            ON x.dc_code = dc.linked_store_code
      );

      -- upsert query
      insert into inventory_smart.article_inventory_constraint(
      article,display_article,l0_name,vir_reservation_total,vir_reservation_remaining,iob_reservation_remaining,vir_constraint_flag,dc_code,transit_time,delivered_mtd,dc_flag
      )
      select article,display_article,l0_name,vir_reservation_total,vir_reservation_remaining,iob_reservation_remaining,vir_constraint_flag,dc.dc_code,transit_time::jsonb,delivered_mtd,dc_flag
          from public.article_inventory_constraint x
          JOIN 
            global.distribution_centres dc 
          ON x.dc_code = dc.linked_store_code
      on conflict(l0_name,display_article,article,dc_code)
      do update 
      set
        vir_reservation_total = EXCLUDED.vir_reservation_total,
        vir_reservation_remaining = EXCLUDED.vir_reservation_remaining,
        iob_reservation_remaining = EXCLUDED.iob_reservation_remaining,
        -- vir_constraint_flag is intentionally excluded from the SET clause
        transit_time = EXCLUDED.transit_time,
        delivered_mtd = EXCLUDED.delivered_mtd,
        dc_flag = EXCLUDED.dc_flag;
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