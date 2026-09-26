--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:oms_populate_manual_orders_vs_13 column runOnChange:true stripComments:false splitStatements:false context:MTP-108671 labels:MTP-120095
--comment: Added ship_mode column to the return type.

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders(
    store_filter jsonb,
    product_filter jsonb,
    meta_filter jsonb
)
RETURNS TABLE (
    l6_id character varying,
    l0_name character varying,
    l2_name character varying,
    l3_name character varying,
    l4_name character varying,
    l5_name character varying,
    l6_name character varying,
    collection character varying,
    color character varying,
    subbrand_code_desc character varying,
    current_assortment_group character varying,
    product_lifecycle character varying,
    flex_style character varying,
    generic character varying,
    sizes_mat character varying,
    form character varying,
    user_defined_1 character varying,
    user_defined_2 character varying,
    user_defined_3 character varying,
    user_defined_4 character varying,
    user_defined_5 character varying,
    user_defined_6 character varying,
    subbrand_description character varying,
    masterstyle_descr character varying,
    loc_code character varying,
    l6_id_loc_code character varying,
    unique_row_id character varying,
    expected_receipt_date date,
    ship_mode character varying,
    status_obj jsonb
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_manual_orders_sql TEXT := '';
    v_pa_sql TEXT := '';
    v_sa_sql TEXT := '';
    v_meta_cls TEXT := '';
    v_where_clause TEXT := '';  -- To hold the WHERE clause
    v_limit_clause TEXT := '';  -- To hold the LIMIT/OFFSET clause
    v_order_clause TEXT := '';  -- To hold the ORDER BY clause
    v_size_sort  jsonb := NULL;
    v_order_direction text := '';
BEGIN
    -- Generate product attribute filter
    v_pa_sql := global.form_main_table_filters(
        'product_attributes_filter',
        product_filter
    );

    -- Generate store attribute filter
    v_sa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        store_filter
    );

    -- Generate metadata filters if provided
    IF meta_filter <> '{}' THEN
        IF meta_filter IS NOT NULL AND jsonb_typeof(meta_filter) = 'object' AND meta_filter <> '{}'::jsonb THEN
            -- Check if size is in sort array and remove it
            IF meta_filter->'sort' IS NOT NULL AND jsonb_array_length(meta_filter->'sort') > 0 THEN
                FOR i IN 0..jsonb_array_length(meta_filter->'sort')-1 LOOP
                    IF (meta_filter->'sort'->i->>'column') = 'size' THEN
                        v_size_sort := meta_filter->'sort'->i;
                        -- Remove size from sort array
                        meta_filter := jsonb_set(
                            meta_filter,
                            '{sort}',
                            (meta_filter->'sort') - i
                        );
                        EXIT;
                    END IF;
                END LOOP;
            END IF;
        END IF;

        -- Handle size sorting
        IF v_size_sort IS NOT NULL AND v_size_sort->>'order' = 'desc' THEN
            v_order_direction := 'DESC';
        ELSE
            v_order_direction := 'ASC';
        END IF;

        v_meta_cls := global.form_table_query(meta_filter);

        -- Extract the WHERE clause (if present)
        IF v_meta_cls ~* 'WHERE' THEN
            v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*?(?=\sLIMIT|\sOFFSET|$)');
        END IF;

        -- Extract the LIMIT/OFFSET clause (if present)
        IF v_meta_cls ~* 'LIMIT' THEN
            v_limit_clause := substring(v_meta_cls FROM 'LIMIT\s.*$');
        END IF;

        -- Extract the ORDER clause (if present)
        IF v_meta_cls ~* 'ORDER BY' THEN
            v_order_clause := substring(v_meta_cls FROM 'ORDER\sBY\s.*?(?=\sLIMIT|\sOFFSET|$)');
        END IF;
    END IF;

    -- Build the main query
    v_manual_orders_sql := '
    -- Store attributes filter materialized view
    WITH saf_data AS MATERIALIZED (
        SELECT 
            saf.dc_name,
            saf.store_code,
            saf.channel
        FROM (
            SELECT 
                dc_name,
                store_code,
                channel 
            FROM "global".store_attributes_filter 
            ' || v_sa_sql || '
        ) saf
    ),
    
    -- Product attributes filter materialized view
    paf_data AS MATERIALIZED (
        SELECT 
            paf.l6_id,
            paf.product_code,
            paf.size,
            paf.article,
            paf.cost,
            paf.l0_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.l6_name,
            paf.collection,
            paf.color,
            paf.subbrand_code_desc,
            paf.current_assortment_group,
            paf.product_lifecycle,
            paf.flex_style,
            paf.generic,
            paf.sizes_mat,
            paf.form,
            paf.user_defined_1,
            paf.user_defined_2,
            paf.user_defined_3,
            paf.user_defined_4,
            paf.user_defined_5,
            paf.user_defined_6,
            paf.subbrand_description,
            paf.masterstyle_descr,
            ast."order" as size_order
        FROM (
            SELECT 
                l6_id,
                product_code,
                article,
                l0_name,
                l2_name,
                l3_name,
                l4_name,
                l5_name,
                l6_name,
                size,
                cost,
                collection,
                color,
                subbrand_code_desc,
                current_assortment_group,
                product_lifecycle,
                flex_style,
                generic,
                sizes_mat,
                form,
                user_defined_1,
                user_defined_2,
                user_defined_3,
                user_defined_4,
                user_defined_5,
                user_defined_6,
                subbrand_description,
                masterstyle_descr
            FROM "global".product_attributes_filter 
            ' || v_pa_sql || ' 
            AND ordering = ''Y''
        ) paf
        left join (
            SELECT product_code, size, MIN("order") AS "order"
            FROM inventory_smart.article_status_tag
            GROUP BY product_code, size
        ) ast on paf.product_code = ast.product_code and paf.size = ast.size
    ),

    -- KPI data materialized view
    kpi_data AS MATERIALIZED (
        SELECT 
            ok.product_code,
            ok.loc_code,
            ok.order_multiple,
            ok.dc_inv AS dc_inventory,
            ok.system_inv AS total_inventory,
            ok.open_receipt_units AS on_order,
            ok.min_order_quantity_sku,
            ok.safety_stock,
            ok.effective_lead_time AS lead_time,
            ok.store_inv
        FROM inventory_smart.oms_kpi ok
    ),

    -- Size distribution data materialized view
    size_distribution_data AS MATERIALIZED (
        SELECT 
            dsr.product_code AS dsr_product_code,
            dsr.loc_code AS dsr_loc_code,
            dsr.article AS dsr_article,
            dsr.size AS dsr_size,
            ROUND(SUM(dsr.penetration)::NUMERIC, 2) AS size_distribution_percentage
        FROM 
            inventory_smart.dc_split_ratio dsr
        INNER JOIN global.fiscal_date_mapping fdm
            ON dsr.fiscal_year_week = fdm.fiscal_year_week
        WHERE 
            fdm.calendar_date = current_date
        GROUP BY 
            dsr.product_code, dsr.loc_code, dsr.article, dsr.size
    ),

    -- Distribution centers data materialized view
    distribution_centers_data AS MATERIALIZED (
        SELECT DISTINCT
            dc.linked_store_code,
            dc.dc_code
        FROM 
            global.distribution_centres dc 
        WHERE 
            NOT dc.is_deleted
    ),

    -- Constraints data materialized view
    constraints_data AS MATERIALIZED (
        SELECT 
            ocl.article,
            ocl.lead_time,
            ocl.po_to_order_processing,
            ocl.mode_shipment AS ship_mode
        FROM inventory_smart.oms_constraints_lead_time ocl
        WHERE ocl.default_mode = 1
    )

    -- Main query
    SELECT
        A.l6_id,
        A.l0_name,
        A.l2_name,
        A.l3_name,
        A.l4_name,
        A.l5_name,
        A.l6_name,
        A.collection,
        A.color,
        A.subbrand_code_desc,
        A.current_assortment_group,
        A.product_lifecycle,
        A.flex_style,
        A.generic,
        A.sizes_mat,
        A.form,
        A.user_defined_1,
        A.user_defined_2,
        A.user_defined_3,
        A.user_defined_4,
        A.user_defined_5,
        A.user_defined_6,
        A.subbrand_description,
        A.masterstyle_descr,
        A.loc_code,
        (A.l6_id || ''-'' || A.loc_code)::character varying AS l6_id_loc_code,
        (A.l6_id || ''-'' || A.loc_code)::character varying AS unique_row_id,
        NULL::date AS expected_receipt_date,
        A.ship_mode,
        jsonb_agg(
            jsonb_build_object(
                ''product_code'', A.product_code,
                ''size'', A.size,
                ''cost'', A.cost,
                ''loc_code'', A.loc_code,
                ''article'', A.l6_id,
                ''unique_row_id'', (A.l6_id || ''-'' || A.loc_code)::character varying,
                ''dc_inv'', A.dc_inventory,
                ''system_inv'', A.total_inventory,
                ''order_multiple'', COALESCE(A.order_multiple, 1),
                ''size_distribution_percentage'', A.size_distribution_percentage,
                ''open_receipt_units'', A.on_order,
                ''safety_stock'', A.safety_stock,
                ''lead_time'', A.lead_time,
                ''min_order_quantity_sku'', A.min_order_quantity_sku,
                ''order_placement_date'', current_date,
                ''fiscal_year'', to_char(current_date, ''YYYY''),
                ''fiscal_year_month'', to_char(current_date, ''YYYYMM''),
                ''fiscal_year_week'', to_char(current_date, ''YYYYIW''),
                ''fiscal_year_quarter'', trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')),
                ''month'', upper(trim(to_char(current_date, ''Month''))),
                ''order_reason'', A.order_reason,
                ''order_to_po_processing_time'',A.order_to_po_processing_time,
                ''store_inv'',store_inv
            ) order by A.size_order ' || v_order_direction || '
        ) AS status_obj
    FROM (
        SELECT DISTINCT 
            paf.l6_id,
            paf.l0_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.l6_name,
            paf.collection,
            paf.color,
            paf.subbrand_code_desc,
            paf.current_assortment_group,
            paf.product_lifecycle,
            paf.flex_style,
            paf.generic,
            paf.sizes_mat,
            paf.form,
            paf.user_defined_1,
            paf.user_defined_2,
            paf.user_defined_3,
            paf.user_defined_4,
            paf.user_defined_5,
            paf.user_defined_6,
            paf.subbrand_description,
            paf.masterstyle_descr,
            kpi.loc_code,
            paf.product_code,
            paf.size,
            paf.cost,
            kpi.dc_inventory,
            kpi.order_multiple,
            kpi.total_inventory,
            sdd.size_distribution_percentage,
            kpi.on_order,
            kpi.safety_stock,
            kpi.lead_time,
            kpi.store_inv,
            kpi.min_order_quantity_sku,
            paf.size_order,
            oor.order_reason,
            oor.order_to_po_processing_time,
            const_data.ship_mode
        FROM paf_data paf
        INNER JOIN kpi_data kpi 
            ON paf.product_code = kpi.product_code
        INNER JOIN distribution_centers_data dcd 
            ON dcd.linked_store_code = kpi.loc_code
        INNER JOIN saf_data saf 
            ON saf.store_code = dcd.linked_store_code
        INNER JOIN size_distribution_data sdd 
            ON paf.product_code = sdd.dsr_product_code
            AND paf.article = sdd.dsr_article
            AND paf.size = sdd.dsr_size
            AND kpi.loc_code = sdd.dsr_loc_code
        LEFT JOIN constraints_data const_data 
            ON paf.article = const_data.article
        LEFT JOIN inventory_smart.oms_orders_recommended oor
            ON paf.product_code = oor.product_code
            AND kpi.loc_code = oor.loc_code
            AND oor.order_status_id = 0
            AND NOT oor.is_deleted
    ) A ' || v_where_clause || '
    GROUP BY
        A.l6_id,
        A.l0_name,
        A.l2_name,
        A.l3_name,
        A.l4_name,
        A.l5_name,
        A.l6_name,
        A.collection,
        A.color,
        A.subbrand_code_desc,
        A.current_assortment_group,
        A.product_lifecycle,
        A.flex_style,
        A.generic,
        A.sizes_mat,
        A.form,
        A.user_defined_1,
        A.user_defined_2,
        A.user_defined_3,
        A.user_defined_4,
        A.user_defined_5,
        A.user_defined_6,
        A.subbrand_description,
        A.masterstyle_descr,
        A.loc_code,
        expected_receipt_date,
        A.ship_mode,
        A.order_reason
    ' || v_order_clause || '
    ' || v_limit_clause || '';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    RETURN QUERY EXECUTE v_manual_orders_sql;
END
$function$;