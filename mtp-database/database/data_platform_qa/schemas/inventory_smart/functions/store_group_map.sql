--liquibase formatted sql
--changeset liquibase:store_group_map runOnChange:true stripComments:false splitStatements:false context:MTP-30974 labels:liquibase_project_start
--comment: initial changeset for store_group_map - MTP-30974
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_group_map(input integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.store_group_map(input integer, jsonb)
 RETURNS TABLE(sg_code integer, name varchar, stores character varying[])
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

	begin
		_channel_filter := inventory_smart.get_channel_str_from_input($2);
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
			array_agg(distinct sm.store_code) as stores
		from
			global.store_groups sg
		join global.store_groups_mapping sgm 
		on
			sg.sg_code = sgm.sg_code
		join global.store_master sm 
		on
			sgm.store_code = sm.store_code
		where
			sg.is_deleted = false
			 '|| _channel_filter ||'
			' || _application_code ||'
			and active
		group by
			1, 2';
	
		
		
		raise notice '%',  _query_combine;
		RETURN QUERY execute _query_combine;
	end
$function$
;
