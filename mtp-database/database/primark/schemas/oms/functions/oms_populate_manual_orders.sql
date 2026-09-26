--liquibase formatted sql
--changeset nikhil.dhoot:pack_ordering_columns_22 runOnChange:true stripComments:false splitStatements:false context:MTP-137496 labels:MTP-137496
--comment: Added cond for fetching only one shipment mode for constraints
DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders(jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders(refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders(jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION oms.oms_populate_manual_orders(store_filter jsonb, product_filter jsonb, meta_filter jsonb)
 RETURNS TABLE(article character varying, pack_id text, product_name character varying, product_description character varying, l0_name character varying, primary_vendor_name character varying, vendor character varying, product_type character varying, l2_name character varying, l1_name character varying, l3_name character varying, loc_code character varying, article_loc_code character varying, unique_row_id character varying, expected_receipt_date date, is_pack_enabled boolean, min_order_quantity_style integer, max_order_quantity_style integer, manufacturing_lead_time numeric, vendor_lead_time numeric, lead_time numeric, safety_stock numeric, open_receipt_units numeric, system_inv numeric, dc_inv numeric, order_placement_date date, order_quantity_eaches numeric, sum_order_cost numeric, size_column text, status_obj jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_manual_orders_sql TEXT := '';
    v_pa_sql TEXT := '';
    v_sa_sql TEXT := '';
    v_meta_cls TEXT := ''; 
    v_where_clause TEXT := '';  -- To hold the WHERE clause
    v_limit_clause TEXT := '';  -- To hold the LIMIT/OFFSET clause
	v_order_clause TEXT := '';
    v_size_sort  jsonb := NULL;
    v_order_direction text := '';
BEGIN
    -- Generate product attribute filter
    v_pa_sql := oms.form_main_table_filters(
        'ph_master',
        product_filter
    );

    -- Generate store attribute filter
    v_sa_sql := oms.form_main_table_filters(
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
            v_where_clause := substring(v_meta_cls FROM 'WHERE\s.*?(?=\sORDER\sBY|\sLIMIT|\sOFFSET|$)');
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
    WITH paf_data AS (
        SELECT 
            paf.product_code,
            paf.size,
            paf.price,
            paf.article,
            paf.product_name,
            paf.l0_name,
            paf.primary_vendor_name,
            paf.vendor,
            paf.product_description,
            paf.product_type,
            paf.l2_name,
            paf.l1_name,
            paf.l3_name,
            ast."order" as size_order
        FROM
            (SELECT 
                product_code,
                article,
                article AS unique_row_id,
                product_description,
                l0_name,
                primary_vendor_name,
                product_type,
                price,
                l2_name,
                l1_name,
                l3_name,
                size,
                product_name,
                vendor

        FROM "global".product_attributes_filter ' || v_pa_sql || ' AND ordering = ''Y'') paf
        left join oms.article_status_tag ast on paf.product_code = ast.product_code and paf.size = ast.size
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
            oms.dc_split_ratio dsr
        WHERE dsr.fiscal_year_week = (
            SELECT fiscal_year_week
            FROM global.fiscal_date_mapping
            WHERE calendar_date = current_date
        )
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

    kpi_data AS (
        SELECT 
            ok.product_code as ok_product_code,
            ok.loc_code,
            opc.pack_id,
            ok.dc_inv AS dc_inv,
            ok.system_inv AS total_inventory,
            ok.open_receipt_units AS on_order,
            ok.safety_stock,
            ok.cost,
            opc.units_in_pack,
            ok.min_order_quantity_style,
            ok.max_order_quantity_style,
            ok.order_multiple
        FROM oms.oms_kpi ok
        LEFT JOIN oms.oms_pack_config opc ON ok.pack_id = opc.pack_id AND ok.product_code = opc.product_code
    ),
    constraints_data AS (
        SELECT 
            ocl.article as ocl_article,
            ocl.lead_time,
            ocl.manufacturing_lead_time,
            ocl.po_to_order_processing
        FROM oms.oms_constraints_lead_time ocl
        WHERE ocl.default_mode = 1
    ),
    fiscal_calendar_data AS MATERIALIZED (
    SELECT 
        fw_id,
        fm_id,
        fy,
        fq_id,
        fw_start_date,
        fm_name
    FROM global.fc_fy_fw_level
    WHERE date = current_date
    ),
    raw_data AS (
        SELECT DISTINCT 
            paf.article,
            paf.l2_name,
            paf.l1_name,
            paf.l3_name,
            kpi.loc_code,
            paf.product_code,
            paf.size,
            -- Added columns
            paf.primary_vendor_name,
            paf.vendor,
            paf.product_description,
            paf.product_name,
            paf.l0_name,
            paf.product_type,
            paf.price,
            fcd.fw_id,
            fcd.fm_id,
            fcd.fy,
            fcd.fq_id,
            fcd.fm_name,
            fcd.fw_start_date,
            kpi.cost,
            kpi.pack_id,
            kpi.units_in_pack,
            kpi.dc_inv,
            kpi.total_inventory,
            kpi.on_order,
            sdd.size_distribution_percentage,
            kpi.safety_stock,
            kpi.order_multiple,
            kpi.min_order_quantity_style,
            kpi.max_order_quantity_style,
            const_data.lead_time,
            const_data.manufacturing_lead_time,
            paf.size_order,
            CASE WHEN kpi.pack_id IS NULL OR kpi.pack_id = ''-'' THEN paf.size ELSE kpi.pack_id END AS size_column,
            CASE WHEN kpi.pack_id IS NOT NULL AND kpi.pack_id != ''-'' THEN TRUE ELSE FALSE END AS is_pack_enabled
        FROM paf_data paf
        INNER JOIN kpi_data kpi ON paf.product_code = kpi.ok_product_code
        INNER JOIN distribution_centers_data dcd ON dcd.linked_store_code = kpi.loc_code
        CROSS JOIN fiscal_calendar_data fcd
        INNER JOIN size_distribution_data sdd 
            ON paf.product_code = sdd.dsr_product_code
            AND paf.article = sdd.dsr_article
            AND paf.size = sdd.dsr_size
            AND kpi.loc_code = sdd.dsr_loc_code
        LEFT JOIN constraints_data const_data ON paf.article = const_data.ocl_article
    )
		select * from (

            SELECT
        agg.article,
        agg.pack_id,
        agg.product_name,
        agg.product_description::character varying,
        agg.l0_name,
        agg.primary_vendor_name,
        agg.vendor,
        agg.product_type,
        agg.l2_name,
        agg.l1_name,
        agg.l3_name,
        agg.loc_code,
        (agg.article || ''-'' || agg.loc_code)::character varying AS article_loc_code,
        (agg.article || ''-'' || agg.loc_code)::character varying AS unique_row_id,
        NULL::date AS expected_receipt_date,
        MAX(agg.is_pack_enabled::int)::boolean AS is_pack_enabled,
        MAX(agg.min_order_quantity_style) AS min_order_quantity_style,
        MAX(agg.max_order_quantity_style) AS max_order_quantity_style,
        MAX(COALESCE(ROUND((agg.manufacturing_lead_time::numeric / 7)::numeric, 2), 0)) as manufacturing_lead_time,
		MAX(COALESCE(ROUND((agg.lead_time::numeric / 7)::numeric, 2), 0)) as vendor_lead_time,
        MAX(COALESCE(ROUND((agg.lead_time::numeric)::numeric, 2), 0) + COALESCE(ROUND((agg.manufacturing_lead_time::numeric)::numeric, 2), 0)) as lead_time,
        SUM(agg.sum_safety_stock) AS safety_stock,
        SUM(agg.sum_open_receipt_units) AS open_receipt_units,
        SUM(agg.sum_system_inv) AS system_inv,
        SUM(agg.dc_inv) AS dc_inv,
        current_date as order_placement_date,
        CASE 
            WHEN agg.pack_id IS NOT NULL  THEN (agg.pack_config * 1)::numeric
            ELSE 1::numeric
        END AS order_quantity_eaches,
        SUM(agg.order_cost * CASE 
            WHEN agg.pack_id IS NOT NULL THEN agg.pack_config * 1
            ELSE 1
        END)::numeric AS sum_order_cost,
        CASE 
            WHEN MAX(agg.is_pack_enabled::int)::boolean THEN ''View Pack Details''
            ELSE ''''
        END AS size_column,
        jsonb_agg(
            jsonb_build_object(
                ''cost'', agg.order_cost,
                ''month'', agg.max_month,
                ''dc_inv'', agg.dc_inv,
                ''article'', agg.article,
                ''loc_code'', agg.loc_code,
                ''vendor_lead_time'', COALESCE(ROUND((agg.lead_time::numeric / 7)::numeric, 2), 0),
                ''system_inv'', agg.sum_system_inv,
                ''fiscal_year'', agg.max_fiscal_year,
                ''vendor_code'', agg.max_vendor_code,
                ''vendor'', agg.vendor,
                ''primary_vendor_name'', agg.primary_vendor_name,
                ''product_codes'', agg.product_codes,
                ''sizes'', agg.sizes,
                ''units_in_pack'', agg.units_in_pack,
                ''price'', agg.retail,
                ''safety_stock'', agg.sum_safety_stock,
                ''unique_row_id'', agg.max_unique_row_id,
                ''order_multiple'', agg.max_order_multiple,
                ''fiscal_year_week'', agg.fiscal_year_week,
                ''fiscal_year_month'', agg.fiscal_year_month,
                ''min_order_quantity_style'', agg.min_order_quantity_style,
                ''max_order_quantity_style'', agg.max_order_quantity_style,
                ''fiscal_year'', agg.fiscal_year,
                ''fiscal_year_quarter'', agg.fiscal_year_quarter,
                ''fiscal_year_month_name'', agg.fiscal_year_month_name,
                ''week_start_date'', agg.week_start_date,
                ''open_receipt_units'', agg.sum_open_receipt_units,
                ''order_placement_date'', agg.max_order_placement_date,
                ''size_column'', agg.size_column,
                ''size_distribution_percentage'', agg.sum_size_distribution_percentage,
                ''pack_id'', CASE WHEN agg.pack_id = ''-'' THEN NULL ELSE agg.pack_id END,
                ''pack_config'', CASE
                    WHEN agg.is_pack_enabled THEN agg.pack_config
                    ELSE agg.max_order_multiple
                END,
                ''manufacturing_lead_time'', COALESCE(ROUND((agg.manufacturing_lead_time::numeric / 7)::numeric, 2), 0)
            ) ORDER BY agg.size_column
        ) AS status_obj
    FROM (
        SELECT 
            rd.article,
            rd.primary_vendor_name,
            rd.product_name,
            rd.l0_name,
            rd.vendor,
            rd.product_description,
            rd.product_type,
            rd.min_order_quantity_style,
            rd.max_order_quantity_style,
            rd.l2_name,
            rd.l1_name,
            rd.l3_name,
            rd.loc_code,
            rd.size_column,
            AVG(rd.cost) AS order_cost,
            MAX(UPPER(TRIM(TO_CHAR(current_date, ''Month'')))) AS max_month,
            SUM(rd.dc_inv) AS dc_inv,
            MIN(rd.lead_time) AS lead_time,
            SUM(rd.total_inventory) AS sum_system_inv,
            MAX(rd.price) AS retail,
            MAX(TO_CHAR(current_date, ''YYYY'')) AS max_fiscal_year,
            MAX(COALESCE(rd.primary_vendor_name, ''-'')) AS max_vendor_code,
            MAX(COALESCE(rd.vendor, ''-'')) AS max_vendor,
            MAX(COALESCE(rd.primary_vendor_name, ''-'')) AS max_primary_vendor_name,
            ARRAY_AGG(rd.product_code) as product_codes,
            ARRAY_AGG(rd.size) AS sizes,
            ARRAY_AGG(rd.units_in_pack) AS units_in_pack,
            SUM(rd.safety_stock) AS sum_safety_stock,
            MAX((rd.article || ''-'' || rd.loc_code)::character varying) AS max_unique_row_id,
            AVG(rd.order_multiple) AS max_order_multiple,
            MAX(rd.fw_id) AS fiscal_year_week,
            MAX(rd.fm_id) AS fiscal_year_month,
            MAX(rd.fy) AS fiscal_year,
            MAX(rd.fq_id) AS fiscal_year_quarter,
            MAX(rd.fm_name) AS fiscal_year_month_name,
            MAX(rd.fw_start_date) AS week_start_date,
            SUM(rd.on_order) AS sum_open_receipt_units,
            MAX(current_date) AS max_order_placement_date,
            SUM(rd.size_distribution_percentage) AS sum_size_distribution_percentage,
            BOOL_OR(rd.is_pack_enabled) AS is_pack_enabled,
            MAX(rd.pack_id) AS pack_id,
            SUM(rd.units_in_pack) AS pack_config,
            MAX(rd.manufacturing_lead_time) AS manufacturing_lead_time,
            NULL::date AS expected_receipt_date
        FROM raw_data rd
        
        GROUP BY 
            rd.article,
            rd.primary_vendor_name,
            rd.product_name,
            rd.l0_name,
            rd.vendor,
            rd.product_description,
            rd.product_type,
            rd.min_order_quantity_style,
            rd.max_order_quantity_style,
            rd.l2_name,
            rd.l1_name,
            rd.l3_name,
            rd.loc_code,
            rd.size_column
    ) agg
    ' || v_where_clause || '
    GROUP BY
        agg.article,
        agg.pack_id,
        agg.pack_config,
        agg.product_name,
        agg.l0_name,
        agg.primary_vendor_name,
        agg.product_description,
        agg.product_type,
        agg.min_order_quantity_style,
        agg.max_order_quantity_style,
        agg.l2_name,
        agg.l1_name,
        agg.l3_name,
        agg.loc_code,
        agg.vendor,
        expected_receipt_date
    ' || v_order_clause || '
	' || v_limit_clause || ' ) x';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    RETURN QUERY EXECUTE v_manual_orders_sql;
END
$function$
;
