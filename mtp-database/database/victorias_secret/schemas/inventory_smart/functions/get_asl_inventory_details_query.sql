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
        _sda_source text;
        _reserve_join text;
        _allocated_join_condition text;
        _where_clause text;
        _reserve_and_net_fields text;
        _bsda_additional_column text;
        _bsda_group_by_additional text;
        _sda_columns text;
        _join_column text;
        _allocated_units_source text;

    BEGIN
        -- Set parameters based on allocation type
        CASE p_alloc_type
            WHEN 'asn' THEN
                _sda_source := 'inventory_smart.sku_asn_available_units';
                _reserve_join := '';
                _allocated_join_condition := 'sdal.dc_code::integer = sda.asn_code::integer';
                _where_clause := '';
                _reserve_and_net_fields := '0 as total_reserve,
                (sda.oh -coalesce(sdal.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory,
                (sda.oh -coalesce(sdal.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oh,';
                _bsda_additional_column := 'asn_code,';
                _bsda_group_by_additional := '1, 2, 3, 4, 5';
                _sda_columns := 'asn_code,
                sum(coalesce(oh, 0)) as oh, 0 as oo, 0 as it';
                _join_column := 'asn_code';
                _allocated_units_source := 'inventory_smart.sku_asn_allocated_units('''', ''%7$s'')';
            ELSE
                _sda_source := 'inventory_smart.sku_dc_available_units';
                _reserve_join := 'left join(
                    SELECT 
                        product_code, 
                        dc_code, 
                        size, 
                        article,
                        sum(quantity) AS quantity
                    from inventory_smart.sku_dc_reserved_units(''%7$s'') 
                    group by 1, 2, 3, 4
                )sku_reserv using (product_code, dc_code, size, article)';
                _allocated_join_condition := 'sdal.dc_code = sda.dc_code';
                _where_clause := 'where (sda.oh - coalesce(sku_reserv.quantity, 0) - coalesce(sdal.quantity, 0)) > 0';
                _reserve_and_net_fields := 'coalesce(sku_reserv.quantity, 0 ) as total_reserve,
                (sda.oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory,
                (sda.oh -coalesce(sku_reserv.quantity, 0 ) - coalesce(sdal.quantity, 0)) as net_available_inventory_oh,';
                _bsda_additional_column := '';
                _bsda_group_by_additional := '1, 2, 3, 4';
                _sda_columns := 'dc_code,
                sum(coalesce(oh, 0)) as oh, sum(coalesce(oo, 0)) as oo, sum(coalesce(it, 0)) as it';
                _join_column := 'dc_code';
                _allocated_units_source := 'inventory_smart.sku_dc_allocated_units('''', ''%7$s'')';
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
                %1$s
                coalesce(sdal.quantity, 0) as allocated_units,
                coalesce(sdal.allocated_time, ladt.allocated_time, null) as allocated_time
                from product_dc_map_after_store_eligible ph
            join (
                select 
                    product_code, 
                    size, 
                    article,
                    %4$s
                from %5$s 
                group by 1, 2, 3, 4
            ) sda using (product_code, %6$s, article, size)
            %7$s
            left join (
                select 
                    article, 
                    dc_code, 
                    size,
                    max(updated_at) as allocated_time,
                    coalesce(sum(quantity), 0) as quantity
                from %8$s
                group by 1, 2, 3
            ) sdal on sdal.article = sda.article and %9$s and sdal.size = sda.size
            left join(
                select 
                    article,
                    max(last_allocation_date) as allocated_time
                    from inventory_smart.last_allocation_date_table ladt
                    group by 1
                ) ladt
            on ladt.article = sda.article
            %10$s
        )',
        _reserve_and_net_fields,
        _bsda_additional_column,
        _bsda_group_by_additional,
        _sda_columns,
        _sda_source,
        _join_column,
        _reserve_join,
        _allocated_units_source,
        _allocated_join_condition,
        _where_clause
        );

        RETURN _inventory_details_query;

    END
 $function$
; 