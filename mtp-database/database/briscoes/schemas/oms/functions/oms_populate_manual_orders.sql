--liquibase formatted sql
--changeset hari.anjaneyulu@impactanalytics.co:oms_populate_manual_orders_update_4 runOnChange:true stripComments:false splitStatements:false context:MTP-106560 labels:oms_populate_manual_orders
--comment: updatedorder_placement_date in return type
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders(store_filter jsonb, product_filter jsonb, meta_filter jsonb)
 RETURNS TABLE(article character varying, l0_name character varying, l1_name character varying, l2_name character varying, l3_name character varying, l4_name character varying, l5_name character varying, l6_name character varying, loc_code character varying, style_name character varying, vendor_name character varying, article_loc_code character varying, unique_row_id character varying, expected_receipt_date date, dc_inv numeric, system_inv numeric, open_receipt_units bigint, safety_stock bigint, min_order_quantity_sku bigint, lead_time integer, order_placement_date date, status_obj jsonb)
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
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
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

        -- Map meta_filter column names to joined table alias columns so filters can reference
        IF v_where_clause IS NOT NULL AND v_where_clause <> '' THEN
		    -- dc_inventory and legacy dc_inv -> kpi.dc_inventory
		    v_where_clause := regexp_replace(
		        v_where_clause,
		        '(^|[^A-Za-z0-9_\.])(dc_inventory|dc_inv)([^A-Za-z0-9_]|$)',
		        E'\\1kpi.dc_inventory\\3',
		        'gi'
		    );
		
		    -- total_inventory and legacy system_inv -> kpi.total_inventory
		    v_where_clause := regexp_replace(
		        v_where_clause,
		        '(^|[^A-Za-z0-9_\.])(total_inventory|system_inv)([^A-Za-z0-9_]|$)',
		        E'\\1kpi.total_inventory\\3',
		        'gi'
		    );
		
		    -- on_order and legacy open_receipt_units -> kpi.on_order
		    v_where_clause := regexp_replace(
		        v_where_clause,
		        '(^|[^A-Za-z0-9_\.])(on_order|open_receipt_units)([^A-Za-z0-9_]|$)',
		        E'\\1kpi.on_order\\3',
		        'gi'
		    );
		
		    -- lead_time and legacy effective_lead_time -> kpi.lead_time
		    v_where_clause := regexp_replace(
		        v_where_clause,
		        '(^|[^A-Za-z0-9_\.])(lead_time|effective_lead_time)([^A-Za-z0-9_]|$)',
		        E'\\1kpi.lead_time\\3',
		        'gi'
		    );
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
            paf.article,
            paf.cost,
            paf.style_name,
            paf.vendor_name,
            paf.vendor_id,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.l6_name,
            ast."order" as size_order
        FROM
            (SELECT 
                product_code,
                article,
                article AS unique_row_id,
                style_name,
                vendor_name,
                vendor_id,
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                l4_name,
                l5_name,
                l6_name,
                size,
                cost
            FROM "global".product_attributes_filter ' || v_pa_sql || ' AND ordering = ''Y'') paf
        left join inventory_smart.article_status_tag ast on paf.product_code = ast.product_code and paf.size = ast.size
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

-- Size distribution data materialized view
    size_distribution_data AS  MATERIALIZED (
        SELECT 
            dsr.product_code AS dsr_product_code,
            dsr.loc_code AS dsr_loc_code,
            dsr.article AS dsr_article,
            dsr.size AS dsr_size,
            ROUND(SUM(dsr.peneteration)::NUMERIC, 2) AS size_distribution_percentage
        FROM 
            inventory_smart.dc_split_ratio dsr
        WHERE 
            dsr.fiscal_year_week >= (
                SELECT fiscal_year_week
                FROM "global".fiscal_date_mapping
                WHERE calendar_date = current_date
                LIMIT 1
            )
        GROUP BY 
            dsr.product_code, dsr.loc_code, dsr.article, dsr.size
    ),

    kpi_data AS (
        SELECT 
            ok.product_code as ok_product_code,
            ok.loc_code,
            ok.dc_inv AS dc_inventory,
            ok.system_inv AS total_inventory,
            ok.store_inv AS store_inv,
            ok.open_receipt_units AS on_order,
            ok.safety_stock,
            ok.min_order_quantity_sku,
            ok.effective_lead_time AS lead_time,
            ok.order_multiple AS order_multiple
        FROM inventory_smart.oms_kpi ok
    ),
    constraints_data AS (
        SELECT 
            ocl.article as ocl_article,
            ocl.lead_time,
            ocl.po_to_order_processing
        FROM inventory_smart.oms_constraints_lead_time ocl
    )

    SELECT
        A.article,
        A.l0_name,
        A.l1_name,
        A.l2_name,
        A.l3_name,
        A.l4_name,
        A.l5_name,
        A.l6_name,
        A.loc_code,
        A.style_name,
        A.vendor_name,
        (A.article || ''-'' || A.loc_code)::character varying AS article_loc_code,
        (A.article || ''-'' || A.loc_code)::character varying AS unique_row_id,
        NULL::date AS expected_receipt_date,
        SUM(A.dc_inventory) AS dc_inv,
        SUM(A.total_inventory) AS system_inv,
        SUM(A.on_order) AS open_receipt_units,
        SUM(A.safety_stock) AS safety_stock,
        SUM(A.min_order_quantity_sku) AS min_order_quantity_sku,
        AVG(A.lead_time)::INTEGER AS lead_time,
        current_date as order_placement_date,
        jsonb_agg(
            jsonb_build_object(
                ''product_code'', A.product_code,
                ''size'', A.size,
                ''cost'', A.cost,
                ''loc_code'', A.loc_code,
                ''article'', A.article,
                ''unique_row_id'', (A.article || ''-'' || A.loc_code)::character varying,
                ''dc_inv'', A.dc_inventory,
                ''system_inv'', A.total_inventory,
                ''open_receipt_units'', A.on_order,
                ''vendor_code'', COALESCE(A.vendor_id, ''-''),
                ''safety_stock'', A.safety_stock,
                ''lead_time'', A.lead_time,
                ''min_order_quantity_sku'', A.min_order_quantity_sku,
                ''order_placement_date'', current_date,
                ''order_multiple'', order_multiple,
                ''store_inv'', A.store_inv,
                ''size_distribution_percentage'', A.size_distribution_percentage,
                ''fiscal_year'', to_char(current_date, ''YYYY''),
                ''fiscal_year_month'', to_char(current_date, ''YYYYMM''),
                ''fiscal_year_week'', to_char(current_date, ''YYYYIW''),
                ''fiscal_year_quarter'', trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')),
                ''month'', upper(trim(to_char(current_date, ''Month'')))
            ) order by A.size_order ' || v_order_direction || '
        ) AS status_obj
    FROM (
        SELECT DISTINCT 
            paf.article,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.l5_name,
            paf.l6_name,
            kpi.loc_code,
            paf.style_name,
            paf.vendor_name,
            paf.product_code,
            paf.size,
            paf.cost,
            paf.vendor_id,
            sdd.size_distribution_percentage,
            kpi.dc_inventory,
            kpi.total_inventory,
            kpi.on_order,
            kpi.store_inv,
            kpi.safety_stock,
            kpi.lead_time,
            kpi.min_order_quantity_sku,
            kpi.order_multiple,
            paf.size_order
        FROM paf_data paf
        INNER JOIN kpi_data kpi ON paf.product_code = kpi.ok_product_code
		INNER JOIN distribution_centers_data dcd 
		            ON dcd.linked_store_code = kpi.loc_code
        LEFT JOIN constraints_data const_data ON paf.article = const_data.ocl_article
        INNER JOIN size_distribution_data sdd 
            ON paf.product_code = sdd.dsr_product_code
            AND paf.article = sdd.dsr_article
            AND paf.size = sdd.dsr_size
            AND kpi.loc_code = sdd.dsr_loc_code

        ' || v_where_clause || '
    ) A
    GROUP BY
        A.article,
        A.l0_name,
        A.l1_name,
        A.l2_name,
        A.l3_name,
        A.l4_name,
        A.l5_name,
        A.l6_name,
        A.loc_code,
        A.style_name,
        A.vendor_name,
        expected_receipt_date
    ' || v_order_clause || '
    ' || v_limit_clause || '';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    RETURN QUERY EXECUTE v_manual_orders_sql;
END
$function$
;