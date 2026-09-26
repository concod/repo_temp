--liquibase formatted sql
--changeset pruthviraj.savanur:update_vendor_codes_for_table_product_code runOnChange:true stripComments:false splitStatements:false context:update_vendor_codes labels:MTP-91366
--comment: Update Vendor Code in base tables at product level
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.update_vendor_codes_for_table_product_code(target_table TEXT);
CREATE OR REPLACE PROCEDURE public.update_vendor_codes_for_table_product_code(target_table TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    updated_rows INTEGER;
    stmt TEXT;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.update_vendor_codes_for_table_product_code';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Build the dynamic UPDATE statement
    stmt := format($sql$
        UPDATE %s f
        SET vendor_code = m.vendor_code
        FROM (
            SELECT DISTINCT product_code, vendor AS vendor_code
            FROM global.product_attributes_filter
        ) m
        WHERE f.product_code = m.product_code
          AND f.vendor_code IS DISTINCT FROM m.vendor_code;
    $sql$, target_table);

    -- Execute it
    EXECUTE stmt;

    -- Capture row count
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RAISE NOTICE 'Table % updated rows: %', target_table, updated_rows;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;