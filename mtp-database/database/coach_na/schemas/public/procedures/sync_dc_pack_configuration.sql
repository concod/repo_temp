--liquibase formatted sql
--changeset manas.malik@impactanalytics.co:sync_dc_pack_configuration_v2 runOnChange:true stripComments:false splitStatements:false context:Victorias_Secret_Inventory_Smart labels:VPP-520
--comment: Updated sync_dc_pack_configuration SP for coach na 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_pack_configuration();


CREATE OR REPLACE PROCEDURE public.sync_dc_pack_configuration()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_configuration';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM inventory_smart.dc_pack_configuration;

    INSERT INTO inventory_smart.dc_pack_configuration (
        pack_type_id,
        article,
        size,
        pack_type,
        units_in_pack,
        style_id,
        product_code,
        pack_description
    )
    SELECT
        pack_type_id,
        article,
        size,
        pack_type,
        cast(units_in_pack as int),
        style_id,
        product_code,
        cast(pack_description as int)
    FROM
        "public".dc_pack_config;
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
