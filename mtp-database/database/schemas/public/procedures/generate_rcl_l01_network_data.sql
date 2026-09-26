--liquibase formatted sql
--changeset linu.nazil:generate_rcl_l01_network_data runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: initial changeset for generate_rcl_l01_network_data
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.generate_rcl_l01_network_data(_version integer, _l0 text, _rcl_codes integer[]);

CREATE OR REPLACE PROCEDURE public.generate_rcl_l01_network_data
(
    IN _version integer,
    IN _l0 text,
    IN _rcl_codes integer[]
)
LANGUAGE 'plpgsql'
SECURITY DEFINER 
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.generate_rcl_l01_network_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _rcl_code int;
    _uuid text;
    _sql text;
    --_version integer;
    --_l0 text := 'USA';
    --_rcl_codes integer[] := '{131162,131091}'::int[];

begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    _uuid := md5(_l0);
    EXECUTE 'DROP TABLE IF EXISTS "network_rcl_' || _uuid || '" ';
    
    EXECUTE 'CREATE TEMP TABLE "network_rcl_' || _uuid || '" 
    (
        product_code text NOT NULL,
        l0_name varchar not null,
        rule_code integer,
        rcl_code integer,
        supply_network integer,
        route_id int4 not null,
        route_type_id int4,
        supply_route_name citext not null,
        source_node_id int4,
        source_type varchar,
        source_name varchar not null,
        source_code varchar not null,
        destination_node_id int4,
        destination_type varchar,
        destination_name varchar not null,
        destination_code varchar not null,
        shipping_mode citext not null,
        is_terminal bool not null,
        is_primary bool not null,
        lead_time int4 not null,
        priority int4 not null
    )
    on commit drop;';
    
    FOREACH _rcl_code in array _rcl_codes 
    loop
        _st := clock_timestamp();
        _sql :='
        INSERT INTO "network_rcl_' || _uuid || '" (
            product_code, l0_name, rule_code, rcl_code, supply_network,
            route_id, route_type_id, supply_route_name, source_node_id, source_type,
            source_name, source_code, destination_node_id, destination_type, destination_name,
            destination_code, shipping_mode, is_terminal, is_primary, lead_time, priority
        )
        SELECT  
            paf.product_code, ' || quote_literal(_l0) || ' AS l0_name,
            rdsp.rule_code AS rule_code,
            rdsp.rcl_code AS rcl_code, 
            rdsp.supply_network AS supply_network,
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
        FROM 
            global.product_attributes_filter paf
            INNER JOIN inventory_smart.rcl_network_rule rdspr ON paf.rcl_hash->>''' || _rcl_code || ''' = md5(rdspr.rcl_dimension::text)
            INNER JOIN inventory_smart.rcl_network_master rdsp USING(rule_code,rcl_code)
            JOIN inventory_smart.supply_route sr on rdsp.supply_network = sr.network_id
            JOIN inventory_smart.supply_route_definition srd on sr.route_type_id = srd.supply_route_id
            JOIN inventory_smart.supply_node src on sr.source_node_id = src.supply_node_id
            JOIN inventory_smart.supply_node dst on sr.destination_node_id = dst.supply_node_id
            LEFT JOIN global.store_attributes_filter ssaf on ssaf.store_code = src.code
            LEFT JOIN global.store_attributes_filter dsaf on dsaf.store_code = dst.code
        WHERE 
            paf.l0_name = ' || quote_literal(_l0) || '
            AND paf.active 
            AND NOT paf.is_deleted 
            AND rdspr.rcl_code = ' || _rcl_code || '
--          AND NOT rdsp.is_deleted
            AND rdsp.validity @> current_date 
            AND NOT EXISTS (
                SELECT 1 
                FROM "network_rcl_' || _uuid || '" dsp 
                WHERE paf.product_code = dsp.product_code
            ); ';
        EXECUTE _sql;
        raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;
    end loop;

    _st := clock_timestamp();
    
    _sql := 'INSERT INTO inventory_smart.rcl_network_' || _version || '_' || lower(regexp_replace(_l0, '\W+', '', 'g')) || ' (
        version_code, product_code, l0_name, rule_code, rcl_code, supply_network,
        route_id, route_type_id, supply_route_name, source_node_id, source_type, 
        source_name, source_code, destination_node_id, destination_type, 
        destination_name, destination_code, shipping_mode, is_terminal, 
        is_primary, lead_time, priority
    )
    SELECT 
        ' || _version || ' AS version_code, product_code, l0_name, rule_code, 
        rcl_code, supply_network, route_id, route_type_id, supply_route_name, 
        source_node_id, source_type, source_name, source_code, destination_node_id,
        destination_type, destination_name, destination_code, shipping_mode, 
        is_terminal, is_primary, lead_time, priority
    FROM "network_rcl_' || _uuid || '";';
    EXECUTE _sql;
    raise notice '_time: %, rcl_network_ _sql: %', (clock_timestamp() - _st), _sql;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;
