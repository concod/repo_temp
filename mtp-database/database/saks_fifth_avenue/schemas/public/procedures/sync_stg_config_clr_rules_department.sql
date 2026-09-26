-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_stg_config_clr_rules_department_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_stg_config_clr_rules_department
-- comment: derived table for tb_stg_config_clr_rules_department_v5

DROP  PROCEDURE if exists public.sync_stg_config_clr_rules_department();

CREATE OR REPLACE PROCEDURE public.sync_stg_config_clr_rules_department()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_stg_config_clr_rules_department';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
			TRUNCATE TABLE price_markdown_opt.tb_stg_config_clr_rules_department;

	        INSERT INTO price_markdown_opt.tb_stg_config_clr_rules_department
	        (
		    l0_id,
		    l0_name,
		    l1_id,
		    l1_name,
		    l2_id,
		    l2_name,
		    age_eligible,
		    age_force,
		    monthly_st_eligible,
		    l0_cid,
		    l1_cid,
		    l2_cid
	        )

		  select
		    cast(l0_id as int4) as l0_id,
		    cast(l0_name as varchar) as l0_name,
		    cast(l1_id as int4) as l1_id,
		    cast(l1_name as varchar) as l1_name,
		    cast(l2_id as int4) as l2_id,
		    cast(l2_name as varchar) as l2_name,
		    cast(age_eligible as int4) as age_eligible,
		    cast(age_force as int4) as age_force,
		    cast(monthly_st_eligible as float4) as monthly_st_eligible,
		    cast(l0_cid as int4) as l0_cid,
		    cast(l1_cid as int4) as l1_cid,
		    cast(l2_cid as int4) as l2_cid
		  from public.stg_config_clr_rules_department
		;
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