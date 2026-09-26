--liquibase formatted sql
--changeset shashwat.yadav:generate_rcl_network runOnChange:true stripComments:false splitStatements:false context:MTP-43502 labels:MTP-74818
--comment: RCL sp generate_rcl_network for resolving rcl network
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.generate_rcl_network(_inputs text, _module_code integer, _date date, _hide_non_match boolean);
CREATE OR REPLACE FUNCTION inventory_smart.generate_rcl_network(_inputs text, _module_code integer, _date date, _hide_non_match boolean DEFAULT true)
 RETURNS TABLE(choice text, rule_code integer, rcl_code integer, network_id integer, route_id integer, route_type_id integer, supply_route_name text, source_node_id integer, source_type character varying, source_name character varying, source_code character varying, destination_node_id integer, destination_type character varying, destination_name character varying, destination_code character varying, shipping_mode character varying, is_terminal boolean, is_primary boolean, lead_time integer, priority integer)
 LANGUAGE plpgsql
AS $function$ 
#variable_conflict use_column 
declare 
    _rcl_code integer;
    _rcl_codes integer[];
    _hash_query text;
    _hash_cols text;
    _rcl_last_modified timestamp;
    _query_combine text;
    _query_pa text;
    _query_parts text[] := '{}'::text[];
    _input_query text;
    _input_table_id varchar;
    _input_table_ids varchar[] := '{}'::varchar[];
    _input_cols varchar;
    _loop_counter int := 0;
    _remaining_inputs int := 99999999;
    _filter_con text := case when _hide_non_match then ' WHERE rcl_code is not null' else '' end;
begin
------ Get rcls ------
    select
        array_agg(rcl_code order by priority asc),
        -- string_agg(global.get_rcl_hash_query(rcl_code, level), ', '),
        string_agg('rcl_hash->>' || quote_literal(rcl_code) || ' as rcl_hash_' || rcl_code, ', '),
        string_agg('x.rcl_hash_' || rcl_code, ', '),
        max(greatest(updated_at, created_at)) into _rcl_codes, _hash_query, _hash_cols, _rcl_last_modified
    from global.rcl_master where
        not is_deleted
        and module_code = _module_code
        and validity @> _date
    group by is_deleted;
    raise notice '_rcl_codes:%, _hash_query:%', _rcl_codes, _hash_query;
------ Get Inputs ------ Must be Async Query because of commit for next call
    _input_query := 'select
		article::text as article,
        null::integer as rcl_code,
        null::integer as supply_network,
        null::integer as route_id,
        null::integer as route_type_id,
        null::text as supply_route_name,
        null::integer as source_node_id,
        null::varchar as source_type,
        null::varchar as source_name,
		null::varchar as source_code,
        null::integer as destination_node_id,
        null::varchar as destination_type,
		null::varchar as destination_code,
        null::varchar as destination_name,
        null::varchar as shipping_mode,
        null::boolean as is_terminal,
        null::boolean as is_primary,
        null::integer as lead_time,
        null::integer as priority,
        ' || _hash_query || '
    from
        ' || _inputs || ' x join global.product_attributes_filter y using(article)';
     _input_cols :=  _hash_cols;
raise notice '_input_query: %', _input_query;

---- Loop rcls ------
    foreach _rcl_code in array _rcl_codes loop
        if array_length(_input_table_ids, 1) > 0 then
            execute 'SELECT COUNT(1) FROM "' || _input_table_id || '" WHERE rcl_code is null' into _remaining_inputs;
            _input_query := format($$
                select 
                  * 
                from 
                  "%1$s" 
                where 
                  rcl_code is null $$, _input_table_id);
        end if;
        if _remaining_inputs > 0 then
            _query_combine := format( $$ 
                with inp as materialized (
                    %3$s
                ),
			inp_rule as (
                    select
						%2$s,
						x.article,
						y.rcl_code as rcl_code, 
						y.rule_code as rule_code, 
						y.supply_network as network_id, 
						coalesce(y.route_id, x.route_id) as route_id,
						coalesce(x.route_type_id, y.route_type_id) as route_type_id,
						coalesce(y.supply_route_name, x.supply_route_name) as supply_route_name,
						coalesce(y.source_node_id, x.source_node_id) as source_node_id,
						coalesce(y.source_type, x.source_type) as source_type,
						coalesce(y.source_name, x.source_name) as source_name,
						coalesce(y.source_code, x.source_code) as source_code,
						coalesce(y.destination_node_id, x.destination_node_id) as destination_node_id,
						coalesce(y.destination_type, x.destination_type) as destination_type,
						coalesce(y.destination_name, x.destination_name) as destination_name,
						coalesce(y.destination_code, x.destination_code) as destination_code,
						coalesce(y.shipping_mode, x.shipping_mode) as shipping_mode,
						coalesce(y.is_terminal, x.is_terminal) as is_terminal,
						coalesce(y.is_primary, x.is_primary) as is_primary,
						coalesce(y.lead_time, x.lead_time) as lead_time,
						coalesce(y.priority, x.priority) as priority 
                    from inp x 
                    left join (
                        select 
                            rcl_code,
                            rule_code,
                            supply_network,
                            md5(rcl_dimension::text) as rcl_dimension,
                            sr.route_id as route_id,
	                        sr.route_type_id as route_type_id,
	                        srd.supply_route_name as supply_route_name,
	                        sr.source_node_id as source_node_id,
							coalesce(ssaf.store_category, src.type) as source_type,
	                        src.name as source_name,
							src.code as source_code,
	                        sr.destination_node_id as destination_node_id,
	                        coalesce(dsaf.store_category, dst.type) as destination_type,
	                        dst.name as destination_name,
							dst.code as destination_code,
	                        sr.shipping_mode as shipping_mode,
	                        sr.is_terminal_node as is_terminal,
	                        sr.is_primary as is_primary,
	                        sr.lead_time as lead_time,
	                        sr.priority as priority
                        from
                            inventory_smart.rcl_network_master rnm
                            join inventory_smart.rcl_network_rule rnr using(rcl_code, rule_code)
                            join inventory_smart.supply_route sr on rnm.supply_network = sr.network_id
	                        join inventory_smart.supply_route_definition srd on sr.route_type_id = srd.supply_route_id
	                        join inventory_smart.supply_node src on sr.source_node_id = src.supply_node_id
	                        join inventory_smart.supply_node dst on sr.destination_node_id = dst.supply_node_id
	                        left join global.store_attributes_filter ssaf on ssaf.store_code = src.code
							left join global.store_attributes_filter dsaf on dsaf.store_code = dst.code
                        where
							rcl_code = %1$s
							and validity @> '%4$s'::date
                    ) y on x.rcl_hash_%1$s = y.rcl_dimension
                )
        select *
                from
                    inp_rule $$, _rcl_code, _input_cols, _input_query, _date);
                raise notice '_query_combine: %', _query_combine;       
_input_table_id := gen_random_uuid()::varchar;
execute 'create table "' || _input_table_id || '"  as ' || _query_combine;
			execute 'analyse "' || _input_table_id || '"';
            _input_table_ids := array_append(_input_table_ids, _input_table_id);
        end if;
    end loop;
------ Build final query ------
    foreach _input_table_id in array _input_table_ids loop
        _loop_counter := _loop_counter + 1;
        if _loop_counter = array_length(_input_table_ids, 1) then
            _query_parts := array_append(_query_parts, 'SELECT article as choice,rule_code,rcl_code,network_id,route_id,route_type_id,supply_route_name,source_node_id,source_type,source_name,source_code,destination_node_id,destination_type,destination_name,destination_code,shipping_mode,is_terminal,is_primary,lead_time,priority FROM "' || _input_table_id || '"');
        else
            _query_parts := array_append(_query_parts, 'SELECT article as choice,rule_code,rcl_code,network_id,route_id,route_type_id,supply_route_name,source_node_id,source_type,source_name,source_code,destination_node_id,destination_type,destination_name,destination_code,shipping_mode,is_terminal,is_primary,lead_time,priority FROM "' || _input_table_id || '" WHERE rcl_code is not null');
        end if; 
    end loop; 
    raise notice '_query_parts: %', _query_parts;
    select string_agg(q, ' UNION ALL ') into _query_combine from unnest(_query_parts) as q;
    if _hide_non_match then
        _query_combine := 'select * from (' || _query_combine || ') X where rcl_code is not null';
    end if;
    raise notice '_query_combine: %', _query_combine;
    return query execute _query_combine;
end
$function$
;