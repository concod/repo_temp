--liquibase formatted sql
--changeset liquibase:get_db_maintenance runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_db_maintenance
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_db_maintenance();
CREATE OR REPLACE FUNCTION global.get_db_maintenance()
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare 
	flag bool;
	begin
		select max(attribute_value->>'value')::bool into flag from "global".tenant_attribute_master
where (name, attribute_type, application_code) = ('maintenance_mode', 'APPLICATION', 3);
		RETURN case when flag is null then true else flag end;
	end $function$
;
