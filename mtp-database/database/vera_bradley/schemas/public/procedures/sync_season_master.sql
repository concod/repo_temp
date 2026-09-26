--liquibase formatted sql
--changeset liquibase:sync_season_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_season_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_season_master();
CREATE OR REPLACE PROCEDURE public.sync_season_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		insert into global.season_master (name,
		season_type,
		season_status,
		year,
		season_start_date,
		season_end_date)
		select distinct season, 'VB Season' season_type, false  as  season_status, 
		DATE_PART('year', season_start_date::date) as "year", season_start_date,season_end_date 
		from 
		public.productseason_validated_table a
		where not exists (select 'p' from  global.season_master sm
		where sm."name" =a.season
		);
	end
$procedure$
;
