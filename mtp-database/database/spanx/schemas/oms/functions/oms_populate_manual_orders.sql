--liquibase formatted sql
--changeset nikhil.dhoot:oms_populate_manual_orders_update_8 column runOnChange:true stripComments:false splitStatements:false context:MTP-110440 labels:MTP-110440-1
--comment: added l6_id column
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.oms_populate_manual_orders(refcursor, jsonb, jsonb);


CREATE OR REPLACE FUNCTION inventory_smart.oms_populate_manual_orders(store_filter jsonb, product_filter jsonb, meta_filter jsonb)
     RETURNS TABLE(article_dc character varying, unique_row_id character varying, article character varying, min_order_quantity_style integer, linked_store_code character varying, l0_name character varying, l1_name character varying, l2_name character varying, l3_name character varying, l4_name character varying, l4_id character varying, lead_time integer, order_placement_date date, vendor_id character varying, vendor_desc character varying, expected_receipt_date date, min_order_quantity_sku bigint, status_obj jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_manual_orders_sql TEXT := '';
    v_pa_sql TEXT := '';
    v_sa_sql TEXT := '';
    v_where_clause TEXT := '';  -- Holds the WHERE clause
    v_meta_cls TEXT := ''; 
    v_limit_clause TEXT := '';  -- Holds the LIMIT/OFFSET clause
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

        -- Build WHERE and LIMIT clauses from meta_filter
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
    paf_data AS materialized(
        SELECT
            fd.product_code,
            fd.article,
            fd.size,
            fd.vendor_id,
            fd.vendor_desc,
            fd.l0_name,
            fd.l1_name,
            fd.l2_name,
            fd.l3_name,
            fd.l4_name,
            fd.l4_id,
            fd.cost,
            fd.label_code,
            fd.dimension_pack,
            fd."order" as size_order
        FROM
            (SELECT
                paf.product_code,
                paf.l4_id,
                paf.size,
                paf.article,
                paf.vendor_id,
                paf.vendor_desc,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.cost,
                paf.label_code,
                paf.dimension_pack,
                ast."order"
            FROM "global".product_attributes_filter paf
            left join inventory_smart.article_status_tag ast on paf.product_code = ast.product_code and paf.size = ast.size
            ' || v_pa_sql || ' AND ordering = ''Y'') fd
    ),


    product_dc_mapping AS materialized(
        SELECT 
            pdm.product_code,
            pdm.dc_code AS pdm_linked_store_code
        FROM 
            global.product_dc_mapping pdm
    ),


    kpi_data AS materialized(
        SELECT 
            ok.product_code,
            ok.dc_inv,
            ok.system_inv,
			ok.loc_code,
            ok.open_receipt_units,
            ok.safety_stock,
            ok.min_order_quantity_style,
            ok.min_order_quantity_sku,
            ok.order_multiple
        FROM 
            inventory_smart.oms_kpi ok
    ),


	size_distribution_data AS materialized(
    SELECT 
        dsr.product_code AS dsr_product_code,
        dsr.loc_code,
        dsr.article AS dsr_article,
        dsr.size AS dsr_size,
        ROUND(SUM(dsr.penetration)::NUMERIC, 2) AS size_distribution_percentage
    FROM 
        inventory_smart.dc_split_ratio dsr
    WHERE 
        to_char(current_date, ''YYYYIW'') = dsr.fiscal_year_week::character varying
    GROUP BY 
        dsr.product_code, dsr.loc_code, dsr.article, dsr.size
),

	distribution_centers_data AS materialized(
        SELECT DISTINCT
            dc.linked_store_code,
            dc.dc_code
        FROM 
            global.distribution_centres dc 
        WHERE not dc.is_deleted
    ),

    constraints_data AS materialized(
        SELECT 
            ocl.article as ocl_article,
            ocl.lead_time,
            ocl.loc_code as ocl_loc_code
        FROM 
            inventory_smart.oms_constraints_lead_time ocl
    )

    SELECT
        (A.article::text || ''-'' || A.linked_store_code::text)::character varying AS article_dc,
        (A.article::text || ''-'' || A.linked_store_code::text)::character varying AS unique_row_id,
        A.article,
        A.min_order_quantity_style,
        A.linked_store_code::character varying,
        A.l0_name,
        A.l1_name,
        A.l2_name,
        A.l3_name,
        A.l4_name,
        A.l4_id,
        COALESCE(A.lead_time, 199) AS lead_time,
        current_date AS order_placement_date,
        A.vendor_id,
        A.vendor_desc,
        NULL::date AS expected_receipt_date,
        SUM(A.min_order_quantity_sku) AS min_order_quantity_sku,
        jsonb_agg( jsonb_build_object(
            ''size'', A.size,
            ''product_code'', A.product_code,
            ''unique_row_id'', (A.article::text || ''-'' || A.linked_store_code::text)::character varying,
            ''article'', A.article,
            ''l4_id'', A.l4_id,
            ''linked_store_code'', A.loc_code,
            ''lead_time'', COALESCE(A.lead_time, 199),
            ''dc_inv'', A.dc_inv,
            ''system_inv'', A.system_inv,
            ''open_receipt_units'', A.open_receipt_units,
            ''safety_stock'', A.safety_stock,
            ''cost'', A.cost,
            ''size_distribution_percentage'', A.size_distribution_percentage,
            ''min_order_quantity_sku'', A.min_order_quantity_sku,
            ''order_multiple'', COALESCE(NULLIF(A.order_multiple, 0),  1),
            ''order_placement_date'', current_date,
            ''fiscal_year'', to_char(current_date, ''YYYY''),
            ''fiscal_year_month'', to_char(current_date, ''YYYYMM''),
            ''fiscal_year_week'', to_char(current_date, ''YYYYIW''),
            ''month'', upper(trim(to_char(current_date, ''Month''))),
            ''fiscal_year_quarter'', trim(to_char(EXTRACT(YEAR FROM current_date), ''9999'') || lpad(EXTRACT(QUARTER FROM current_date)::text, 2, ''0'')),
            ''label_code'', A.label_code,
            ''vendor_id'', A.vendor_id,
            ''vendor_desc'', A.vendor_desc,
            ''dimension_pack'', A.dimension_pack
            ) order by A.size_order ' || v_order_direction || '
        ) AS status_obj
        FROM 
        (	
        SELECT DISTINCT paf.article,paf.size,paf.product_code,kpi.loc_code,const_data.lead_time,kpi.dc_inv,kpi.system_inv,kpi.open_receipt_units,
		kpi.safety_stock,paf.cost,sdd.size_distribution_percentage,kpi.min_order_quantity_sku,kpi.order_multiple,paf.label_code,
		paf.dimension_pack,
	    kpi.min_order_quantity_style,
	    paf.l0_name,
	    paf.l1_name,
	    paf.l2_name,
	    paf.l3_name,
        paf.l4_name,
	    paf.l4_id,
	    dcd.linked_store_code,
	    paf.vendor_desc,
	    paf.vendor_id,
		paf.size_order
	FROM paf_data paf
	    INNER JOIN
	        kpi_data kpi ON paf.product_code = kpi.product_code 
		INNER JOIN
	        distribution_centers_data dcd ON dcd.linked_store_code = kpi.loc_code
        INNER JOIN 
            saf_data saf ON saf.store_code = dcd.linked_store_code
		INNER JOIN
	        product_dc_mapping pdm ON paf.product_code = pdm.product_code
		LEFT JOIN
	        size_distribution_data sdd ON paf.product_code = sdd.dsr_product_code
			AND paf.article = sdd.dsr_article
			AND paf.size = sdd.dsr_size
			AND kpi.loc_code = sdd.loc_code
	    INNER JOIN
	        constraints_data const_data ON paf.article = const_data.ocl_article
	        AND kpi.loc_code = const_data.ocl_loc_code
        ' || v_where_clause || '
)A
 GROUP BY A.article,
	    A.min_order_quantity_style,
	    A.l0_name,
	    A.l1_name,
	    A.l2_name,
	    A.l3_name,
        A.l4_name,
	    A.l4_id,
	    A.linked_store_code,
	    A.lead_time,
	    A.vendor_desc,
	    A.vendor_id
    ' || v_order_clause || '
    ' || v_limit_clause || '';

    RAISE NOTICE 'v_manual_orders_sql: %', v_manual_orders_sql;
    -- Execute and return the query results
    RETURN QUERY EXECUTE v_manual_orders_sql;

END
$function$
;