--liquibase formatted sql
--changeset liquibase:add_vendor_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_vendor_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_vendor_config(_vendor_code character varying, _product_code character varying, _store_code character varying, _lead_time jsonb, _created_by integer);
CREATE OR REPLACE FUNCTION global.add_vendor_config(_vendor_code character varying, _product_code character varying, _store_code character varying, _lead_time jsonb, _created_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    begin
         insert into "global".vendor_product_location(vendor_code,product_code,store_code,lead_time,created_by)
values(_vendor_code,_product_code,_store_code,_lead_time ::jsonb,_created_by);

 	end  
    $function$
;
