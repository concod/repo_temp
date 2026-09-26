--liquibase formatted sql
--changeset Shaik.Azmathulla:generate_all_week_level_rcl_constraint_data runOnChange:true stripComments:false splitStatements:false context:generate_all_week_level_rcl_constraint_data labels:MTP-74285
--comment: created procedure generate_all_week_level_rcl_constraint_data
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.generate_all_week_level_rcl_constraint_data (integer) ;

CREATE OR REPLACE PROCEDURE public.generate_all_week_level_rcl_constraint_data(IN _limit integer DEFAULT 104)
LANGUAGE 'plpgsql'
SECURITY DEFINER 
AS $procedure$
/*
 * Function/Procedure name: inventory_smart.generate_all_week_level_rcl_constraint_data
 * Created by: Shaik Azmathulla
 * Created at: 20-Nov-2024
 * No of input parameter: 1
 * Parameter Description : 
 * Purpose: This procedure been created to store allocation constraints at product_code,store data on week level
 * Calling Statement:
		 CALL public.generate_all_week_level_rcl_constraint_data (104)
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * 		Updated_by       	Updated_on      	Purpose
 * 		----------       	-----------     	--------
 	Shaik Azmathulla		24th Feb,2025		MTP-74285:Execution time for rcl_week_level_constraint_data sp is longer
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
	_l0_names text[] := '{}'::text[];
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	set work_mem = '10GB';
	select
		array_agg(rcl_code order by priority asc) into _rcl_codes
	from global.rcl_master where
		not is_deleted
		and module_code = 170
		and validity @> current_date 
	group by is_deleted;

	IF (
		SELECT COUNT(*) 
        FROM 	information_schema.tables 
        WHERE 	table_schema = 'public' 
        AND 	table_name = 'rcl_week_level_constraint_data'
		) = 0 
		
    THEN

		CREATE TABLE IF NOT EXISTS public.rcl_week_level_constraint_data
		(
		    
		    l0_name character varying COLLATE pg_catalog."default" NOT NULL,
			--l1_name character varying COLLATE pg_catalog."default" NOT NULL,
		    rcl_code integer NOT NULL,
			fiscal_week_begin_date DATE NOT NULL,
			fiscal_year_week integer NOT NULL,
		    rule_code integer NOT NULL,
		    psa_code character varying COLLATE pg_catalog."default" NULL,
		    product_codes character varying[] COLLATE pg_catalog."default",
		    wos real,
            dos real,
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
		
		-- DROP INDEX IF EXISTS public.idx_rcl_week_level_constraint_data_store_codes_product_codes;
		
		CREATE INDEX IF NOT EXISTS idx_rcl_week_level_constraint_data_store_codes_product_codes
		    ON public.rcl_week_level_constraint_data USING gin
		    (store_codes COLLATE pg_catalog."default", product_codes COLLATE pg_catalog."default");

		RAISE NOTICE 'Table created... ';
		
	END IF;
    
	TRUNCATE TABLE public.rcl_week_level_constraint_data ;
	RAISE NOTICE 'truncate table... ';
	
	----------
	for _ph in select l0_name from global.product_attributes_filter paf group by l0_name loop 
		_q_parts := array_append(_q_parts, 'CALL public.generate_rcl_week_level_constraint_data('|| quote_literal(_ph.l0_name) || ', '|| quote_literal(_rcl_codes) || '::int[] ,'|| _limit ||' );');
		raise notice '%, %', _rcl_codes, _ph;
		_l0_names := array_append(_l0_names, _ph.l0_name);
	end loop;
	----------
	if cardinality(_q_parts) > 0 THEN
		FOREACH _q_part in array _q_parts loop
			execute _q_part;
			raise notice 'sp_call %',_q_part;
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
$procedure$;