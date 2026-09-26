--liquibase formatted sql
--changeset vishal.kumar:get_po_rebalance_recommended_data runOnChange:true stripComments:false splitStatements:false context:MTP-87468 labels:MTP-87468_4
--comment: new function for po rebalance recommended data
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_po_rebalance_recommended_data(refcursor, jsonb, jsonb, int, int, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_po_rebalance_recommended_data(input refcursor, product_filter jsonb, table_query jsonb, start_week int, end_week int, choice text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

DECLARE
    v_recommended_orders_sql text := '';
    v_pa_sql text := '';
    meta text := '';
    sort_item jsonb;
    sort_column text;
    main_table_columns text[] := ARRAY['l6_id', 'l6_name', 'po_source', 'po_destination'];

BEGIN
    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        product_filter
    );
    meta := global.form_table_query(table_query);
    
    -- Check if sort is not empty and replace column references for non-main table columns
    IF table_query->>'sort' IS NOT NULL AND jsonb_array_length(table_query->'sort') > 0 THEN
        FOR i IN 0 .. jsonb_array_length(table_query->'sort') - 1 LOOP
            sort_item := table_query->'sort'->i;
            sort_column := sort_item->>'column';
            
            -- If sort column is not in main table columns, replace with JSON path
            IF sort_column IS NOT NULL AND sort_column NOT IN (SELECT unnest(main_table_columns)) THEN
                meta := REPLACE(meta, sort_column, '(f.status_obj->0->>''' || sort_column || ''')');
            END IF;
        END LOOP;
    END IF;

    v_recommended_orders_sql := '
    WITH base AS (
        SELECT 
            prb.fiscal_year_week AS fiscal_year_week_base,
            prb.loc_code AS loc_code_base,
            prb.safety_stock,
            prb.product_code,
            paf.l6_id,
            paf.l6_name,
            paf.size,
            ast."order",
            prb.dc_inv_bop_post_allocation,
            prb.po_inbound,
            prb.store_allocation_unconstrained
        FROM inventory_smart.po_rebalance_base prb
        INNER JOIN global.product_attributes_filter paf
            ON prb.product_code = paf.product_code
        LEFT JOIN (
                SELECT product_code, size, MIN("order") AS "order"
                FROM inventory_smart.article_status_tag
                GROUP BY product_code, size
        ) ast
        ON ast.size = paf.size AND ast.product_code = paf.product_code
    ),
    excess_deficit_table AS (
        SELECT 
            b.l6_id,
            b.l6_name,
            b.size,
            b."order",
            b.loc_code_base,
            d.po_source,
            d.po_destination,
            d.transfer,
            d.transfer_id,
            d.total_trans_recom as total_transfer_recomm,
            d.rem_tranfer as rem_transfer,
            d.source_po_unit_bef_rebal as po_units_before_rebalance,
            d.source_po_unit_aft_rebal as po_units_after_rebalance,
            d.source_dc_inv_bop_bef_allo as dc_inv_bop_post_allocation,
            d.source_dc_inv_bop_aft_allo as dc_inv_bop_post_allocation_after,
            d.dest_po_unit_bef_rebal as po_units_before_rebalance_des,
            d.dest_po_unit_aft_rebal as po_units_after_rebalance_des,
            d.dest_dc_inv_bop_bef_allo as dc_inv_bop_post_allocation_des,
            d.dest_dc_inv_bop_aft_allo as dc_inv_bop_post_allocation_des_after,
            SUM(b.dc_inv_bop_post_allocation - b.store_allocation_unconstrained - b.safety_stock) AS excess_deficit
        FROM base b
        LEFT JOIN inventory_smart.oms_po_rebalance_drafts d 
            ON b.l6_id = d.l6_id 
            AND b.size = d.size 
            AND b.fiscal_year_week_base = d.fiscal_year_week::int
        WHERE 
            b.l6_id = ''' || choice || '''
            AND b.fiscal_year_week_base = ' || end_week || '
        GROUP BY 
            b.l6_id, b.l6_name, b.size, b.loc_code_base,
            d.po_source, d.po_destination, d.transfer, d.transfer_id,
            d.total_trans_recom,
            d.rem_tranfer,
            d.source_po_unit_bef_rebal,
            d.source_po_unit_aft_rebal,
            d.source_dc_inv_bop_bef_allo,
            d.source_dc_inv_bop_aft_allo,
            d.dest_po_unit_bef_rebal,
            d.dest_po_unit_aft_rebal,
            d.dest_dc_inv_bop_bef_allo,
            d.dest_dc_inv_bop_aft_allo,b."order"
    ),
    excess_deficit_agg AS (
        SELECT
            l6_id,
            l6_name,
            size,
            "order",
            transfer,
            transfer_id,
            po_source,
            po_destination,
            total_transfer_recomm,
            rem_transfer,
            po_units_before_rebalance,
            po_units_after_rebalance,
            dc_inv_bop_post_allocation,
            dc_inv_bop_post_allocation_after,
            po_units_before_rebalance_des,
            po_units_after_rebalance_des,
            dc_inv_bop_post_allocation_des,
            dc_inv_bop_post_allocation_des_after,
            jsonb_object_agg(loc_code_base, excess_deficit) AS loc_code_excess_deficit
        FROM excess_deficit_table
        GROUP BY l6_id, l6_name, size, transfer, transfer_id, po_source, po_destination,total_transfer_recomm,
            rem_transfer,
            po_units_before_rebalance,
            po_units_after_rebalance,
            dc_inv_bop_post_allocation,
            dc_inv_bop_post_allocation_after,
            po_units_before_rebalance_des,
            po_units_after_rebalance_des,
            dc_inv_bop_post_allocation_des,
            dc_inv_bop_post_allocation_des_after,
            "order"
    ),
    po_id_table AS (
        SELECT 
            array_agg(DISTINCT CONCAT(po_id::VARCHAR, ''-'', loc_code::VARCHAR, ''-'', projected_delivery_date::VARCHAR)) AS po_source, 
            array_agg(DISTINCT CONCAT(po_id::VARCHAR, ''-'', loc_code::VARCHAR, ''-'', projected_delivery_date::VARCHAR)) AS po_destination 
        FROM inventory_smart.po_master_por opm
        INNER JOIN global.product_attributes_filter paf
            ON opm.product_code = paf.product_code
        WHERE 
            opm.fiscal_year_week BETWEEN ' || start_week || ' AND ' || end_week || '
            AND paf.l6_id = ''' || choice || '''
    ),
    dc_inv_bop_post_allocation AS (
        SELECT 
            paf.l6_id,
            COALESCE(SUM(opm.dc_inv_bop_post_allocation), 0) AS projected_bop_before_rebalance
        FROM inventory_smart.po_rebalance_base opm 
        LEFT JOIN global.product_attributes_filter paf
            ON opm.product_code = paf.product_code
        WHERE paf.l6_id = ''' || choice || ''' 
        AND opm.fiscal_year_week = ' || end_week || '
        GROUP BY paf.l6_id
    ),
    final AS (
        SELECT 
            a.l6_id,
            a.l6_name,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    ''size'', a.size,
                    ''order'', a.order,
                    ''transfer'', a.transfer,
                    ''transfer_id'', a.transfer_id,
                    ''po_source'', a.po_source,
                    ''po_destination'', a.po_destination,
                    ''dc_inv_bop_post_allocation'', a.dc_inv_bop_post_allocation,
                    ''dc_inv_bop_post_allocation_after'',a.dc_inv_bop_post_allocation_after,
                    ''total_transfer_recomm'',a.total_transfer_recomm,
                    ''rem_transfer'',a.rem_transfer,
                    ''po_units_before_rebalance'',a.po_units_before_rebalance,
                    ''po_units_after_rebalance'',a.po_units_after_rebalance,
                    ''po_units_before_rebalance_des'',a.po_units_before_rebalance_des,
                    ''po_units_after_rebalance_des'',a.po_units_after_rebalance_des,
                    ''dc_inv_bop_post_allocation_des_after'',a.dc_inv_bop_post_allocation_des_after,
                    ''dc_inv_bop_post_allocation_des'', a.dc_inv_bop_post_allocation_des
                ) || a.loc_code_excess_deficit
                ORDER BY a.order
            ) AS status_obj
        FROM excess_deficit_agg a
        LEFT JOIN dc_inv_bop_post_allocation d ON a.l6_id = d.l6_id
        GROUP BY a.l6_id, a.l6_name
    )
    SELECT 
        f.l6_id,
        f.l6_name,
        f.status_obj,
        p.po_source,
        p.po_destination
    FROM final f
    JOIN po_id_table p ON TRUE' || meta;

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;
    OPEN $1 FOR EXECUTE v_recommended_orders_sql;
    RETURN $1;
END
$function$;
