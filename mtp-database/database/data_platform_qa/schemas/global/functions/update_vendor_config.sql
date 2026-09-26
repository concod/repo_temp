--liquibase formatted sql
--changeset liquibase:update_vendor_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_vendor_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_vendor_config(_product_code character varying, _store_code character varying, _vendor_code character varying, _lead_time jsonb, _updated_by integer);
CREATE OR REPLACE FUNCTION global.update_vendor_config(_product_code character varying, _store_code character varying, _vendor_code character varying, _lead_time jsonb, _updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare  
    begin
        UPDATE 
          global.vendor_product_location
        SET 
          lead_time = lead_time || _lead_time, 
          updated_at = now(), 
          updated_by = _updated_by
        WHERE 
          product_code = _product_code
            and store_code = _store_code
            and vendor_code = _vendor_code;
    end
    $function$
;
