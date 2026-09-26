--liquibase formatted sql
--changeset liquibase:get_allowed_channels runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_allowed_channels
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_allowed_channels();
CREATE OR REPLACE FUNCTION inventory_smart.get_allowed_channels()
 RETURNS TABLE(attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: inventory_smart.get_allowed_channels
Created by: Renugopal S
Created at: 18-Aug-2022
No of input parameter: 1
Parameter Description : None
Purpose: This function is a specifically used in inventory smart to filter out not relevant channels
Calling Statement:
select * from  inventory_smart.get_allowed_channels();
*/
declare
	_query_combine text;
	begin
		_query_combine := ' select * from global.get_tenant_attribute(''channels_allowed'') ';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
