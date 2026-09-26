--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:product_minimal_status_list_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:fetch_relevant_columns
--comment: initial changeset for product_minimal_status_list so that to fetch only relevant columns
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_minimal_status_list(input jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_minimal_status_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, aggregation_code text)
 LANGUAGE plpgsql
AS $function$
 declare
 	_query_pm text := '';
  	_query_pa text := '';
  	_query_table_filters text := '';
  	_query_combine text := '';
  	_final_query text := '';
  	_where_and_clause text := '';
  	_where text:= '';
  	_product_attribute_json_build_column_for_filter text[]:= array[]::text[];
  	_key text;
  	_value text;
  	_fl boolean:= false::boolean;
  	_agg_level_db text;
  	_agg_level text:= 'product_code';
    _l0_name_status text;
  	updated_at_column text;
 /*
  * Function/Procedure name: global.product_minimal_status_list
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  * Akshay Jain    20-02-2023:    To accomodate fetching just product name and product code.
  *                               changes : made sp non-cursor based
  * Akshay Jain    01-07-2024:    Using same defination as product status list SP and fetching just relevant columns like product_code, product_name and aggregation_code
  *
  */
 	begin
	 	select (attribute_value->>'dynamicLabelKeys')::json->>'style' as atr_val from global.tenant_attribute_master tam where name = 'core_screen_configuration' into _agg_level_db;
        if _agg_level_db is not null
        then _agg_level = _agg_level_db;
        end if;
        for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
            
            if _key = _agg_level
            then
            _fl := true;
            end if;
            _product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, ''''||_key||''''),'X.'|| _key ||'');
        end loop;
        if _fl is false
            then
            $2 = $2 || jsonb_build_object(_agg_level, jsonb_build_array());
        end if;
        _product_attribute_json_build_column_for_filter := array_append(array_append(_product_attribute_json_build_column_for_filter, '''aggregation_code'''),'X.'|| _agg_level ||'');
        SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='product_time_attributes' and table_schema = 'global' and column_name = 'l0_name' into _l0_name_status;
        
        raise notice 'ffdf %', _l0_name_status;
        _query_pm := 'SELECT * FROM "global".product_master' || (global.form_main_table_filters('product_master', $1));
        _query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
        _query_table_filters := global.form_table_query($3);
        
        if _l0_name_status is null then 
        
        $4 = $4 - 'l0_name';
        
        end if;
    
        _where_and_clause :=  global.form_where_clause('varchar', $4::jsonb);
        raise notice '%', _where_and_clause;
        if _where_and_clause::text =''  then 
            _where:= 'where 1=1'; 
        else
            _where:= 'where status_obj is not null or type_obj is not null';
        end if;
        
        
        _query_combine :=
                'select product_code, product_name, attributes->>''aggregation_code'' as aggregation_code from (select
                       X.product_code,
                       X.product_name,
                       X.replacement_product_codes as replacement_product_codes, 
                       X.reference_product_codes as reference_product_codes,
                       json_build_object(' || array_to_string(_product_attribute_json_build_column_for_filter, ' ,') ||') as attributes,
                       X.status_obj as status_obj,
                       X.product_description,
                       X.updated_by,
                    X.change_time   
                    FROM (
                select
                    pm.*,
                    pta_u.status_obj as status_obj,
                    pta_u.updated_by,
                    pta_u.change_time
                from (
                    select
                        main.product_name,
                        main.product_description,
                        main.replacement_product_codes as replacement_product_codes,
                        main.reference_product_codes as reference_product_codes,
                        attributes.*
                    from
                        (' || _query_pm || ') main
                    join (' || _query_pa || ') attributes on
                        main.product_code = attributes.product_code) pm
                left join (
                    with cte1 as (select json_agg(jsonb_build_object(''status_start_time'', concat(start_time)::varchar, ''status_end_time'', concat(end_time)::varchar, ''status'', attribute_value , ''time_attr_id'', product_time_attr_id) ORDER BY start_time) status_obj, product_code, max(um.name) as updated_by, max(pg_xact_commit_timestamp(pta.xmin)) as change_time from 
                        "global".product_time_attributes pta left join "global".user_master um on pta.updated_by = um.user_code ' || _where_and_clause || '
                        group by product_code)                    
                select cte1.product_code, status_obj, updated_by, change_time from cte1) pta_u
                on pm.product_code = pta_u.product_code
                ) X ' || _query_table_filters || ') temp';
            raise notice '%', _query_combine;
            return query execute _query_combine;
 	end
 	$function$
;
