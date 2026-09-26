--liquibase formatted sql
--changeset pooja.shekar@impactanalytics.co:sync_product_life_cycle_removed_where_clause_for_paf runOnChange:true stripComments:false splitStatements:false context:sync product life cycle labels:MTP-69612
--comment: sync_product_life_cycle_removed_where_clause_for_paf
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_life_cycle();
CREATE OR REPLACE PROCEDURE public.sync_product_life_cycle()
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_life_cycle';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	select async_query into _worker from public.async_query('truncate table inventory_smart.product_life_cycle;');
	perform public.async_query_status(_worker, 'cleanup');
	raise notice 'Step1: %', (clock_timestamp() - _st);
	perform public.parellel_insert('WITH rows AS (insert
		into
		inventory_smart.product_life_cycle
		(article,
		store_code,
		markdown_date,
		clearance_date,
		launch_date,
		current_status,
		updated_by,
		updated_at,
		next_markdown_start_date,
		next_clearance_start_date,
		next_markdown_end_date,
		next_clearance_end_date,
		l0_name)
	SELECT
		article,
		store_code,
		markdown_date ,
		clearance_date ,
		launch_date,
		current_status,
		pl.updated_by,
		pl.updated_at,
		next_markdown_start_date ,
		next_clearance_start_date,
		next_markdown_end_date,
		next_clearance_end_date,
		paf.l0_name
	FROM
		(select * from public.product_life_cycle {where}) pl
	LEFT JOIN "global".product_attributes_filter paf
			USING(article)
			
	GROUP BY
		1,
		2,
		3,
		4,
		5,
		6,
		7,
		8,
		9,
		10,
		11,
		12,
		13 RETURNING 1) 
	SELECT 
	  count(1) as cnt 
	FROM 
	  rows;', 50, 'public.product_life_cycle', 'store_code', 'plc_store_code_idx');
	raise notice 'Step2: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;
