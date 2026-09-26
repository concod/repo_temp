-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_product_master_v6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_product_master
-- comment: derived table for sync_bp_product_master_v6

DROP  PROCEDURE if exists public.sync_bp_product_master();

CREATE OR REPLACE PROCEDURE public.sync_bp_product_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_product_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE base_pricing.bp_product_master CASCADE;

	         DROP INDEX IF EXISTS base_pricing.bs_product_master_idx;
           
	        INSERT INTO base_pricing.bp_product_master
	        (
 product_id,
 product_name,
 product_code,
 active,
 l0_id,
 l0_name,
 l0_cuq,
 l0_cid,
 l1_id,
 l1_name,
 l1_cuq,
 l1_cid,
 l2_id,
 l2_name,
 l2_cuq,
 l2_cid,
 l3_id,
 l3_name,
 l3_cuq,
 l3_cid,
 l4_id,
 l4_name,
 l4_cuq,
 l4_cid,
 l5_id,
 l5_name,
 l5_cuq,
 l5_cid,
 product_image,
 usable
 )

			select
 product_id,
 CONCAT(CAST(product_id AS VARCHAR), '_', product_name) as product_name,
 CAST(product_id AS VARCHAR) AS product_code,
 active,
 l0_id,
 l0_name,
 l0_cuq,
 l0_cid,
 l1_id,
 l1_name,
 l1_cuq,
 l1_cid,
 l2_id,
 l2_name,
 l2_cuq,
 l2_cid,
 l3_id,
 l3_name,
 l3_cuq,
 l3_cid,
 l4_id,
 l4_name,
 l4_cuq,
 l4_cid,
 l5_id,
 l5_name,
 l5_cuq,
 l5_cid,
 product_image,
 usable
			from public.bp_product_master
		group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 
21, 22, 23,24,25,26,27,28,29,30;
	CREATE INDEX bs_product_master_idx ON base_pricing.bp_product_master  USING btree(product_id);
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
