
--liquibase formatted sql
--changeset Shaik.azmathulla::generate_all_week_level_rcl_constraint_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-67111
--comment: Updated SP for generate_all_week_level_rcl_constraint_data VS
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.generate_all_week_level_rcl_constraint_data(integer);
CREATE OR REPLACE PROCEDURE public.generate_all_week_level_rcl_constraint_data(IN _limit integer DEFAULT 104)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
/*
 * Function/Procedure name: public.generate_all_week_level_rcl_constraint_data
 * Created by: Shaik Azmathulla
 * Created at: 07-Jan-2025
 * No of input parameter: 1
 * Parameter Description : 
 * 						   $1 = limit of the weeks
 
 * Purpose: This procedure been created to store allocation constraints at product_code,store data on week level
 * Calling Statement: 
 
 	CALL public.generate_all_week_level_rcl_constraint_data ()
		
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 */
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.generate_all_week_level_rcl_constraint_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_rcl_codes int[];
	_ph record;
	_q_parts text[] := '{}'::text[];
	_q_part text;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	set work_mem = '10GB';
	
	DROP TABLE IF EXISTS public.rcl_week_level_constraint_data;
	CREATE TABLE public.rcl_week_level_constraint_data
	( 
	    l0_name character varying COLLATE pg_catalog."default" NOT NULL,
	    rcl_code integer NOT NULL,
		fiscal_week_begin_date DATE NOT NULL,
		fiscal_year_week integer NOT NULL,
	    rule_code integer NOT NULL,
	    psa_code character varying NULL,
	    product_codes character varying[] COLLATE pg_catalog."default",
	    wos real,
	    transit_time real,
	    safety_stock real,
	    min_stock real,
	    max_stock real,
		min_distribution varchar NULL,
	    aps real,
	    ros real,
	    st real,
	    store_codes character varying[] COLLATE pg_catalog."default",
		priority SERIAL
	);
	
	CREATE INDEX IF NOT EXISTS idx_rcl_week_level_constraint_data_store_codes_product_codes
	    ON public.rcl_week_level_constraint_data USING gin
	    (store_codes COLLATE pg_catalog."default", product_codes COLLATE pg_catalog."default");

	RAISE NOTICE 'Table created... ';
	----------
	for _ph in select l0_name
		from "global".product_store_attributes_filter 
		group by l0_name
		order by count(1) desc loop 
		
		execute 'select
			array_agg(rcl_code order by priority asc) 
		from global.rcl_master r where
			not is_deleted
			and module_code = 170
			and validity @> current_date and exists (select 1 from inventory_smart.rcl_constraint_master_rule rc where r.rcl_code = rc.rcl_code and rcl_dimension->>''l0_name'' = '|| quote_literal(_ph.l0_name) || ')
		group by is_deleted;' into _rcl_codes;
			
		_q_parts := array_append(_q_parts, 'CALL public.generate_rcl_week_level_constraint_data('|| quote_literal(_ph.l0_name) || ', ' || quote_literal(_rcl_codes) || '::int[],'|| _limit ||' );');
		raise notice '%, %', _rcl_codes, _ph;
		
	end loop;
	----------
	if cardinality(_q_parts) > 0 THEN
		FOREACH _q_part in array _q_parts loop
		
			raise notice 'sp_call %',_q_part;
			execute _q_part;
			
			perform  global.sp_log(v_gen_random_uuid, 'public.generate_all_week_level_rcl_constraint_data', 'Inside Loop' ,_q_part,null) ;
		
		end loop;
	end if;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;
