--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_season_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  initial changeset for sync_season_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_season_master();
CREATE OR REPLACE PROCEDURE public.sync_season_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_season_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  delete from global.season_master; 
  INSERT INTO global.season_master 
select season_code,name,season_type,
  case when current_date >= season_start_date and current_date <= season_end_date then true else false end as season_status,
year, season_start_date, season_end_date,attribute_value::jsonb from
(SELECT distinct fiscal_year_season as season_code,
concat(fiscal_year, ' ', fiscal_season_name)  as name,
'Arhaus Season' as season_type, null as season_status, fiscal_year as year,
min(date)::date as season_start_date, max(date) as season_end_date,
concat('{"incremental_id": ',row_number() over(order by fiscal_year_season asc),', ','"season_master_id": ',
cast(concat('20',to_char(row_number() over(order by fiscal_year_season asc),'fm00')) as int), '}') as attribute_value
from global.fiscal_date_mapping as fdm group by 1,2,3,4,5 order by 1) as ad;
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

