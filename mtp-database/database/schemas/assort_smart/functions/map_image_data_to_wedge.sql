--liquibase formatted sql
--changeset liquibase:map_image_data_to_wedge runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for map_image_data_to_wedge
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.map_image_data_to_wedge(input integer);
CREATE OR REPLACE FUNCTION assort_smart.map_image_data_to_wedge(input integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_combine text;
 	begin
 		_query_combine := ' UPDATE assort_smart.plan_wedge_opt_master SET image_name_url=url ,
                                attribute_value = attribute_value::jsonb || ''{"is_image_mapped": "True" }''
                                from  (select image_url  url, hierarchy_code, 
                                            attribute_value as img_attribute_value,
                                            attribute_name as img_attribute_name
                                            from assort_smart.product_image_details 
                                        ) as img
                                where plan_code = ' || $1 ||' 
                                and attribute_value->>''is_image_mapped'' = ''False'' 
                                and levels->>''hierarchy_code'' = img.hierarchy_code
                                and (attribute_value->>''choice_name'' || ''-''|| ' || $1 ||') = img_attribute_name
 								';
 		raise notice '%', _query_combine;
 		execute _query_combine;
  	end
 $function$
;