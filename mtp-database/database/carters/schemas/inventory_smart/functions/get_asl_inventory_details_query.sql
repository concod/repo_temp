--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-95638 labels:MTP-95638
--comment: MTP-95638
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_inventory_details_query(text);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_inventory_details_query(
    p_alloc_type text
) 
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _inventory_details_query text;
        _available_units_table text;
        _available_units_filter text;
        _quantity_calculation text;
        _allocated_units_source text;
        _allocated_join_condition text;
        _reserve_join text;
        _total_calculation_field text;
        _additional_columns text;
        _group_by_clause text;
        _where_clause text;

    BEGIN
        -- Set parameters based on allocation type
        CASE p_alloc_type
            WHEN 'po' THEN
                _available_units_table := 'inventory_smart.sku_po_available_units';
                _available_units_filter := '%9$s';
                _quantity_calculation := 'sum(coalesce(oh, 0)) as oh, 0 as oo, 0 as it';
                _allocated_units_source := 'inventory_smart.sku_po_allocated_units('''', ''%7$s'')';
                _allocated_join_condition := 'sdal.dc_code::varchar = sda.po_code::varchar';
                _reserve_join := '';
                _total_calculation_field := '0 as total_reserve,
                                        (oh - coalesce(sdal.quantity, 0)) as net_available_inventory,
                                        (oh - coalesce(sdal.quantity, 0)) as net_available_inventory_oh,';
                _additional_columns := 'po_code,';
                _group_by_clause := '1,2,3,4,5';
                _where_clause := '';
            WHEN 'ns' THEN
                _available_units_table := 'inventory_smart.sku_ns_available_units';
                _available_units_filter := '';
                _quantity_calculation := 'sum(coalesce(oh_packs + oh_eaches, 0)) as oh, 0 as oo, 0 as it';
                _allocated_units_source := 'inventory_smart.sku_ns_allocated_units';
                _allocated_join_condition := 'sdal.dc_code = sda.dc_code';
                _reserve_join := 'left join (
                        select 
                            product_code, 
                            dc_code, 
                            size, 
                            article,
                            sum(coalesce(quantity, 0)) as quantity
                        from inventory_smart.sku_dc_reserved_units sku_reserv
                        group by 1,2,3,4
                    ) sku_reserv
                    using (product_code, dc_code, size, article)';
                _total_calculation_field := 'coalesce(sku_reserv.quantity, 0 ) as total_reserve,
                                        (oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory,
                                        (oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oh,';
                _additional_columns := '';
                _group_by_clause := '1,2,3,4';
                _where_clause := '';
            ELSE
                _available_units_table := 'inventory_smart.sku_dc_available_units';
                _available_units_filter := '';
                _quantity_calculation := 'sum(coalesce(oh, 0)) as oh, sum(coalesce(oo, 0)) as oo, sum(coalesce(it, 0)) as it';
                _allocated_units_source := 'inventory_smart.sku_dc_allocated_units('''', ''%7$s'')';
                _allocated_join_condition := 'sdal.dc_code = sda.dc_code';
                _reserve_join := 'left join (
                        select 
                            product_code, 
                            dc_code, 
                            size, 
                            article,
                            sum(coalesce(quantity, 0)) as quantity
                        from inventory_smart.sku_dc_reserved_units sku_reserv
                        group by 1,2,3,4
                    ) sku_reserv using (product_code, dc_code, size, article)';
                _total_calculation_field := 'coalesce(sku_reserv.quantity, 0 ) as total_reserve,
                                        (oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory,
                                        (oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oh,';
                _additional_columns := '';
                _group_by_clause := '1,2,3,4';
                _where_clause := 'where (oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) > 0';
        END CASE;

        -- Single query template with parameters
        _inventory_details_query := format(',inventory_details_product_dc_level as (
            select
                ph.product_code,
                ph.ph_code,
                ph.dc_code,
                ph.size,
                sda.oh as oh,
                sda.oo as oo,
                sda.it as it,
                coalesce(sdal.quantity, 0) as allocated_units,
                0 as begining_oh,
                %1$s
                coalesce(sdal.allocated_time, ladt.allocated_time, null) as allocated_time
                from product_dc_map_after_store_eligible ph
            join (
                select 
                    product_code,
                    %2$s
                    dc_code, 
                    size, 
                    article,
                    %3$s
                from %4$s
                %5$s
                group by %6$s
            ) sda
            using (product_code, dc_code, article, size)
            %7$s
            left join (
                select 
                    article, 
                    dc_code, 
                    size,
                    max(updated_at) as allocated_time,
                    coalesce(sum(quantity), 0) as quantity
                from %8$s sdau
                group by 1,2, 3
            ) sdal
            on sdal.article = sda.article and %9$s and sdal.size = sda.size
            left join (
                select 
                    article,
                    max(last_allocation_date) as allocated_time
                from inventory_smart.last_allocation_date_table ladt
                group by 1
            ) ladt
            on ladt.article = sda.article
            %10$s
        )',
        _total_calculation_field,
        _additional_columns,
        _quantity_calculation,
        _available_units_table,
        _available_units_filter,
        _group_by_clause,
        _reserve_join,
        _allocated_units_source,
        _allocated_join_condition,
        _where_clause
        );

        RETURN _inventory_details_query;

    END
 $function$
;