--liquibase formatted sql
--changeset akshay.jain@impact:rule_list_product_only_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:rule_list_product_only_modified
--comment: rule list product only now joins with PAF
--rollback: SELECT 1
drop function if exists global.rule_list_product_only(refcursor, jsonb, jsonb, text);
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
_levels text[];
filtered_keys jsonb;
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
   -- TODO : added additonal check to remove keys from incoming filters if they are not part of any rcl corresponding to module.
   -- Need to get module code from front-end directly instead of creating it here
   	select
		array_agg(distinct lev) into  _levels 
	from global.rcl_master, unnest(level) as lev
	where not is_deleted
	and module_code in (select distinct module_code from global.module_master join global.rcl_master using (module_code) where module_name = 'Product Mapping' limit 1)
	group by is_deleted;

       
    SELECT jsonb_object_agg(key, value) FROM jsonb_each($2) WHERE key = ANY(_levels) into filtered_keys;
   
   raise notice 'filtered data %', filtered_keys;
      
	select * from global.form_rcl_product_validity_filter(filtered_keys::jsonb, '{}'::text[]) into _where_clause;

	if _where_clause is not null and length(_where_clause) > 0 then
	 	_query_part := 'SELECT * FROM ' || $4 || ' r ' || _where_clause;
    else
     	_query_part := 'SELECT * FROM ' || $4 || ' r ';
    END IF;

    _query_combine := '
   select *
   from         
   (SELECT
                p.*
            FROM
                (' || _query_part || ') p
            JOIN global.rcl_master rm
                USING (rcl_code)
            WHERE NOT rm.is_deleted)as A
            ' || _query_meta_filters;
	raise notice 'query_combine: %', _query_combine;
     open $1 for execute _query_combine;
	return _query_combine;
END
$function$
;
