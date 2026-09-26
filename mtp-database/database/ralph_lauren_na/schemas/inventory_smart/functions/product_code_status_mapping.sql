--liquibase formatted sql
--changeset liquibase:product_code_status_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-46879
--comment: MTP-46879
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_code_status_mapping(text);
CREATE OR REPLACE FUNCTION inventory_smart.product_code_status_mapping(text)
	RETURNS void
	LANGUAGE plpgsql
AS $function$
	declare 
		_channel_name text;
		_channel text;
		_l0_name text;
		_l0_name_updated text;
		_query_combine text;
		_created_at_start_date timestamptz;
		_created_at_end_date timestamptz;

	begin
		select attribute_value from inventory_smart.plan_attributes where plan_code = ''||$1||'' and attribute_name = 'channel' into _channel;
		select attribute_value from inventory_smart.plan_attributes where plan_code = ''||$1||'' and attribute_name = 'l0_name' into _l0_name;
		
		select 'any('''|| concat(_channel) ||'''::varchar[])' into _channel_name;
		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into _l0_name_updated;
		select (created_at::date)::timestamp from inventory_smart.plan_master pm WHERE plan_code = ''||$1||'' into _created_at_start_date;
		select (created_at::date)::timestamp + interval '23 hours 59 minutes' from inventory_smart.plan_master pm WHERE plan_code = ''||$1||'' into _created_at_end_date;

		raise notice 'channel %', _channel_name;
		raise notice '_l0_name_updated %', _l0_name_updated;
		_query_combine := '
			with product_code_status as(
				select distinct 
					product_code,
					case 
						when article_status_tag in (''New'', ''Newly Launched'', ''FLoorset'') then ''Newness''
					else ''Replenishment''
					end as article_status_tag
				from global.product_attributes_filter paf
				join inventory_smart.create_allocation_result_flat_gurobi carfg on carfg.retail_size_cd = paf."size" and carfg.article = paf.article 
				join inventory_smart.article_status_tag ast using(product_code)
				where carfg.allocation_code = '''||$1||''' and (carfg.created_at between '''|| _created_at_start_date||''' and '''|| _created_at_end_date||''') and l0_name = '||_l0_name_updated||' and ast.channel = '||_channel_name||' 
			),
			json_formatted_data as (
				select jsonb_agg(jsonb_build_object(
        			''product_code'', product_code,
 					''status_tag'', article_status_tag
    				)) AS product_code_status_data
			from product_code_status
			)
			insert into inventory_smart.plan_attributes(plan_code, attribute_name, attribute_value)
			select '''||$1||''', ''product_status_mapping'', product_code_status_data from json_formatted_data
			on conflict do nothing;
		';
		
	raise notice '%', _query_combine;
	execute _query_combine;

	END;
$function$
;