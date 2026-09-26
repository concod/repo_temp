--liquibase formatted sql
--changeset imran.khan@impact:rule_list_product_only_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-82308
--comment: join with PAF and product attributes filtering  
--rollback: SELECT 1

drop function if exists global.rule_list_product_only(refcursor, jsonb, jsonb, text);
DROP FUNCTION if exists "global".rule_list_product_only(refcursor, jsonb, jsonb, text, jsonb);

CREATE OR REPLACE FUNCTION global.rule_list_product_only(refcursor, jsonb, jsonb, text, jsonb DEFAULT '{}'::jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_query_pa text;
_final varchar;
_query_meta_filters text;
_where_clause text;
_levels text[];
filtered_keys jsonb;
_active_filter jsonb := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';
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

    $2 := $2 || _active_filter;
    IF $2 != '{}'::jsonb THEN
        _query_pa := global.form_attribute_table_filters_v3('product_attributes', 'product_code', $2);

    END IF;
    
    if _where_clause is not null and length(_where_clause) > 0 then
        _query_part := 'SELECT r.* FROM ' || $4 || ' r ' || _where_clause;
    else
        _query_part := 'SELECT r.* FROM ' || $4 || ' r';
    END IF;

    _query_combine := '
    WITH filtered_products AS (
        SELECT *
        FROM ' || CASE WHEN $5 != '{}'::jsonb 
                      THEN '(' || _query_pa || ')'
                      ELSE 'global.product_attributes_filter' 
                 END || ' paf
    )
    SELECT 
        p.*, 
        paf.style_name
    FROM (
        SELECT r.*
        FROM (' || _query_part || ') r
        JOIN global.rcl_master rm USING (rcl_code)
        WHERE NOT rm.is_deleted
    ) p
    LEFT JOIN filtered_products paf
        ON (p.rcl_dimension->>''l0_name'') = paf.l0_name 
        AND (p.rcl_dimension->>''l4_name'') = paf.l4_name
    ' || _query_meta_filters;
	raise notice 'query_combine: %', _query_combine;
     open $1 for execute _query_combine;
	return _query_combine;
END
$function$
;
