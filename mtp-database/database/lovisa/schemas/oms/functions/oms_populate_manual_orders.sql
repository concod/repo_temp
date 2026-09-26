--liquibase formatted sql
--changeset nikhil.dhoot:oms_populate_manual_orders_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-121856 labels:oms_populate_manual_orders8
--comment: CNO DC filter via linked_store_codes on product_filter (same pattern as get_oms_alert_expedite_orders)

DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders( jsonb,  jsonb,  jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders(store_filter jsonb, product_filter jsonb, meta_filter jsonb)
 RETURNS TABLE(article character varying, style_name character varying, vendor character varying, l1_name character varying, l2_name character varying, l3_name character varying, l4_name character varying, range_usa character varying, range_eu_uk character varying, range_au_nz character varying, range_asia character varying, range_africa character varying, loc_code character varying, dc_name character varying, unique_row_id character varying, l6_id_loc_code character varying, expected_receipt_date date, status_obj jsonb)
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
    v_loc_filter text := '';
    v_product_filter_for_pa jsonb;
BEGIN
    -- DC filter: linked_store_codes lives on product_filter JSON (dimension DC); strip before PAF
    product_filter := COALESCE(product_filter, '{}'::jsonb);
    IF jsonb_array_length((product_filter->'linked_store_codes')->0->'values') > 0 THEN
        SELECT ' AND dc.linked_store_code = ANY(ARRAY[' || string_agg(quote_literal(elem::text), ',') || ']::text[])'
          INTO v_loc_filter
          FROM jsonb_array_elements_text((product_filter->'linked_store_codes')->0->'values') AS elem;
    END IF;
    IF v_loc_filter IS NULL THEN
        v_loc_filter := '';
    END IF;
    v_product_filter_for_pa := product_filter - 'linked_store_codes';

    -- Generate product attribute filter
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        v_product_filter_for_pa
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
        -- Map sortable columns to grouped aggregate expressions
        IF v_order_clause IS NOT NULL AND v_order_clause <> '' THEN
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?store_inv"?([^A-Za-z0-9_]|$)',
                E'\\1MAX(A.store_inv)\\2',
                'gi'
            );
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?dc_inventory"?([^A-Za-z0-9_]|$)',
                E'\\1MAX(A.dc_inventory)\\2',
                'gi'
            );
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?system_inv"?([^A-Za-z0-9_]|$)',
                E'\\1MAX(A.total_inventory)\\2',
                'gi'
            );
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?total_inventory"?([^A-Za-z0-9_]|$)',
                E'\\1MAX(A.total_inventory)\\2',
                'gi'
            );
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?order_quantity"?([^A-Za-z0-9_]|$)',
                E'\\1MAX(A.order_quantity)\\2',
                'gi'
            );
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?cost"?([^A-Za-z0-9_]|$)',
                E'\\1MAX(A.cost)\\2',
                'gi'
            );
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?safety_stock"?([^A-Za-z0-9_]|$)',
                E'\\1MAX(A.safety_stock)\\2',
                'gi'
            );
            v_order_clause := regexp_replace(
                v_order_clause,
                '(^|[^A-Za-z0-9_\.])"?expected_receipt_date"?([^A-Za-z0-9_]|$)',
                E'\\1expected_receipt_date\\2',
                'gi'
            );
        END IF;
    END IF;

    -- Build the main query
    v_manual_orders_sql := '
        WITH paf_data AS MATERIALIZED (
            SELECT
                paf.display_article,
                AVG(paf.cost) AS cost,
                paf.vendor,
                paf.style_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.range_usa,
                paf.range_eu_uk,
                paf.range_au_nz,
                paf.range_asia,
                paf.range_africa
            FROM "global".product_attributes_filter paf
            ' || v_pa_sql || '
            AND ordering = ''Y'' AND is_deleted = False
            GROUP BY
                paf.display_article,
                paf.vendor,
                paf.style_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.range_usa,
                paf.range_eu_uk,
                paf.range_au_nz,
                paf.range_asia,
                paf.range_africa
        ),
        kpi_data AS MATERIALIZED (
        SELECT 
            ok.product_code,
            ok.loc_code,
            ok.order_multiple,
            ok.dc_inv AS dc_inventory,
            ok.system_inv AS total_inventory,
            ok.open_receipt_units AS on_order,
            ok.min_order_quantity_sku,
			ok.max_order_quantity_sku,
            ok.safety_stock,
            --ok.effective_lead_time AS lead_time,
            ok.store_inv
        FROM inventory_smart.oms_kpi ok
    )
    -- Distribution centers data materialized view
    ,distribution_centers_data AS MATERIALIZED (
        SELECT DISTINCT
			dc.name as dc_name,
            dc.linked_store_code,
            dc.dc_code
        FROM 
            global.distribution_centres dc 
        WHERE 
            NOT dc.is_deleted
            ' || v_loc_filter || '
    )

    -- Constraints data materialized view
    ,constraints_data AS MATERIALIZED (
        SELECT 
            ocl.article,
			ocl.loc_code,
            ocl.lead_time,
			ocl.mode_shipment,
            ocl.po_to_order_processing
        FROM inventory_smart.oms_constraints_lead_time ocl
    )

    -- Main query
    SELECT
        A.l4_name as article,
        A.style_name,
		A.vendor,
        A.l1_name,
        A.l2_name,
        A.l3_name,
        A.l4_name,
        A.range_usa,
        A.range_eu_uk,
        A.range_au_nz,
        A.range_asia,
        A.range_africa,
        A.loc_code,
		A.dc_name,
        (A.l4_name || ''-'' || A.loc_code)::character varying AS unique_row_id,
		(A.l4_name || ''-'' || A.loc_code)::character varying AS l6_id_loc_code,
        (CURRENT_DATE + (A.lead_time || '' days'')::INTERVAL)::date AS expected_receipt_date,
        jsonb_agg(
            jsonb_build_object(
                ''product_code'', A.l4_name,
                --''size'', A.size,
                ''cost'', A.cost,
				''unit_cost'', A.unit_cost,
                ''loc_code'', A.loc_code,
                ''article'', A.l4_name,
                ''unique_row_id'', (A.l4_name || ''-'' || A.loc_code)::character varying,
                ''dc_inventory'', A.dc_inventory,
                ''system_inv'', A.total_inventory,
                ''order_multiple'', COALESCE(A.order_multiple, 1),
                --''size_distribution_percentage'', A.size_distribution_percentage,
                ''open_receipt_units'', A.on_order,
                ''safety_stock'', A.safety_stock,
                ''lead_time'', A.lead_time,
                ''min_order_quantity_sku'', A.min_order_quantity_sku,
				''max_order_quantity_sku'', A.max_order_quantity_sku,
                ''order_placement_date'', current_date,
				''expected_receipt_date'', current_date + (A.lead_time || '' days'')::INTERVAL ,
                ''fiscal_year'', to_char(current_date, ''YYYY''),
                ''fiscal_year_month'', to_char(current_date, ''YYYYMM''),
                ''fiscal_year_week'', to_char(current_date, ''YYYYIW''),
                ''fiscal_year_quarter'', trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')),
                ''month'', upper(trim(to_char(current_date, ''Month''))),
                ''order_reason'', A.order_reason,
                ''order_to_po_processing_time'',A.order_to_po_processing_time,
				''shipment_mode'',mode_shipment,
                ''store_inv'',store_inv
            ) --order by A.size_order ' || v_order_direction || '
        ) AS status_obj
    FROM (
        SELECT DISTINCT 
            paf.display_article,
            --paf.size,
            --paf.article,
			paf.style_name,
			paf.vendor,
            paf.cost,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
			paf.range_usa,
            paf.range_eu_uk,
            paf.range_au_nz,
            paf.range_asia,
            paf.range_africa,
            kpi.loc_code,
            kpi.dc_inventory,
            kpi.order_multiple,
            kpi.total_inventory,
            --sdd.size_distribution_percentage,
            kpi.on_order,
            kpi.safety_stock,
            kpi.store_inv,
            kpi.min_order_quantity_sku,
			kpi.max_order_quantity_sku,
			const_data.lead_time,
			const_data.mode_shipment,
            --paf.size_order,
			dcd.dc_name,
            oor.unit_cost,
            oor.order_reason,
            oor.order_to_po_processing_time
        FROM paf_data paf
        INNER JOIN kpi_data kpi 
            ON paf.display_article = kpi.product_code
        INNER JOIN distribution_centers_data dcd 
            ON dcd.linked_store_code = kpi.loc_code
        LEFT JOIN constraints_data const_data 
            ON paf.display_article = const_data.article 
			AND kpi.loc_code = const_data.loc_code
        LEFT JOIN inventory_smart.oms_orders_recommended oor
            ON paf.display_article = oor.product_code
            AND kpi.loc_code = oor.loc_code
            AND oor.order_status_id = 0
            AND NOT oor.is_deleted
    ) A ' || v_where_clause || '
    GROUP BY
		A.l4_name,
		A.style_name,
		A.vendor,
        A.l1_name,
        A.l2_name,
        A.l3_name,
		A.l4_name,
        A.range_usa,
        A.range_eu_uk,
        A.range_au_nz,
        A.range_asia,
        A.range_africa,
        A.loc_code,
		A.dc_name,
        expected_receipt_date
    ' || v_order_clause || '
    ' || v_limit_clause || '';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    RETURN QUERY EXECUTE v_manual_orders_sql;
END
$function$
;