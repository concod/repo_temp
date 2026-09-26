--liquibase formatted sql
--changeset rohit.sharma@impactanalytics.co:sync_season_master_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sync_season_master was hot fixed to prod but wasn't back merged to dev and hence initial version was pushed until prod, correcting again
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_season_master();
CREATE OR REPLACE PROCEDURE public.sync_season_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
  delete from global.season_master; 
  INSERT INTO global.season_master 
  select season_code,name,season_type, 
  case when current_date >= season_start_date and current_date <= season_end_date then true else false end as season_status, 
year, season_start_date, season_end_date,attribute_value::jsonb from 
(SELECT distinct fiscal_year_quarter as season_code, 
concat(left(cast(fiscal_year_quarter as varchar),4),' quarter ',cast(right(cast(fiscal_year_quarter as varchar),2) as int)) as name, 
'PCHI Season' as season_type, null as season_status, fiscal_year as year, 
min(date)::date as season_start_date, max(date) as season_end_date,
concat('{"incremental_id": ',row_number() over(order by fiscal_year_quarter asc),', ','"season_master_id": ',
cast(concat('20',to_char(row_number() over(order by fiscal_year_quarter asc),'fm00')) as int), '}') as attribute_value
from global.fiscal_date_mapping as fdm group by 1,2,3,4,5 order by 1) as ad;
	end
$procedure$
;