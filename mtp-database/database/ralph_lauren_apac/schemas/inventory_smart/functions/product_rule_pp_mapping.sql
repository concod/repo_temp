--liquibase formatted sql
--changeset liquibase:product_rule_pp_mapping_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:liquibase_project_start,MTP-110375,MTP-112354,MTP-124520
--comment: initial changeset for product_rule_pp_mapping,MTP-110375,fix,MTP-112354,MTP-124520
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_pp_mapping(input refcursor, text, character varying[], text, integer[], integer[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_pp_mapping(input refcursor, text, character varying[], text, integer[], integer[], jsonb)
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
 		_cache_payload jsonb := jsonb_build_object('article', $2, 'channel', $3, 'retail_region', $4, 'available_codes', $5, 'default_codes', $6);
		hierarchy_arr text[];
		select_list text := '';
        col text;
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
	raise notice 'ffff %',$6;
	_query_table_filters := global.form_table_query($7);

	hierarchy_arr := string_to_array(_hierarchy_columns, ',');
    raise notice '_abc %',hierarchy_arr;

    FOREACH col IN ARRAY hierarchy_arr LOOP
		--raise notice ' xyz %',col;
        select_list := select_list || 'string_to_array(paf1.' || col || ', '','')::text[] AS ' || col || ',';
		--select_list := ','
    END LOOP;

    -- Full query
    raise notice '_abcd %',select_list;
	
	_final_query := '
		with paf as (
			select distinct ' || _hierarchy_columns || ' from global.product_attributes_filter where article = ''' || $2 || ''' and active
		),
		pp_cte as (
			select  '||_ppaf_req_col||' , pp_code from inventory_smart.product_profile_attributes_filter ppaf 
			join paf on ' || _condition_string || ' and (ppaf.channel::text[] && '''||$3::text||'''::text[] or ppaf.channel is null)
			union 
			select distinct '|| select_list||' ppcm.pp_code  from inventory_smart.product_profile_master ppm 
			join global.product_attributes_filter paf1 on paf1.article = ppm."name" 
			join inventory_smart.product_profile_channel_mapping ppcm on ppcm.pp_code = ppm.pp_code 
			where article = ''' || $2 || ''' and ppcm.channel = ''' || $3[1] || ''' and ppcm.retail_region = ''' || $4 ||''' and ppm.special_classification = ''ia-clone'' and ppm.is_deleted = false and paf1.active 
		),
		pp_name as (
			select ppm.pp_code, ppm.name, '|| _pp_cte_req_col ||',
			case when mpp.pp_code is null then false else true end as mapped
			 from pp_cte
			join inventory_smart.product_profile_master ppm using(pp_code)
			left join (
 		    select 
 		      unnest(''' || $6 ::text|| '''::integer[]) as pp_code
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
