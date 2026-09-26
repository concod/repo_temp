--liquibase formatted sql
--changeset chandrashekar.s:reporting_daily_allocation_product_list runOnChange:true stripComments:false splitStatements:false context:MTP-103377 labels:MTP-103377
--comment: Coach-specific DAS procedure based on OOTB approach with ES and ES Door store exclusion
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_daily_allocation_product_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _current_date character varying);


CREATE OR REPLACE FUNCTION inventory_smart.reporting_daily_allocation_product_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _current_date character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    timezone TEXT;
    _query_combine TEXT := '';
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _pm_filter TEXT := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
BEGIN

    -- Query to get the timezone from tenant_attribute_master table
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    IF _current_date IS NOT NULL AND _current_date != '' THEN
        _pm_filter := format('WHERE (created_at AT TIME ZONE %L)::date = %L::date AND status = 3 AND is_deleted = false', timezone, _current_date);
    ELSE
        _pm_filter := format('WHERE status = 3 AND is_deleted = false and (created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', timezone, timezone);
    END IF;

    _query_pa := global.form_main_table_filters('product_attributes_filter', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);

    IF _query_pa = '' THEN
        _query_pa := 'WHERE paf.active = true';
    ELSE
        _query_pa := _query_pa || ' AND paf.active = true';
    END IF;
    IF _query_sa = '' THEN
        _query_sa := 'WHERE TRUE';
    END IF;

    RAISE NOTICE 'Product filter table --> %', _query_pa;
    RAISE NOTICE 'Store filter table --> %', _query_sa;

    _query_combine := '
        WITH plan_master AS
        (
            SELECT DISTINCT plan_code, name
            FROM inventory_smart.plan_master
            WHERE (created_at AT TIME ZONE ' || quote_literal(timezone) || ')::date = (' || quote_literal(_current_date) || ')::date
            AND status = 3
            AND is_deleted = false
        )
        , product_details AS
        (
            SELECT DISTINCT paf.article
                , paf.size
                , product_code
                , article_orig, style, color_code, color_name
                , l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name
                , product_description, assortment_indicator, factory_type
            FROM global.product_attributes_filter paf
            ' || _query_pa || '
        )
        , store_details AS
        (
            SELECT DISTINCT store_code
            FROM global.store_attributes_filter
            ' || _query_sa || '
            AND cust_type NOT IN (''ES'', ''ES Door'')
        )
        , allocations_calc_base AS MATERIALIZED
        (
            SELECT  carfg.allocation_code
                ,carfg.article
                ,carfg.inventory_source
                ,carfg.retail_size_cd
                ,carfg.store
                ,carfg.pack_dc_allocation
                ,LEAST(COALESCE(carfg.allocated_total,0)::int,GREATEST(0,COALESCE(carfg.min,0)::int - COALESCE(carfg.updated_oh_oo_it,0)::int))                               AS min_units_allocated
                ,COALESCE(carfg.allocated_total,0) - LEAST(COALESCE(carfg.allocated_total,0)::int,GREATEST(0,COALESCE(carfg.min,0)::int - COALESCE(carfg.updated_oh_oo_it,0)::int)) AS wos_units_allocated
                ,carfg.oh
                ,carfg.oo
                ,carfg.it
                ,COALESCE(carfg.inv_avai,0) AS inv_avai
            FROM inventory_smart.create_allocation_result_flat_gurobi carfg
            JOIN product_details pd ON pd.article = carfg.article AND pd.size = carfg.retail_size_cd
            JOIN store_details sd ON sd.store_code = carfg.store
            WHERE carfg.created_at >= (' || quote_literal(_current_date) || '::date - INTERVAL ''1 day'')
            AND carfg.created_at <= (' || quote_literal(_current_date) || '::date + INTERVAL ''1 day'')
            AND carfg.allocation_code IN ( SELECT plan_code FROM plan_master)
        )
        , allocations_aggregated AS
        (
            SELECT  b.allocation_code
                ,b.article
                ,b.inventory_source
                ,b.retail_size_cd AS size
                ,SUM(b.wos_units_allocated) AS wos_units_allocation
                ,SUM(b.min_units_allocated) AS min_units_allocation
                ,SUM(b.oh) AS oh_total
                ,SUM(b.oo) AS oo_total
                ,SUM(b.it) AS it_total
                ,COALESCE(AVG(b.inv_avai),0) AS inv_avai
            FROM allocations_calc_base b
            INNER JOIN product_details paf ON paf.article = b.article AND paf.size = b.retail_size_cd
            GROUP BY 1, 2, 3, 4
        )
        , flat_allocation AS
        (
            SELECT  allocation_code
                ,article
                ,store
                ,js.key AS dc_code
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated'')::text,''[]'',''{}''))::text[]) AS pack_type_id
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_allocated_qty'')::text,''[]'',''{}''))::numeric[]) AS packs_allocated_qty
                ,UNNEST((TRANSLATE((js.value::jsonb->>''packs_available_qty'')::text,''[]'',''{}''))::numeric[]) AS packs_available_qty
                , retail_size_cd AS size
            FROM allocations_calc_base, jsonb_each(allocations_calc_base.pack_dc_allocation) AS js
            GROUP BY 1, 2, 3, 4, 5, 6, 7, size
        )
        , eaches_and_packs AS
        (
            SELECT  fa.allocation_code
                ,fa.article
                ,fa.store
                ,fa.dc_code
                ,fa.pack_type_id
                ,CASE WHEN dpc.units_in_pack IS NULL THEN ''eaches'' ELSE ''packs'' END AS pack_type
                ,packs_available_qty * COALESCE(dpc.units_in_pack,1)                    AS available_qty
                ,packs_allocated_qty * COALESCE(dpc.units_in_pack,1)                    AS allocated_qty
                , fa.size
            FROM flat_allocation fa
            LEFT JOIN inventory_smart.dc_pack_configuration dpc
                ON fa.article = dpc.article
                AND fa.pack_type_id = dpc.pack_type_id AND dpc.size = fa.size
        )
        , allocations_aggregates_segregated AS MATERIALIZED
        (
            SELECT  allocation_code
                ,article
                , size
                ,dc_code
                ,SUM(ata_eaches)       AS ata_eaches
                ,SUM(ata_packs)        AS ata_packs
                ,SUM(allocated_eaches) AS allocated_eaches
                ,SUM(allocated_packs)  AS allocated_packs
            FROM
            (
                SELECT  allocation_code
                    ,article
                    , size
                    ,dc_code
                    ,pack_type
                    ,CASE WHEN pack_type = ''eaches'' THEN available_qty ELSE 0 END AS ata_eaches
                    ,CASE WHEN pack_type = ''packs'' THEN available_qty ELSE 0 END  AS ata_packs
                    ,CASE WHEN pack_type = ''eaches'' THEN allocated_qty ELSE 0 END AS allocated_eaches
                    ,CASE WHEN pack_type = ''packs'' THEN allocated_qty ELSE 0 END  AS allocated_packs
                FROM
                (
                    SELECT  allocation_code
                        ,article
                        , size
                        ,dc_code
                        ,pack_type
                        ,pack_type_id
                        ,MAX(available_qty) AS available_qty
                        ,SUM(allocated_qty) AS allocated_qty
                    FROM eaches_and_packs
                    GROUP BY allocation_code, article, size, dc_code, pack_type, pack_type_id
                ) x
            ) y
            GROUP BY 1, 2, 3, 4, dc_code
        )
        , ata_totals AS
        (
            SELECT  allocation_code
                ,article
                ,size
                ,SUM(allocated_eaches + allocated_packs) AS total_allocated_all_dcs
            FROM allocations_aggregates_segregated
            GROUP BY 1, 2, 3
        )
        SELECT  aa.allocation_code
            ,pm.name                                                              AS allocated_plan_name
            ,aa.article
            , aa.size
            ,CASE WHEN UPPER(TRIM(COALESCE(aa.inventory_source, ''''))) = ''PO'' THEN ata.dc_code ELSE dc.linked_store_code END AS dc_code
            ,ata.dc_code                                                          AS carfg_dc_code
            , product_code, article_orig, style, color_code, color_name
            , l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, l6_name, l7_name, l8_name
            , product_description, assortment_indicator, factory_type
            ,0                                                                    AS reserve_quantity
            ,ROUND(COALESCE(aa.min_units_allocation,0) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) AS min_units_allocation
            ,ROUND(COALESCE(aa.wos_units_allocation,0) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) AS wos_units_allocation
            ,ROUND((COALESCE(aa.min_units_allocation,0) + COALESCE(aa.wos_units_allocation,0)) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) AS total_units_allocated
            ,COALESCE(ata.ata_eaches,0)                                           AS ata_eaches
            ,COALESCE(ata.ata_packs,0)                                            AS ata_packs
            ,ROUND(COALESCE(aa.inv_avai,0) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) AS inv_avai
            ,GREATEST(ROUND(COALESCE(aa.inv_avai,0) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) - ROUND((COALESCE(aa.min_units_allocation,0) + COALESCE(aa.wos_units_allocation,0)) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))), 0) AS remaining_available_to_allocate
            ,ROUND(COALESCE(aa.oh_total, 0) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) AS oh_total
            ,ROUND(COALESCE(aa.oo_total, 0) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) AS oo_total
            ,ROUND(COALESCE(aa.it_total, 0) * (COALESCE(ata.allocated_eaches + ata.allocated_packs, 0)::numeric / COALESCE(NULLIF(at2.total_allocated_all_dcs, 0), 1))) AS it_total
            ,0                                                                    AS store_in_stock
            ,0                                                                    AS store_in_stock_ata
            ,CONCAT(aa.article, ''-'', aa.size, ''-'', aa.allocation_code, ''-'', ata.dc_code) AS key
        FROM allocations_aggregated aa
        JOIN product_details pd ON pd.article = aa.article AND pd.size = aa.size
        JOIN plan_master pm ON pm.plan_code = aa.allocation_code
        JOIN allocations_aggregates_segregated ata
            ON ata.article = aa.article
            AND ata.allocation_code = aa.allocation_code AND ata.size = aa.size
        JOIN ata_totals at2
            ON at2.allocation_code = aa.allocation_code
            AND at2.article = aa.article AND at2.size = aa.size
        LEFT JOIN global.distribution_centres dc
            ON ata.dc_code = dc.dc_code::varchar';

    RAISE NOTICE 'query combine --> %', _query_combine;
    PERFORM global.sp_log(
        v_gen_random_uuid,
        'inventory_smart.reporting_daily_allocation_product_list',
        'Before returning function value',
        _query_combine,
        jsonb_build_object('product attribute',$2,'store attributes',$3,'table_filters',$4,'_current_date',$5)
    );
    OPEN input FOR EXECUTE _query_combine;
    RETURN input;
END
$function$
;
