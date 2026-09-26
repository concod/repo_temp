--liquibase formatted sql
--changeset shashwat.yadav:supply_route_list runOnChange:true stripComments:false splitStatements:false context:MTP-72821 labels:MTP-72821
--comment: MTP-72821 List all networks with their details including user_name

DROP FUNCTION IF EXISTS inventory_smart.supply_route_list(refcursor, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.supply_route_list(input refcursor, _network_id integer, meta_filters jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_meta_filters text;
_query_part text;
_query_all text;
BEGIN
    _query_meta_filters := inventory_smart.form_table_query($3); 
	raise notice '_query_meta_filters: %', _query_meta_filters;
    _query_part := '
				SELECT * FROM (
					SELECT
				        sn.network_id,
				        sn.network_name,
				        sn.updated_at::varchar,
						sn.created_at::varchar,
				        um_created.user_name AS created_by,
				        um_updated.user_name AS updated_by,
				        (sn.network_id = ' || quote_literal(_network_id) || ') AS is_selected
				    FROM 
				        inventory_smart.supply_network sn
				    LEFT JOIN 
				        global.user_master um_created ON sn.created_by = um_created.user_code
				    LEFT JOIN 
				        global.user_master um_updated ON sn.updated_by = um_updated.user_code
					ORDER BY is_selected desc, is_default desc, network_id desc
				) x';
	_query_all = _query_part || ' ' || _query_meta_filters;
	raise notice '_query_all %', _query_all;
    OPEN $1 FOR execute _query_all;  
	RETURN $1;
END;
$function$
;