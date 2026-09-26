--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sync_bp_product_master_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for public.sync_bp_product_master_1

DROP PROCEDURE IF EXISTS public.sync_bp_product_master;

CREATE OR REPLACE PROCEDURE public.sync_bp_product_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_product_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    TRUNCATE TABLE base_pricing.bp_product_master CASCADE;

    DROP INDEX IF EXISTS base_pricing.idx_bp_product_master_id1;
    DROP INDEX IF EXISTS base_pricing.idx_bp_product_master_id2;

    INSERT INTO base_pricing.bp_product_master
    (
        product_id,
        product_name,
        product_image,
        active,
        usable,
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
		product_code
    )
    SELECT
        product_id,
        TRIM(UPPER(product_name)) AS product_name,
        product_image,
        active,
        usable,
        TRIM(UPPER(l0_id)),
        TRIM(UPPER(l0_name)),
        TRIM(UPPER(l0_cuq)),
        l0_cid,
        TRIM(UPPER(l1_id)),
        TRIM(UPPER(l1_name)),
        TRIM(UPPER(l1_cuq)),
        l1_cid,
        TRIM(UPPER(l2_id)),
        TRIM(UPPER(l2_name)),
        TRIM(UPPER(l2_cuq)),
        l2_cid,
        TRIM(UPPER(l3_id)),
        TRIM(UPPER(l3_name)),
        TRIM(UPPER(l3_cuq)),
        l3_cid,
        TRIM(UPPER(l4_id)),
        TRIM(UPPER(l4_name)),
        TRIM(UPPER(l4_cuq)),
        l4_cid,
        TRIM(UPPER(l5_id)),
        TRIM(UPPER(l5_name)),
        TRIM(UPPER(l5_cuq)),
        l5_cid,
		TRIM(UPPER(product_code))
    FROM public.bp_product_master
    GROUP BY
        1,2,3,4,5,6,7,8,9,
        10,11,12,13,14,15,16,17,18,
        19,20,21,22,23,24,25,26,27,
        28,29,30;

    CREATE INDEX idx_bp_product_master_id1 
        ON base_pricing.bp_product_master (product_id);

    CREATE INDEX idx_bp_product_master_id2 
        ON base_pricing.bp_product_master (l0_cid, l1_cid, l2_cid, l3_cid);

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
