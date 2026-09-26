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
    _manufacturer_ids integer[] DEFAULT ARRAY[]::integer[],
    _merchandiser_ids integer[] DEFAULT ARRAY[]::integer[],
    _brand_ids integer[] DEFAULT ARRAY[]::integer[],
    _vendor_ids integer[] DEFAULT ARRAY[]::integer[],
    _price_bucket_ids integer[] DEFAULT ARRAY[]::integer[],
    _size_bucket_ids integer[] DEFAULT ARRAY[]::integer[],
    _uom_ids integer[] DEFAULT ARRAY[]::integer[]
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

    if array_length(_manufacturer_ids, 1) > 0 then
        pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.manufacturer_cid in (%1$s) ', array_to_string(_manufacturer_ids, ',')));
    end if;

    if array_length(_merchandiser_ids, 1) > 0 then
        pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.merchandiser_cid in (%1$s) ', array_to_string(_merchandiser_ids, ',')));
    end if;

    if array_length(_brand_ids, 1) > 0 then
        pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.brand_cid in (%1$s) ', array_to_string(_brand_ids, ',')));
    end if;

    if array_length(_vendor_ids, 1) > 0 then
        pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.vendor_cid in (%1$s) ', array_to_string(_vendor_ids, ',')));
    end if;

    if array_length(_price_bucket_ids, 1) > 0 then
        pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.price_bucket_cid in (%1$s) ', array_to_string(_price_bucket_ids, ',')));
    end if;

    if array_length(_size_bucket_ids, 1) > 0 then
        pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.size_bucket_cid in (%1$s) ', array_to_string(_size_bucket_ids, ',')));
    end if;

    if array_length(_uom_ids, 1) > 0 then
        pg_hierarchy_where = array_append(pg_hierarchy_where, format(' and pm.uom_cid in (%1$s) ', array_to_string(_uom_ids, ',')));
    end if;

	if array_length(pg_hierarchy_where, 1) > 0 then
		products_query = format(
            '
            SELECT 
                array_agg(DISTINCT pm.product_id)
            FROM 
                price_promo.product_master pm
            WHERE 
                pm.is_active = 1
                %1$s
            ',
            array_to_string(pg_hierarchy_where, ' ')
        );
		execute products_query into product_ids;
	end if;
	return product_ids;
end;
$function$
;
