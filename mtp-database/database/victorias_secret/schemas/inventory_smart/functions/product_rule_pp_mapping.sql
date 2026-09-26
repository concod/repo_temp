--liquibase formatted sql
--changeset liquibase:product_rule_pp_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0_2 labels:liquibase_project_start
--comment: initial changeset for product_rule_pp_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_pp_mapping(input refcursor, text, character varying[], integer[], integer[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_pp_mapping(input refcursor, text, character varying[], integer[], integer[], jsonb)
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
 		_cache_payload jsonb := jsonb_build_object('article', $2, 'channel', $3, 'available_codes', $4, 'default_codes', $5);
		v_gen_random_uuid text  := gen_random_uuid()::varchar;
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
		  WHERE is_hierarchy and attribute_name != 'article'
		) pal into _condition_string, _hierarchy_columns;
	
	SELECT regexp_replace(_hierarchy_columns,',', ',ppaf.', 'g') into _ppaf_req_col;
	SELECT regexp_replace(_hierarchy_columns,',', ',pp_cte.', 'g') into _pp_cte_req_col;
	_ppaf_req_col := 'ppaf.'||_ppaf_req_col;
	_pp_cte_req_col := 'pp_cte.'||_pp_cte_req_col;
	raise notice '_hierarchy_columns %',_hierarchy_columns;
	raise notice '_ppaf_req_col %',_ppaf_req_col;
	raise notice '_pp_cte_req_col %',_pp_cte_req_col;
	raise notice 'ffff %',$5;
	_query_table_filters := global.form_table_query($6);
	
	_final_query := '
		with paf as (
			select distinct ' || _hierarchy_columns || ' from global.product_attributes_filter where article = ''' || $2 || '''
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
 		      unnest(''' || $5 ::text|| '''::integer[]) as pp_code
 		  ) mpp using(pp_code) where not ppm.is_deleted order by mapped desc
		)
		select * from pp_name' || _query_table_filters;
	raise notice ' %',_final_query;
--	return query execute _final_query;
	open $1 for execute _final_query;
	perform  global.sp_log(v_gen_random_uuid,'inventory_smart.product_rule_pp_mapping', 'Before return',_final_query,jsonb_build_object('article', $2, 'channel', $3, 'available_codes', $4, 'default_codes', $5));
	RETURN $1;
  end
 $function$
;
