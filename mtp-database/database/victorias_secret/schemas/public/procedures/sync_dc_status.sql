--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:sync_product_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Victorias_secret_inventory_smart labels:VPP-310
--comment: Initial Changeset for sync_dc_status
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_dc_status();
CREATE OR REPLACE PROCEDURE public.sync_dc_status()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_status';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _admin_user INTEGER;
    _record_variable RECORD;
    _dc_code INTEGER; 
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    SELECT user_code INTO _admin_user FROM global.user_master WHERE name = 'Admin' LIMIT 1;

    FOR _record_variable IN EXECUTE 'SELECT dc_code AS name,
                                           CASE WHEN attribute_value = ''active'' THEN TRUE ELSE FALSE END AS is_active,
                                           ' || _admin_user || ' AS created_by,
                                           NOW() AS created_at,
                                           FALSE AS is_deleted,
                                           dc_code AS linked_store_code
                                      FROM public.dc_status ds
                                     WHERE attribute_name = ''status'''
    LOOP 
        -- Use RETURNING to capture values into _dc_code
        EXECUTE 'INSERT INTO global.distribution_centres
                    (dc_code, name, is_active, created_by, created_at, is_deleted, linked_store_code)
                  VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                  ON CONFLICT (name)
                  DO UPDATE SET is_active = EXCLUDED.is_active
                  RETURNING dc_code'
        INTO _dc_code  -- Use INTO to store the result in _dc_code
        USING nextval('global.distribution_centres_dc_code_seq'::regclass), 
              _record_variable.name, 
              _record_variable.is_active, 
              _record_variable.created_by,
              _record_variable.created_at, 
              _record_variable.is_deleted, 
              _record_variable.linked_store_code;

        -- Now _dc_code contains the value returned by RETURNING

        INSERT INTO global.store_master (store_code, store_name, store_description, active, dc_code)  
        VALUES (
            _record_variable.linked_store_code, 
            _record_variable.linked_store_code,
            _record_variable.linked_store_code,
            _record_variable.is_active,
            _dc_code
        )
        ON CONFLICT (store_code)
        DO UPDATE SET active = EXCLUDED.active,
                      dc_code = EXCLUDED.dc_code;  -- Corrected syntax for setting dc_code
    END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;