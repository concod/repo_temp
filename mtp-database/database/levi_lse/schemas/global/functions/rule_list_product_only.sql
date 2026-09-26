--liquibase formatted sql
--changeset shreyansh.pandey:MTP-71931 runOnChange:true stripComments:false splitStatements:false context:MTP-69225 labels:MTP-71931
--comment: added join from product_attribute_filter table, optimizing
--rollback: SELECT 1

drop function if exists global.rule_list_product_only(refcursor, jsonb, jsonb, text);
DROP FUNCTION IF EXISTS global.rule_list_product_only(refcursor, jsonb, jsonb, text, jsonb);


CREATE OR REPLACE FUNCTION global.rule_list_product_only(refcursor, jsonb, jsonb, text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_final varchar;
_query_meta_filters text;
_where_clause text;
_module_code text;
_query_before_limit text;
_limit_offset_part text;
/*
sample call:select * from global.rule_list_product_only('cur', '{
    "l0_name": [],
    "l1_name": [
        {
            "type": "list",
            "operator": "in",
            "values": [
                "33-M CLOTHING"
            ]
        }
    ],
    "color": [],
    "size": [],
    "l4_name": [],
    "article": [],
    "l3_name": [],
    "l2_name": []
}'::jsonb, '{"limit":{
"limit":10, "page":1
}}'::jsonb, 'global.rcl_product_mapping_product_store_rule'); 
fetch all from "cur";  
*/
BEGIN
    _query_meta_filters := global.form_table_query($3);
   
   --TODO: below is the hardcoding done, ideally module code should come from front-end while calling API
   
   	select distinct module_code from global.module_master join global.rcl_master using (module_code) where module_name = 'Product Mapping' and application_code = 1 limit 1 into _module_code;  
   
   	select * from global.form_attribute_table_filters_rcl_level('product_attributes', 'product_code', $2, '', _module_code) into _query_part;
   
   	--raise notice 'query_combine tempo: %', _query_part;
      
	--select * from global.form_rcl_product_validity_filter($2::jsonb, '{}'::text[]) into _where_clause;
	/*
	if _where_clause is not null and length(_where_clause) > 0 then
	 	_query_part := 'SELECT * FROM ' || $4 || ' r ' || _where_clause;
    else
     	_query_part := 'SELECT * FROM ' || $4 || ' r ';
    END IF;
    */
	SELECT trim(regexp_replace(_query_meta_filters, '\s+LIMIT\s+.*$', '', 'i')) INTO _query_before_limit;
	SELECT trim(regexp_replace(_query_meta_filters, '^.*?(?=LIMIT)', '')) INTO _limit_offset_part;

    _query_combine := '
		SELECT
                *
            FROM
                (' || _query_part || ') p ' || _query_before_limit || ' order by color_name asc
            ' || _limit_offset_part;
	raise notice 'query_combine: %', _query_combine;
	raise notice ' _query_meta_filters: %', _query_meta_filters;
     open $1 for execute _query_combine;
	return _query_combine;
END
$function$
;
