--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:product_store_mapping_product_mapped_products_list_MTP-52725 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:mapping_is_upload_feature
--comment: added created type and updated type for mapping is_upload feature
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_store_mapping_product_mapped_products_list(input text[], text, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_store_mapping_product_mapped_products_list(input text[], text, jsonb, jsonb, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, validity datemultirange, updated_by text, updated_at timestamptz, created_type boolean, updated_type boolean)
 LANGUAGE plpgsql
AS $function$	/*
 	 * Function/Procedure name: global.product_store_mapping_product_mapped_products_list
 	 * Created by: Vyshakh M
 	 * Created at: 26-Jul-2022
 	 * No of input parameter: 5
 	 
 	 * Purpose: This function been created to get the mapped products for the selected products store combination
 	 *
 	 * if any modification done in same function/procedure please record the changes in below format
 	 *
 	 * Updated_by       Updated_on      Purpose
 	 * ----------       -----------     --------
 	 *
 	 */
 /*
  calling statement:
   	 select * from    global.product_store_mapping_product_mapped_products_list
 (
 '{"111-1", "111-2"}', 
 '123', 
 '{}', 
 '{"product_code": [{"type": "list", "operator": "in", "values": ["883815176166", "884628334415"]}], "style": [{"type": "list", "operator": "in", "values": ["Style1", "Style2"]}], "l0_name": [], "l1_name": [], "l2_name": [], "l3_name": [], "color": [], "size": [], "style_group": []}', 
 '{"search": [{"column": "style_id", "pattern": "new"}], "sort": [{"column": "style_id", "order": "asc"}], "range": [{"column": "price", "min_val": 1, "max_val": 10}]}'
   
  */
 declare
 	_query_pm text := '';
 	_query_pa text := '';
 	_query_table_filters text := '';
 	_query_combine text;
 	_product_codes_len int := array_length($1, 1);
 	begin
 		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $3));
  		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
 		_query_table_filters := "global".form_table_query($5);
 		_query_combine := 'SELECT * FROM (select pm.product_code, pm.product_name, psm.validity, max(psm.name) as updated_by ,  max(psm.updated_at) as updated_at, created_type, updated_type
  from (SELECT main.* FROM (' || _query_pm || ') main JOIN (' || _query_pa || ') attributes ON main.product_code = attributes.product_code) pm
 join (
 select distinct x.product_code, psm.validity, um.name, pg_xact_commit_timestamp(psm.xmin) as updated_at, uc1.updation_value as created_type, uc2.updation_value as updated_type from (
 select
 	unnest(''' || $1::varchar || '''::varchar[]) product_code,
 	''' || $2 || ''' store_code) x left join global.product_mapping_product_store psm on
 	x.store_code = psm.store_code 
 	and x.product_code = psm.product_code
left join global.user_master um on um.user_code = psm.updated_by
left join global.updation_config uc1 on psm.creation_source_id = uc1.updation_key
left join global.updation_config uc2 on psm.current_updation_id = uc2.updation_key
 ) psm
 		on
 	pm.product_code = psm.product_code
 	--and psm.validity is not null
     group by
 	pm.product_code,
 	pm.product_name,
 	psm.validity,
	psm.created_type,
	psm.updated_type
 		) X ' || _query_table_filters;
 		raise notice '%', _query_combine;
 		RETURN QUERY execute _query_combine;
  	end
 $function$
;

