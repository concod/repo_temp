--liquibase formatted sql
--changeset liquibase:get_generic_schema_mapping_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_generic_schema_mapping_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_generic_schema_mapping_list(input text);
CREATE OR REPLACE FUNCTION assort.get_generic_schema_mapping_list(input text)
 RETURNS TABLE(dy_column_name jsonb)
 LANGUAGE plpgsql
AS $function$
	/*
Function/Procedure name: assort.get_generic_schema_mapping_list
Created by: Hemant Kumar Singh
Created at: 12-Oct-2022
No of input parameter: 1
Parameter Description : $1 =  str 
​
Purpose: This function been created to getting scren  
​
Calling Statement:
​
SELECT assort.get_generic_schema_mapping_list('assort_hierarchy_list');
​
​
Hemant Kumar SIngh:getting fetching from tenant_attribute_master dynamic level hierarchy from  assort.get_generic_schema_mapping_list
*/
 declare
   _query_combine text;
    begin
        	
		_query_combine := 'SELECT jsonb_object_agg(source_column_name,generic_column_name) dy_column_name
							FROM "global".product_generic_schema_mapping  pgsm
							join 
							(select  unnest(replace (replace (attribute_value,''['',''{''),'']'',''}'')::text[]) attribute_value from (
							SELECT  (attribute_value->>''value''::text) attribute_value
							FROM "global".tenant_attribute_master
							where "name" =''' || $1 || ''') tam ) tamm
							on pgsm.generic_column_name = tamm.attribute_value
					';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
    end
    $function$
;
