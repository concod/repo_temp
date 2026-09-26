--liquibase formatted sql
--changeset liquibase:sync_store_holiday_calendar runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_holiday_calendar
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_holiday_calendar();
CREATE OR REPLACE PROCEDURE public.sync_store_holiday_calendar()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
--		delete from 
--		  inventory_smart.store_holiday_calendar 
--		where 
--		  true;
		INSERT INTO inventory_smart.store_holiday_calendar (store_code, holiday_date) 
		SELECT 
		  store_code, 
		  holiday_date 
		FROM 
		  public.store_holiday_calendar x 
		  join global.store_master sm using(store_code);
	end
$procedure$
;
