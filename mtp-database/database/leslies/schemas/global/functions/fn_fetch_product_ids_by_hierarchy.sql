--liquibase formatted sql
--changeset liquibase:fn_fetch_product_ids_by_hierarchy2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: function_change_2 fn_fetch_product_ids_by_hierarchy_2
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_fetch_product_ids_by_hierarchy;
CREATE OR REPLACE FUNCTION global.fn_fetch_product_ids_by_hierarchy(
	_l0_ids integer[] DEFAULT ARRAY[]::integer[], 
	_l1_ids integer[] DEFAULT ARRAY[]::integer[], 
	_l2_ids integer[] DEFAULT ARRAY[]::integer[], 
	_l3_ids integer[] DEFAULT ARRAY[]::integer[], 
	_l4_ids integer[] DEFAULT ARRAY[]::integer[], 
	_manufacturer_ids integer[] DEFAULT ARRAY[]::integer[], 
	_product_status_ids integer[] DEFAULT ARRAY[]::integer[],
	_map_flag_ids integer[] DEFAULT ARRAY[]::integer[],
	_clearance_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvc_store_res_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvi_store_res_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvc_les_res_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvi_les_res_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvc_its_res_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvi_its_res_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvc_com_com_ids integer[] DEFAULT ARRAY[]::integer[],
	_kvi_com_com_ids integer[] DEFAULT ARRAY[]::integer[]
)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare
	pg_hierarchy_where text[];
	products_query text;
	product_ids integer[] := null::integer[];
begin
	if array_length(_l0_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.l0_cid in (%1$s) ', array_to_string(_l0_ids, ',')));
	end if;
	if array_length(_l1_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.l1_cid in (%1$s) ', array_to_string(_l1_ids, ',')));
	end if;
	if array_length(_l2_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.l2_cid in (%1$s) ', array_to_string(_l2_ids, ',')));
	end if;
	if array_length(_l3_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.l3_cid in (%1$s) ', array_to_string(_l3_ids, ',')));
	end if;
	if array_length(_l4_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.product_id in (%1$s) ', array_to_string(_l4_ids, ',')));
	end if;
	if array_length(_manufacturer_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.manufacturer_id in (%1$s) ', array_to_string(_manufacturer_ids, ',')));
	end if;
	if array_length(_product_status_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.product_status_cid in (%1$s) ', array_to_string(_product_status_ids, ',')));
	end if;
	if array_length(_map_flag_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.map_flag in (%1$s) ', array_to_string(_map_flag_ids, ',')));
	end if;
	if array_length(_clearance_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.clearance_cid in (%1$s) ', array_to_string(_clearance_ids, ',')));
	end if;
	if array_length(_kvc_store_res_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvc_store_res_id in (%1$s) ', array_to_string(_kvc_store_res_ids, ',')));
	end if;
	if array_length(_kvi_store_res_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvi_store_res_id in (%1$s) ', array_to_string(_kvi_store_res_ids, ',')));
	end if;
	if array_length(_kvc_les_res_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvc_les_res_id in (%1$s) ', array_to_string(_kvc_les_res_ids, ',')));
	end if;
	if array_length(_kvi_les_res_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvi_les_res_id in (%1$s) ', array_to_string(_kvi_les_res_ids, ',')));
	end if;
	if array_length(_kvc_its_res_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvc_its_res_id in (%1$s) ', array_to_string(_kvc_its_res_ids, ',')));
	end if;
	if array_length(_kvi_its_res_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvi_its_res_id in (%1$s) ', array_to_string(_kvi_its_res_ids, ',')));
	end if;
	if array_length(_kvc_com_com_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvc_com_com_id in (%1$s) ', array_to_string(_kvc_com_com_ids, ',')));
	end if;
	if array_length(_kvi_com_com_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.kvi_com_com_id in (%1$s) ', array_to_string(_kvi_com_com_ids, ',')));
	end if;
	

	if array_length(pg_hierarchy_where, 1) > 0 then
		products_query = format('
										SELECT 
										    array_agg(DISTINCT pm.product_id)
										FROM 
										    price_promo.product_master pm
										WHERE 
											pm.is_active = 1
											%1$s
										',array_to_string(pg_hierarchy_where, ' '));
		execute products_query into product_ids;
	end if;
	return product_ids;
end;
$function$
;
