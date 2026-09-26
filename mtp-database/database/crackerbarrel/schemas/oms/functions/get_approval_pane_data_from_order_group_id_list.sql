--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_approval_pane_data_from_order_group_id_list_cbocs_6 runOnChange:true stripComments:false splitStatements:false context:MTP-55924 labels:MTP-95725
--comment: Include 0 quantity orders in the approval pane data
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_approval_pane_data_from_order_group_id_list(article text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], order_type text[], primary_trait_desc text[], primary_vendor_name text[], product_attribute_8 text[], product_type text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb, meta_filter jsonb, order_group_id_list text[]);

CREATE OR REPLACE FUNCTION inventory_smart.get_approval_pane_data_from_order_group_id_list(article text[], l2_name text[], l3_name text[], l4_name text[], l5_name text[], order_type text[], primary_trait_desc text[], primary_vendor_name text[], product_attribute_8 text[], product_type text[], start_order_placement_date date, end_order_placement_date date, product_filter jsonb, meta_filter jsonb, order_group_id_list text[])
 RETURNS TABLE(article_data character varying, loc_code_data character varying, order_placement_date date, l3_name_data text, l4_name_data text, l5_name_data text, order_type_data text, product_description_data text, editable_expected_receipt_date date, size_data text, recom_receipt_date date, order_group_id text, order_quantity integer, pack_id_data text, status_obj json, total_count integer, total_order_qty integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql text := '';
    v_recommended_orders_sql text := '';
    v_l0_name text := '';
    v_l1_name text := '';
    v_l2_name text := '';
    v_l3_name text := '';
    v_l5_name text := '';
    v_l6_name text := '';
    v_loc_code text := '';
    v_order_type text := '';
    v_order_placement_date text := '';
    v_article text := '';
    v_meta_cls TEXT := '';
    v_limit_clause TEXT := '';
    v_having_clause TEXT := '';
    v_order_clause TEXT := '';
    v_where_clause TEXT := '';
    v_product_attribute_8 text := '';
    v_primary_vendor_name text := '';
    v_product_type text := '';
    v_primary_trait_desc text := '';
	v_order_group_id_list text := '';
BEGIN
    -- Generate metadata filters if provided
    IF meta_filter IS NOT NULL 
       AND jsonb_typeof(meta_filter) = 'object' 
       AND meta_filter <> '{}'::jsonb THEN
        
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

    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', product_filter);

    IF l2_name IS NOT NULL AND array_length(l2_name, 1) > 0 THEN
        v_l2_name := 'and paf.l2_name = ANY(' || quote_literal(l2_name) || ')';
    END IF;

    IF l3_name IS NOT NULL AND array_length(l3_name, 1) > 0 THEN
        v_l3_name := 'and paf.l3_name = ANY(' || quote_literal(l3_name) || ')';
    END IF;

    IF l5_name IS NOT NULL AND array_length(l5_name, 1) > 0 THEN
        v_l5_name := 'and paf.l5_name = ANY(' || quote_literal(l5_name) || ')';
    END IF;

    IF product_attribute_8 IS NOT NULL AND array_length(product_attribute_8, 1) > 0 THEN
        v_product_attribute_8 := 'and paf.product_attribute_8 = ANY(' || quote_literal(product_attribute_8) || ')';
    END IF;

    IF primary_vendor_name IS NOT NULL AND array_length(primary_vendor_name, 1) > 0 THEN
        v_primary_vendor_name := 'and paf.primary_vendor_name = ANY(' || quote_literal(primary_vendor_name) || ')';
    END IF;

    IF product_type IS NOT NULL AND array_length(product_type, 1) > 0 THEN
        v_product_type := 'and paf.product_type = ANY(' || quote_literal(product_type) || ')';
    END IF;

    IF primary_trait_desc IS NOT NULL AND array_length(primary_trait_desc, 1) > 0 THEN
        v_primary_trait_desc := 'and paf.primary_trait_desc = ANY(' || quote_literal(primary_trait_desc) || ')';
    END IF;

    IF article IS NOT NULL AND array_length(article, 1) > 0 THEN
        v_article := 'and oor.article = ANY(' || quote_literal(article) || ')';
    END IF;

    IF end_order_placement_date IS NOT NULL AND start_order_placement_date IS NOT NULL THEN
        v_order_placement_date := 'and oor.order_placement_date between ''' || start_order_placement_date || ''' and ''' || end_order_placement_date || '''';
    END IF;

    IF order_type IS NOT NULL AND array_length(order_type, 1) > 0 THEN
        v_order_type := 'and oor.order_type = ANY(' || quote_literal(order_type) || ')';
    END IF;

	if order_group_id_list IS NOT NULL AND array_length(order_group_id_list, 1) > 0 THEN
    	v_order_group_id_list := 'and oor.order_group_id = ANY('|| quote_literal(order_group_id_list) ||')';
	end if;

    v_having_clause := 'HAVING SUM(order_quantity) > 0';

    v_recommended_orders_sql := '
    WITH valid_groups AS (
        SELECT 
        oor.order_group_id,
        oor.size,
		COALESCE(ast."order", 999999) AS size_order
        FROM inventory_smart.oms_orders_recommended oor
        INNER JOIN global.product_attributes_filter paf
            ON oor.product_code = paf.product_code
		LEFT JOIN (
            SELECT product_code, size, MIN("order") AS "order"
            FROM inventory_smart.article_status_tag
            GROUP BY product_code, size
        ) ast 
            ON ast.size = oor.size AND ast.product_code = oor.product_code
        WHERE oor.order_status_id = 0 
            ' || v_l0_name || '
            ' || v_l1_name || '
            ' || v_l2_name || '
            ' || v_l3_name || '
            ' || v_l5_name || '
            ' || v_order_placement_date || '
            ' || v_article || '
            ' || v_order_type || '
            ' || v_loc_code || '
            ' || v_product_attribute_8 || '
            ' || v_primary_vendor_name || '
            ' || v_product_type || '
            ' || v_primary_trait_desc || '
			' || v_order_group_id_list ||'
    ),
    base_data AS (
        SELECT 
            paf.article AS article_data,
            oor.loc_code AS loc_code_data,
		    oor.order_placement_date,
            max(paf.l3_name) AS l3_name_data,
            max(paf.l4_name) AS l4_name_data,
            max(paf.l5_name) AS l5_name_data,
            max(oor.order_type) AS order_type_data,
            max(paf.product_description) AS product_description_data,
            max(oor.editable_expected_receipt_date) AS editable_expected_receipt_date,
            max(CASE 
                WHEN oor.pack_id IS NULL OR oor.pack_id = ''WP'' THEN oor.size
                ELSE ''-''
            END) AS size_data,
            max(oor.recom_receipt_date) AS recom_receipt_date,
            max(oor.order_group_id) AS order_group_id,
            sum(oor.order_quantity_eaches)::integer AS order_quantity,
            max(CASE 
                WHEN oor.pack_id IS NULL OR oor.pack_id = ''WP'' THEN ''-''
                ELSE oor.pack_id
            END) AS pack_id_data,
             JSON_AGG(
            JSON_BUILD_OBJECT(
                ''loc_code_data'',oor.loc_code,
                ''size_data'',oor.size,
                ''order_quantity'',oor.order_quantity_eaches,
                ''order_placement_date'',oor.order_placement_date,
		        ''editable_expected_receipt_date'',oor.editable_expected_receipt_date,
                ''order_group_id'',oor.order_group_id,
                ''order_type_data'',oor.order_type
            )
            ORDER BY size_order
        ) AS status_obj
        FROM inventory_smart.oms_orders_recommended oor
        INNER JOIN global.product_attributes_filter paf
            ON oor.product_code = paf.product_code
        INNER JOIN valid_groups vg
            ON oor.order_group_id = vg.order_group_id and oor.size = vg.size
        group by 1,2,3
        ' || v_having_clause ||'
    )
    SELECT 
        bd.*,
        COUNT(*) OVER ()::integer AS total_count,
        SUM(bd.order_quantity) OVER ()::integer AS total_order_qty
    FROM base_data bd
    ' || v_order_clause || '
    ' || v_limit_clause || '
    ';

    RAISE NOTICE 'v_recommended_orders_sql %', v_recommended_orders_sql;

    RETURN QUERY EXECUTE v_recommended_orders_sql;
END;
$function$
;