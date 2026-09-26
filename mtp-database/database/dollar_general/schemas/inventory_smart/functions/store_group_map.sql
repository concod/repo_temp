--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:store_group_map runOnChange:true stripComments:false splitStatements:false context:MTP-41069 labels:MTP-41069-Filter
--comment: Filters in 'Store Group Map' in Strategy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_group_map(input integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.store_group_map(input integer, jsonb)
 RETURNS TABLE(sg_code integer, name character varying, stores character varying[])
 LANGUAGE plpgsql
AS $function$
/* generic
select
	*
from
	inventory_smart.store_group_map(1,
	'{"channel": [{"type":"list", "operator":"in", "values": ["ZALES"]}]}'::jsonb);
	
	$1 -> app code
	$2 -> filter - channel
 */
#variable_conflict use_column
	declare
	_channel text := inventory_smart.get_channel_from_input($2);
	-- _channel_filter text := replace (_channel,',','');
	_channel_filter text := 'true';
	_query_combine text := '';
	_application_code text := $1::text;
 	_product_filters jsonb := $2 ;
 	_query_pa text := '';

	begin
		_channel_filter := inventory_smart.get_channel_str_from_input($2);
		_query_pa := inventory_smart.form_main_table_filters(
            'product_store_attributes_filter',
            _product_filters
            );
           
        raise notice '_query_pa filter : %', _query_pa;
		-- both filters made optional
		if (_channel_filter = '') IS FALSE
        then
                _channel_filter := ' and channel in  '||_channel_filter||' ' ;
        end if;   
		--raise notice '__channel filter : %', _channel_filter;
	
       	if (_application_code = '') IS FALSE
        then
                _application_code := ' and sg.application_code =  '||_application_code||' ' ;
        end if;
       
		_query_combine := 'select
			sg.sg_code,
			sg.name,
			array_agg(distinct psaf.store_code) as stores
		from
			global.store_groups sg
		join global.aggregated_store_groups_mapping asgm 
		on
			sg.sg_code = asgm.sg_code
		join global.product_store_attributes_filter psaf 
		on
			asgm.psa_code = psaf.psa_code
		' || _query_pa ||'
			 '|| _channel_filter ||'
			' || _application_code ||'
			and sg.is_deleted = false	
		group by
			1, 2';
	
				
		raise notice '%',  _query_combine;
		RETURN QUERY execute _query_combine;
	end
$function$
;