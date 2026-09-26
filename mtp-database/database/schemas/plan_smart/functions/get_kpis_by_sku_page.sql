--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_kpis_by_sku_page_change_for_pchi_bug runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-19169
--comment: initial changeset for get_kpis_by_sku_page
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_kpis_by_sku_page(refcursor, character varying, jsonb, text[], integer[], jsonb, character varying, jsonb);
CREATE OR REPLACE FUNCTION plan_smart.get_kpis_by_sku_page(refcursor, character varying, jsonb, text[], integer[], jsonb, character varying, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   l4_name/article/SKU listing, caching and pagination.
   Parameres :
               $1: Refcursor
               $2: Formula String
               $3: Input Filter Json
               $4: Classes
               $5: Weeks
               $6: Grouping Set with key value pair like {"l4_name": "12492", "article":"12492-12599", "product_code":""} and {} as default
               $7: Channel
               $8: Meta JSON for pagination
   
   Usage:
 	select plan_smart.get_kpis_by_sku_page(
 	  'my_cur',
 	  'sum((current_week_data->>''total_sales'')::float8) as cy_total_sales,
 	  sum((current_week_data->>''fp_sales'')::float8) as cy_fp_sales,
 	  sum((current_week_data->>''clr_sales'')::float8) as cy_clr_sales',
 	  '{
 			"l0_name": [{"type": "list", "operator": "in", "values": ["Bags"]}], 
 			"l1_name": [{"type": "list", "operator": "in", "values": ["Handbags"]}], 
 			"l2_name": [{"type": "list", "operator": "in", "values": ["Totes"]}]
 	   }'::jsonb,
 	  '{"Totes"}'::text[],	
 	  '{202414,202415,202416,202417,202418,202419,202420,202421,202422,202423,202424,202425,202426}'::integer[],
 	  '{"l4_name": "12492", "article":"12492-12599", "product_code":""}',
 	  'Full Line Retail',
 	  '{
         "search": [],
         "range": [],
         "sort": [],
         "limit": {
             "limit": 5,
             "page": 1
         }
       }'
     );
 fetch all in "my_cur";
 */
 
 declare
 	_query_filter text := '';
 	_week_level_sql text[];
 	_weeks int[]:= $5;
 	_aggr_fun_clause text := $2;
 	_query_combine text := '';
    _classes text[] := $4;
    _channel text := $7;
    _select_clause text := '';
    _where_clause text := '';    
    _group_by_clause text := '';
    
    _query_table_filters text := '';
    _cache_payload jsonb := jsonb_build_object('cols', $2, 'channel', $7, 'cls_filter', $3, 'classes', $4, 'weeks',  $5, 'sku_filter', $6);
 	_cache_table_id text;
 	_cache_schema text := 'plan_smart';
 	_cache_sp text := '.get_kpis_by_sku_page';
 	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
 	_cache_dependencies text[] := '{}';
 	begin
 		raise notice '%', _weeks;	
 		_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code,l4_name,article,product_code',$3);
 	   
 	
         select
           -- Build the Select clause by concatenating the column names 
           'current_week, '||coalesce(string_agg(key , ' , '), 'l4_name') AS select_clause,
           -- Build the WHERE clause by concatenating the column names and values
           --'WHERE ' || string_agg(key || ' = ' ||''''||value||'''', ' AND ') AS where_clause,
           -- Build the GROUP BY clause by concatenating the column names
           coalesce('GROUP BY current_week, ' || string_agg(key, ', ') , 'GROUP BY (current_week, l4_name)') AS group_by_clause
         into
           _select_clause,
           _group_by_clause
         from jsonb_each_text($6) ;
        
         select
           -- Build the WHERE clause by concatenating the column names and values
           'WHERE ' || string_agg(key || ' = ' ||''''||value||'''', ' AND ') AS where_clause
         into
           _where_clause
         from jsonb_each_text($6) where value <> '';
 
 		_query_combine :=  '
 			select 
               '|| _select_clause ||',
 			  '|| _aggr_fun_clause ||' 
 			from (
 				select
 				  *
 				from
 			      plan_smart.wf_master_2
 				where
                  channel = ''' || _channel || '''
                and
 			      current_week = ANY(''{' || array_to_string(_weeks, ',') || '}'')
 			    and
                  class = ANY(''{"' || array_to_string(_classes, '","') || '"}'')
                 ) pmd
 			join (' ||_query_filter|| ' ) phf on
 				pmd.hierarchy_code = phf.hierarchy_code
             '||coalesce(_where_clause,'')||'
 			'||_group_by_clause;
 	 	raise notice '%', _query_combine;
 	    --open $1 for execute _query_combine;
 	 
 	 	select
 		  * 
 		from 
 		  cache.wrap_sp(
 			_cache_schema, _cache_sp, _cache_payload, 
 			_query_combine, _cache_dependencies, 
 			_cache_key_pattern
 		  ) into _cache_table_id;
 		_query_table_filters := global.form_table_query($8);
 		perform set_config(
 		  'myvars.cache_table_id', _cache_table_id, 
 		  true
 		);

 		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
 	 
 		RETURN $1;
 	end
 $function$

;