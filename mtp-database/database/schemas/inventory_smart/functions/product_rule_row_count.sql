--liquibase formatted sql
--changeset liquibase:product_rule_row_count runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_rule_row_count
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule_row_count(input refcursor, jsonb, jsonb, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule_row_count(input refcursor, jsonb, jsonb, integer, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 This is signet version
 Calling statement: 
 
 select
    *
from
    inventory_smart.product_rule('my_cur',
    '{
        "l0_name": [{"type": "list","operator": "in", "values": ["Accessories"]}],
        "l1_name": [],
        "l2_name": [],
       -- "l3_name": [],
       -- "l4_name": [],
        "article": [],
       -- "color": [],
        "article_status_tag": [],
        --"erp_gender": [],
        --"style": [],
       -- "style_group": [],
       -- "human_readable_color": []
    }',
    '{
        "channel": [{"type":"list", "operator":"in", "values": ["Factory Line Retail"]}]
    }',
    1,
    '{
        "search": [],
        "sort": [],
        "range": []
    }');

fetch all in "my_cur";


  Updated_by       Updated_on      Purpose
   ----------       -----------     --------


 
 
 */

	declare
	_query_ph text := '';
	_query_sa text := '';
	_channel text := inventory_smart.get_channel_from_input($3);
	_application_code int4 := $4;
	_query_table_filters text := '';
	_query_table_filters1 jsonb := (($5 - 'sort') - 'limit');
	_query_combine text := '';
	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'application_code', $4);
	_cache_table_id text;
	_cache_schema text := 'inventory_smart';
	_cache_sp text := '.product_rule_row_count';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{inventory_smart.ph_configuration_mapping, global.store_groups, global.store_groups_mapping, 
								inventory_smart.product_profile_master, global.distribution_centres, global.product_mapping,
                                global.product_mapping_product_store,
								inventory_smart.product_profile_attributes}';
	begin
		_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
 		
 		raise notice '%,',replace (_channel,',','');
 		
 		_query_table_filters := global.form_table_query(_query_table_filters1);
 		
 	    raise notice 'rrrrr%,',_query_table_filters;
 	
 	
 		_query_combine := '
			with ph_data as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master ' || _query_ph ||  
			     ' and channel = ''' ||replace (_channel,',','')||''' and article_status_tag in (''New'',''New In DC'')
			)
			select count(*) as row_count from ph_data' || _query_table_filters;
		
		raise notice 'Qeury: %', _query_combine;
--		select * from cache.wrap_sp(
--			_cache_schema,
--			_cache_sp,
--			_cache_payload,
--			_query_combine,
--			_cache_dependencies,
--			_cache_key_pattern) into _cache_table_id;
--		_query_table_filters := global.form_table_query($5);
--		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		open $1 for execute _query_combine;
--		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		RETURN $1;
	end
$function$
;
