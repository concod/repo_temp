--liquibase formatted sql
--changeset satvik.sharma:lovisa_get_asl_inventory_details_query runOnChange:true stripComments:false splitStatements:false context:MTP-130085 labels:MTP-130085
--comment: Lovisa specific inventory details query builder
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_inventory_details_query(text);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_inventory_details_query(p_alloc_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _inventory_details_query text;
    BEGIN
        _inventory_details_query := ',inventory_details_product_dc_level as (
            select
                ph.product_code,
                ph.ph_code,
                ph.dc_code,
                ph.size,
                sda.oh as oh,
                sda.oo as oo,
                sda.it as it,
                coalesce(sku_reserv.quantity, 0 ) as total_reserve,
                coalesce(sdal.quantity, 0) as allocated_units,
                (oh - coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory,
                (oh - coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oh,
                coalesce(sdal.allocated_time, ladt.allocated_time, null) as allocated_time
                from product_dc_map_after_store_eligible ph
            join
                (
                    select product_code, dc_code, size, article,
                    sum(coalesce(oh, 0)) as oh,
                    sum(coalesce(oo, 0)) as oo,
                    sum(coalesce(it, 0)) as it
                    from
                    inventory_smart.sku_dc_available_units
                    group by 1, 2, 3, 4
                ) sda
            using (product_code, dc_code, article, size)
            left join
                inventory_smart.sku_dc_reserved_units sku_reserv
            on sku_reserv.product_code = ph.product_code and sku_reserv.article = ph.article and sku_reserv.dc_code = ph.dc_code
            left join
                (
                    select article, dc_code, size,
                    max(updated_at) as allocated_time,
                    coalesce(sum(quantity), 0) as quantity
                    from inventory_smart.sku_dc_allocated_units('''', ''%7$s'')
                    group by 1,2, 3
                ) sdal
            on sdal.article = sda.article and sdal.dc_code = sda.dc_code and sdal.size = sda.size
            left join
                (
                    select article,
                    max(last_allocation_date) as allocated_time
                    from inventory_smart.last_allocation_date_table ladt
                    group by 1
                ) ladt
            on ladt.article = sda.article
        )';

        RETURN _inventory_details_query;

    END
$function$
;
