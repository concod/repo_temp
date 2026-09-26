-- liquibase formatted sql
-- changeset shameel.zeshan@impactanalytics.co:sync_product_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_product_dc_mapping
-- comment: updated logic for product_dc_mapping

DROP PROCEDURE if exists public.sync_product_dc_mapping();

CREATE OR REPLACE PROCEDURE public.sync_product_dc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_dc_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    INSERT INTO "global".product_mapping_product_dc(
        mapping_type,
        product_code,
        dc_code,
        is_active
    )
    SELECT
        'product_dc',
        a.product_code,
        c.dc_code,
        CASE
            WHEN is_active = 'active' THEN true
            ELSE false
        END
    FROM
        public.product_dc_mapping_delta a
        JOIN global.product_master b USING(product_code)
        JOIN global.store_master c on a.dc_code=c.store_code
    WHERE
        a.dc_code IS NOT NULL
    ON CONFLICT DO NOTHING;
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
