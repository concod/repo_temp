--liquibase formatted sql
--changeset aleena.reji@impactanalytics.co:populate_fc_dc_store_attribute runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:populate_fc_dc_store_attribute
--comment: Changeset for populate_fc_dc_store_attribute
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS "global".populate_fc_dc_store_attribute();

CREATE OR REPLACE PROCEDURE global.populate_fc_dc_store_attribute()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _st TIMESTAMP := clock_timestamp();
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.populate_fc_dc_store_attribute';
    _log_step varchar;
BEGIN

    -- Start logging
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        _log_step := 'Populate distribution_centres from store_master';
        PERFORM set_config('local.log_step', _log_step, true);
        
        INSERT INTO "global".distribution_centres (
            "name", is_active, is_deleted, linked_store_code
        ) 
        select 
            sm.store_name, 
            sm.active, 
            sm.is_deleted, 
            sm.store_code 
        from 
            global.store_master sm
		join
			global.store_attributes_filter saf
		using (store_code)
        where saf.store_type = 'Warehouse' and sm.special_classification = 'WHS' 
		on conflict(linked_store_code) do update 
        set 
            is_active = excluded.is_active, 
            is_deleted = not excluded.is_active;

        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'Update store_master with dc_code references';
        PERFORM set_config('local.log_step', _log_step, true);
        
        UPDATE 
            "global".store_master t1 
        SET 
            dc_code = t2.dc_code 
        FROM 
            "global".distribution_centres t2 
        WHERE 
            t1.store_code = t2.linked_store_code;

        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'Clean existing dc_name attributes';
        PERFORM set_config('local.log_step', _log_step, true);
        
        delete from 
            "global".store_attributes 
        where 
            attribute_name in('dc_name');

        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'Insert fresh dc_name attributes';
        PERFORM set_config('local.log_step', _log_step, true);
        
        insert into "global".store_attributes 
        select 
            linked_store_code as store_code, 
            'dc_name' as attribute_name, 
            name as attribute_value 
        from 
            "global".distribution_centres;

        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        _log_step := 'Build store attributes filter';
        PERFORM set_config('local.log_step', _log_step, true);
        
        call global.build_store_attributes_filter('');

        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error if an exception occurs during any part of the procedure
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;

    CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);

END;
$procedure$
;
