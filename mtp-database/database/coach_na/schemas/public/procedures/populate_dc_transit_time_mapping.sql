--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:populate_dc_transit_time_mapping runOnChange:true stripComments:false splitStatements:false context:populate_dc_transit_time_mapping labels:first commit
--comment: populate_dc_transit_time_mapping
--rollback: SELECT 1





DROP PROCEDURE IF EXISTS public.populate_dc_transit_time_mapping();

CREATE OR REPLACE PROCEDURE public.populate_dc_transit_time_mapping()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.populate_dc_transit_time_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE from inventory_smart.dc_transit_time_mapping;

    INSERT INTO inventory_smart.dc_transit_time_mapping (
        mapping_code,
        transit_time,
        priority
    )
    SELECT
        mapping_code,
        transit_time,
        RANK() OVER (PARTITION BY store_code ORDER BY mapped_dc_code ASC) AS priority
    FROM (
        SELECT
            src.store_code,
            j.key AS dc_code,
            j.value::FLOAT AS transit_time,
            CASE j.key
                WHEN 'CA7777-CAN-Retail-Store'     THEN 2
                WHEN 'JAX-USA-Retail-Store'        THEN 3
                WHEN 'US7781-USA-Retail-Store'     THEN 1
                WHEN 'CA7777-CAN-Outlet-Store'     THEN 5
                WHEN 'JAX-USA-Outlet-Store'        THEN 4
                WHEN 'US7781-USA-Outlet-Store'     THEN 6
                ELSE NULL
            END AS mapped_dc_code,
            pm.mapping_code
        FROM public.dc_store_mapping_allocation src
        JOIN LATERAL json_each_text(src.dc_transit_times) AS j(key, value) ON TRUE
        LEFT JOIN global.product_mapping_store_dc pm
            ON pm.store_code = src.store_code
           AND pm.dc_code = CASE j.key
                              WHEN 'CA7777-CAN-Retail-Store'     THEN 2
                              WHEN 'JAX-USA-Retail-Store'        THEN 3
                              WHEN 'US7781-USA-Retail-Store'     THEN 1
                              WHEN 'CA7777-CAN-Outlet-Store'     THEN 5
                              WHEN 'JAX-USA-Outlet-Store'        THEN 4
                              WHEN 'US7781-USA-Outlet-Store'     THEN 6
                              ELSE NULL
                            END
        WHERE pm.mapping_code IS NOT NULL
    ) ranked
    ON CONFLICT (mapping_code, transit_time) DO NOTHING;
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
