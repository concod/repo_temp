--liquibase formatted sql
--changeset adesh:product_rule_pp_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39653
--comment: remove-primary_sku-from-hierarchy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_pp_mapping(refcursor, text, _varchar, _int4, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_pp_mapping(input refcursor, text, character varying[], integer[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 #variable_conflict use_column
 declare
 		_condition_string text;
 		_hierarchy_columns text;
 		_final_query text;
 		_ppaf_req_col text;
 		_pp_cte_req_col text;
 		_query_table_filters text := '';
 		_cache_payload jsonb := jsonb_build_object('primary_sku', $2, 'channel', $3, 'default_codes', $4);
 begin
 			
	 	SELECT 
		  concat(
		    string_agg(
		      format(
		        '(paf.%1$I = any(ppaf.%1$I) or ppaf.%1$I is null)', 
		        attribute_name
		      ), 
		      ' and '
		    )
		  ) as condition_string,
		  string_agg(attribute_name::text, ',') as hierarchy_columns
		FROM 
		(
		  SELECT DISTINCT attribute_name 
		  FROM "global".product_attributes_list 
		  WHERE is_hierarchy and attribute_name != 'article' and attribute_name != 'l0_name' and attribute_name != 'primary_sku'
		) pal into _condition_string, _hierarchy_columns;
	
	SELECT regexp_replace(_hierarchy_columns,',', ',ppaf.', 'g') into _ppaf_req_col;
	SELECT regexp_replace(_hierarchy_columns,',', ',pp_cte.', 'g') into _pp_cte_req_col;
	_ppaf_req_col := 'ppaf.'||_ppaf_req_col;
	_pp_cte_req_col := 'pp_cte.'||_pp_cte_req_col;
	raise notice '_hierarchy_columns %',_hierarchy_columns;
	raise notice '_ppaf_req_col %',_ppaf_req_col;
	raise notice '_pp_cte_req_col %',_pp_cte_req_col;
	raise notice 'ffff %',$4;
	_query_table_filters := global.form_table_query($5);
	
	_final_query := '
		with paf as (
			select distinct ' || _hierarchy_columns || ' from global.product_attributes_filter where primary_sku =  '''|| $2 ||'''
		),
		pp_cte as (
			select  '||_ppaf_req_col||' , pp_code from inventory_smart.product_profile_attributes_filter ppaf 
			join paf on ' || _condition_string || ' and (ppaf.channel::text[] && '''||$3::text||'''::text[] or ppaf.channel is null)
		),
		pp_name as (
			select ppm.pp_code, ppm.name, '|| _pp_cte_req_col ||',
			case when mpp.pp_code is null then false else true end as mapped
			 from pp_cte
			join inventory_smart.product_profile_master ppm using(pp_code)
			left join (
 		    select 
 		      unnest(''' || $4 ::text|| '''::integer[]) as pp_code
 		  ) mpp using(pp_code) where not ppm.is_deleted order by mapped desc
		)
		select * from pp_name' || _query_table_filters;
	raise notice ' %',_final_query;
--	return query execute _final_query;
	open $1 for execute _final_query;
	RETURN $1;
  end
 $function$
;
