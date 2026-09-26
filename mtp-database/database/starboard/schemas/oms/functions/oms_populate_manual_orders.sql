--liquibase formatted sql
--changeset priyansh_gautam:starboard_version_7 runOnChange:true stripComments:false splitStatements:false context:MTP-133897 labels:MTP-133897-1
--comment: sb_version_1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders(jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders(refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS oms.oms_populate_manual_orders(jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION oms.oms_populate_manual_orders(store_filter jsonb, product_filter jsonb, meta_filter jsonb)
 RETURNS TABLE(style_color_desc character varying, article character varying, primary_vendor_name character varying, l2_name character varying, l3_name character varying, l4_name character varying, l5_name character varying, loc_code character varying, vendor_code text, avg_unit_cost double precision, article_loc_code character varying, unique_row_id character varying, min_order_quantity_style integer, min_order_quantity_sku integer, po_to_processing_days integer, manufacturing_lead_time numeric, vendor_lead_time numeric, lead_time integer, safety_stock numeric, open_receipt_units numeric, system_inv numeric, dc_inv numeric, store_inventory numeric, total_inventory numeric, order_placement_date date, expected_receipt_date date, order_quantity integer, sum_order_cost integer, transportation_mode text, status_obj jsonb)
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
	        paf.primary_vendor_name,
	        paf.product_description,
	        paf.l2_name,
	        paf.l3_name,
	        paf.l4_name,
	        paf.l5_name,
	        ast."order" AS size_order,
	        paf.style_color_desc,
	        paf.unit_cost
        FROM
            (SELECT 
                unit_cost,
	            style_color_desc,
	            vendorname,
	            product_code,
	            article,
	            article AS unique_row_id,
	            product_description,
	            primary_vendor_name,
	            price,
	            l2_name,
	            l3_name,
	            l4_name,
	            l5_name,
	            size

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
            ok.vendor_code,
	        ok.product_code AS ok_product_code,
	        ok.loc_code,
	        ok.dc_inv AS dc_inv,
			ok.store_inv as store_inv,
	        ok.system_inv AS system_inv,
			ok.dc_inv  + ok.store_inv as total_inv,
	        ok.open_receipt_units AS on_order,
	        ok.safety_stock,
	        ok.cost,
	        ok.min_order_quantity_style,
	        ok.min_order_quantity_sku,
	        ok.order_multiple
	    FROM oms.oms_kpi ok
    ),
    constraints_data AS (
        SELECT 
		    ocl.article as ocl_article,
		    ocl.loc_code,
		    ocl.mode_shipment,
		    ocl.default_mode,
		    ocl.lead_time,
		    ocl.manufacturing_lead_time,
		    ocl.po_to_order_processing
		FROM oms.oms_constraints_lead_time ocl
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
		        paf.style_color_desc,
		        paf.article,
		        paf.l2_name,
		        paf.l3_name,
		        paf.l4_name,
		        paf.l5_name,
		        kpi.loc_code,
		        paf.product_code,
		        paf.size,
		        paf.primary_vendor_name,
		        paf.product_description,
		        paf.price,
		        fcd.fw_id,
		        fcd.fm_id,
		        fcd.fy,
		        fcd.fq_id,
		        fcd.fm_name,
		        fcd.fw_start_date,
		        kpi.cost,
		        kpi.dc_inv,
				kpi.store_inv,
		        kpi.total_inv,
		        kpi.on_order,
		        sdd.size_distribution_percentage,
		        kpi.safety_stock,
		        kpi.order_multiple,
		        kpi.min_order_quantity_style,
		        kpi.min_order_quantity_sku,
		        kpi.vendor_code,
		        const_data.lead_time,
		        const_data.manufacturing_lead_time,
				const_data.mode_shipment,
				const_data.default_mode,
				const_data.lead_time AS transport_lead_time,
		        const_data.po_to_order_processing,
		        paf.size_order,
		        paf.unit_cost
		    FROM paf_data paf
		    INNER JOIN kpi_data kpi 
		        ON paf.product_code = kpi.ok_product_code
		    INNER JOIN distribution_centers_data dcd 
		        ON dcd.linked_store_code = kpi.loc_code
		    CROSS JOIN fiscal_calendar_data fcd
		    INNER JOIN size_distribution_data sdd 
		        ON paf.product_code = sdd.dsr_product_code
		        AND paf.article = sdd.dsr_article
		        AND paf.size = sdd.dsr_size
		        AND kpi.loc_code = sdd.dsr_loc_code
		    LEFT JOIN constraints_data const_data
			    ON paf.article = const_data.ocl_article
			   AND kpi.loc_code = const_data.loc_code
		)
		select * from (

            SELECT
		        agg.style_color_desc,
		        agg.article,
		        agg.primary_vendor_name,
		        agg.l2_name,
		        agg.l3_name,
		        agg.l4_name,
		        agg.l5_name,
		        agg.loc_code,
		        agg.vendor_code,
		        AVG(agg.avg_unit_cost) AS avg_unit_cost,
		        (agg.article || ''-'' || agg.loc_code)::varchar AS article_loc_code,
		        (agg.article || ''-'' || agg.loc_code)::varchar AS unique_row_id,
		        MAX(agg.min_order_quantity_style) AS min_order_quantity_style,
		        MAX(agg.min_order_quantity_sku) AS min_order_quantity_sku,
		        MAX(agg.po_to_order_processing) AS po_to_processing_days,
		        MAX(agg.manufacturing_lead_time::numeric) AS manufacturing_lead_time,
		        MAX(agg.lead_time::numeric) AS vendor_lead_time,
		        MAX(agg.lead_time + agg.manufacturing_lead_time) AS lead_time,
		        SUM(agg.sum_safety_stock) AS safety_stock,
		        SUM(agg.sum_open_receipt_units) AS open_receipt_units,
		        SUM(agg.sum_system_inv) AS system_inv,
		        SUM(agg.dc_inv) AS dc_inv,
				SUM(agg.store_inventory) as store_inventory,
				SUM(agg.sum_system_inv) as total_inventory,
		        current_date AS order_placement_date,
				current_date + max(lead_time::int)  AS expected_receipt_date,
		        1 AS order_quantity,
		        1 AS sum_order_cost,
		        max(agg.transportation_mode) as transportation_mode,
		        jsonb_agg(
		            jsonb_build_object(
                        ''unique_row_id'', (agg.article || ''-'' || agg.loc_code),
                        ''article'', agg.article,
		                ''size'', agg.size,
		                ''product_code'', agg.product_codes,
		                ''style_color_desc'', agg.style_color_desc,
		                ''loc_code'', agg.loc_code,
		                ''cost'', agg.order_cost,
		                ''dc_inv'', agg.dc_inv,
		                ''total_inventory'', agg.sum_system_inv,
		                ''safety_stock'', agg.sum_safety_stock,
		                ''size_distribution_percentage'', agg.sum_size_distribution_percentage,
		                ''order_multiple'', agg.max_order_multiple,
		                ''min_order_quantity_sku'', agg.min_order_quantity_sku,
		                ''vendor_code'', agg.vendor_code,
		                ''unit_cost'', agg.avg_unit_cost,
		                ''primary_vendor_name'', agg.primary_vendor_name,
		                ''po_to_processing_days'', agg.po_to_order_processing,
		                ''order_placement_date'', current_date,
		                ''expected_receipt_date'',current_date + agg.lead_time,
		                ''lead_time'', agg.lead_time + agg.manufacturing_lead_time,
		                ''max_order_quantity_sku'', agg.max_order_multiple,
		                ''min_order_quantity_style'', agg.min_order_quantity_style,
		                ''min_order_quantity_shipment'', NULL,
		                ''inventory_hold'', NULL,
		                ''month'', agg.fm_name,
		                ''fiscal_year'', agg.fy,
		                ''fiscal_year_quarter'', agg.fq_id,
		                ''fiscal_year_month'', agg.fm_id,
		                ''fiscal_year_week'', agg.fw_id,
		                ''week_start_date'', agg.fw_start_date,
						''transportation_mode'', agg.transportation_mode,
						''available_modes'', agg.available_modes
		            )
		            ORDER BY agg.size_order
		        ) AS status_obj
    FROM (
         SELECT
            rd.style_color_desc,
            rd.article,
            rd.primary_vendor_name,
            rd.min_order_quantity_style,
            rd.min_order_quantity_sku,
            rd.l2_name,
            rd.l3_name,
            rd.l4_name,
            rd.l5_name,
            rd.loc_code,
            rd.size,
            rd.size_order,
            AVG(rd.cost) AS order_cost,
            SUM(rd.dc_inv) AS dc_inv,
            MIN(rd.lead_time) AS lead_time,
            SUM(rd.total_inv) AS sum_system_inv,
            SUM(rd.store_inv) as store_inventory,
            SUM(rd.safety_stock) AS sum_safety_stock,
            SUM(rd.on_order) AS sum_open_receipt_units,
            SUM(rd.size_distribution_percentage) AS sum_size_distribution_percentage,
            MIN(rd.product_code) AS product_codes,
            AVG(rd.order_multiple) AS max_order_multiple,
            MAX(rd.manufacturing_lead_time) AS manufacturing_lead_time,
            AVG(rd.unit_cost) AS avg_unit_cost,
            MAX(rd.vendor_code) AS vendor_code,
            MAX(rd.po_to_order_processing) AS po_to_order_processing,
            MAX(rd.fm_name) AS fm_name,
            MAX(rd.fw_id) AS fw_id,
            MAX(rd.fm_id) AS fm_id,
            MAX(rd.fy) AS fy,
            MAX(rd.fq_id) AS fq_id,
            MAX(rd.fw_start_date) AS fw_start_date,
			MAX(rd.mode_shipment) FILTER (WHERE rd.default_mode = 1) AS transportation_mode,
			jsonb_object_agg(
			    rd.mode_shipment,
			    rd.transport_lead_time +  rd.manufacturing_lead_time
			) FILTER (WHERE rd.mode_shipment IS NOT NULL) AS available_modes
        FROM raw_data rd
        
        GROUP BY
            rd.article,
            rd.style_color_desc,
            rd.primary_vendor_name,
            rd.min_order_quantity_style,
            rd.min_order_quantity_sku,
            rd.l2_name,
            rd.l3_name,
            rd.l4_name,
            rd.l5_name,
            rd.loc_code,
            rd.size,
            rd.size_order
    ) agg
    ' || v_where_clause || '
    GROUP BY
        agg.article,
        agg.style_color_desc,
        agg.primary_vendor_name,
        agg.min_order_quantity_style,
        agg.min_order_quantity_sku,
        agg.l2_name,
        agg.l3_name,
        agg.l4_name,
        agg.l5_name,
        agg.loc_code,
        agg.vendor_code,
        agg.fm_name,
        agg.fw_id,
        agg.fm_id,
        agg.fy,
        agg.fq_id,
        agg.fw_start_date,
        agg.po_to_order_processing
    ' || v_order_clause || '
	' || v_limit_clause || ' ) x';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    RETURN QUERY EXECUTE v_manual_orders_sql;
END
$function$
;
