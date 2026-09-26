--liquibase formatted sql
--changeset kaustubh.gupta:sync_new_store_default_group runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_new_store_default_group
--rollback: SELECT 1
    
DROP PROCEDURE if exists public.sync_new_store_default_group();
CREATE OR REPLACE PROCEDURE public.sync_new_store_default_group()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_new_store_default_group';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	  -- DELETE
	  -- FROM global.store_groups_mapping
	  -- WHERE sg_code = 8;

		 WITH new_stores AS (
            SELECT DISTINCT
                nsm.store_code,
                '8' AS sg_code,
                NULL::int AS ref_sg_code
            FROM global.new_store_mapping nsm
            WHERE nsm.is_deleted IS FALSE

            UNION

            SELECT DISTINCT 
                store_code, 
                UNNEST(store_groups) AS sg_code, 
                NULL::int AS ref_sg_code
            FROM 
                global.new_store_attributes nsa
                join global.store_attributes_filter saf using(store_code)
            WHERE 
                nsa.is_deleted IS FALSE and saf.is_deleted IS false
                and saf.active AND reservation_date <= CURRENT_DATE 
               --AND status = 3
        ) 

        INSERT INTO global.store_groups_mapping (sg_code, store_code, ref_sg_code)
        SELECT 
            ns.sg_code::int,
            ns.store_code,
            ns.ref_sg_code::int
        FROM new_stores ns
        ON CONFLICT (sg_code, store_code) DO NOTHING;
		
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