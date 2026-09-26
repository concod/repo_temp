--liquibase formatted sql
--changeset liquibase:allocation_scheduler_rule_update runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:MTP-58940_1
--comment: MTP-58940_1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.allocation_scheduler_rule(refcursor, jsonb, jsonb, int4, text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.allocation_scheduler_rule(input refcursor, jsonb, jsonb, integer, text, jsonb, jsonb)
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
    '',
    '{
        "search": [],
        "sort": [],
        "range": [],
        "limit": {
            "page": 1,
            "limit": 10
        }
    }');
fetch all in "my_cur";
  Updated_by       Updated_on      Purpose
   ----------       -----------     --------
 
 
 */
	declare
	_query_ph text := '';
	_query_sa text := '';
	_query_ppa text := '';
	_channel text[] := inventory_smart.get_channel_from_input_new($3);
	_channel_and_postfix_condition text := '';
	_channel_pcm_where_condition text := '';
	_channel_and_prefix_condition text := '';
	_client_columns text;
	_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
	_application_code int4 := $4;
	_query_table_filters text := '';
	_query_table_sort text :='';
	_query_combine text := '';
	_l0_name_updated text := '';
	begin
		_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
 		_query_sa := global.form_main_table_filters('store_attributes', $3);
 		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into _l0_name_updated;
-- 		raise notice '%,',replace (_channel,',','');
 		
 		if length ($5)> 0 then
			_client_columns := ','||$5;
		else 
			_client_columns := '';
		end if;
	
-- 		raise notice '_query_ppa %,',_query_ppa;
		if cardinality(_channel) = 0 then
 			raise notice 'no channel passs %,',_channel;
 			_channel_and_postfix_condition = ' ';
 			_channel_pcm_where_condition = ' ';
 			_channel_and_prefix_condition = ' ';
 		else
 			_channel_and_postfix_condition = ' channel in (''' || array_to_string(_channel, ''',''', '') || ''') and ';
 			_channel_pcm_where_condition = ' where pcm.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
 			_channel_and_prefix_condition = ' and ph.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
 		end if;
 		
 	
 		_query_table_filters := global.form_table_query($6);
 		select replace(_query_table_filters, 'WHERE', 'AND') into _query_table_filters;
		_query_table_sort := global.form_table_query($6 -'limit' -'search' - 'range');
 		_query_combine := '
			with ph_data as materialized (
				select 
					article
				from
				inventory_smart.ph_master ph ' || _query_ph || _channel_and_prefix_condition || '
					' || _query_table_filters ||'
				)
				-- select * from ph_data
				,
					base as materialized
				(select
				*
			from
				inventory_smart.ph_scheduler_store_mapping
			where
				' ||_channel_and_postfix_condition|| '
				l0_name = '||_l0_name_updated||' and 
				 article in (select article from ph_data)
				),
				base2 as (
				select distinct b.article,b.store_code,b.channel,
				case when psm.is_active and not b.is_active then  psm.scheduler_code
				when not psm.is_active and b.is_active then b.scheduler_code
				when psm.is_active and b.is_active then b.scheduler_code
				when not psm.is_active and  not b.is_active then 0
				else -1
				end as rule_code
				from base b
				left join
				inventory_smart.ph_scheduler_mapping psm on psm.article = b.article and psm.channel=b.channel 
				)
				select b2.article,saf.retail_facility_code store_code,arm.rule_name,arm.rule_definitions,paarm.approval_type,paarm.threshold from base2 b2
				left join inventory_smart.alloc_rule_master arm  using(rule_code)
				left join inventory_smart.ph_auto_alloc_rule_mapping paarm using(article,channel)
				left join "global".store_attributes_filter saf using(store_code)
				where arm.is_active = true	
				
			'|| _query_table_sort ||'';
		raise notice 'Query: %', _query_combine;
		open $1 for execute _query_combine;
		RETURN $1;
	end
$function$
;

