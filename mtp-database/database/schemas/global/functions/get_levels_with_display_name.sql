--liquibase formatted sql
--changeset liquibase:get_levels_with_display_name runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_levels_with_display_name
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_levels_with_display_name(input text);
CREATE OR REPLACE FUNCTION global.get_levels_with_display_name(input text)
 RETURNS TABLE(dy_column_name jsonb)
 LANGUAGE plpgsql
AS $function$
	/*
        Function/Procedure name: "global".get_levels_with_display_name
        Created by: Sadhana J
        Created at: 23-Jan-2023
        No of input parameter: 1
        Parameter Description : $1 =  str
        Purpose: This function been created to getting scren
        Calling Statement:
        SELECT "global".get_levels_with_display_name('assort_hierarchy_list');

        Sadhana J : getting fetching from tenant_attribute_master dynamic level hierarchy from  assort.get_levels_with_display_name
        */
 declare
   _query_combine text;
    begin

		_query_combine := 'SELECT jsonb_object_agg(display_name,generic_column_name) dy_column_name
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
