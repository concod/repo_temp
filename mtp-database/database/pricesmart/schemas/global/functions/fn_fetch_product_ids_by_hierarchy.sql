--liquibase formatted sql
--changeset liquibase:fn_fetch_product_ids_by_hierarchy2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: function_change_2 fn_fetch_product_ids_by_hierarchy_2
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_fetch_product_ids_by_hierarchy;
CREATE OR REPLACE FUNCTION global.fn_fetch_product_ids_by_hierarchy(_l0_ids integer[] DEFAULT ARRAY[]::integer[], _l1_ids integer[] DEFAULT ARRAY[]::integer[], _l2_ids integer[] DEFAULT ARRAY[]::integer[], _l3_ids integer[] DEFAULT ARRAY[]::integer[], _l4_ids integer[] DEFAULT ARRAY[]::integer[], _brand_ids integer[] DEFAULT ARRAY[]::integer[], _lifecycle_indicator integer[] DEFAULT ARRAY[]::integer[])
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
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.l4_cid in (%1$s) ', array_to_string(_l4_ids, ',')));
	end if;
	if array_length(_brand_ids, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.brand_cid in (%1$s) ', array_to_string(_brand_ids, ',')));
	end if;
	if array_length(_lifecycle_indicator, 1) > 0 then 
		pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and plm.lifecycle_indicator_ids && array[%1$s]', array_to_string(_lifecycle_indicator, ',')));
	end if;


	if array_length(pg_hierarchy_where, 1) > 0 then
		products_query = format('
										with lifecycle_agg AS (
										    SELECT 
										        product_id, 
										        array_agg(lifecycle_indicator_id) AS lifecycle_indicator_ids 
										    FROM 
										        global.tb_parent_lifecycle_mapping 
										    GROUP BY 
										        product_id
										)
										SELECT 
										    array_agg(DISTINCT pm.product_id)
										FROM 
										    price_promo.product_master pm
										JOIN 
										    lifecycle_agg plm 
										    ON pm.product_id = plm.product_id
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
