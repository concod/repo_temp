--liquibase formatted sql
--changeset liquibase:sync_future_receipts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_future_receipts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_future_receipts();
CREATE OR REPLACE PROCEDURE public.sync_future_receipts()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.future_receipts 
		where 
		  true;
		insert into inventory_smart.future_receipts(
		  store_code, article, oh, scheduled_receipts_units, 
		  target_wos, current_ros, oh_calc, 
		  week_number, forecast_for_next_6_weeks
		) 
		SELECT 
		  store_code, 
		  article, 
		  oh, 
		  scheduled_receipts_units, 
		  target_wos, 
		  current_ros, 
		  oh_calc, 
		  week_number, 
		  forecast_for_next_6_weeks 
		FROM 
		  public.future_receipts;
end
$procedure$
;
