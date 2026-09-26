
--liquibase formatted sql
--changeset chandra.nil.ghosh:Added_get_offcycle_approval_flow_data_v7 runOnChange:true stripComments:false splitStatements:false context:MTP-56850 labels:get_offcycle_approval_flow_data
--comment: Created get_offcycle_approval_flow_data function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_offcycle_approval_flow_data(text, jsonb, jsonb, jsonb, jsonb, jsonb, boolean);

CREATE OR REPLACE FUNCTION inventory_smart.get_offcycle_approval_flow_data(
    draft_id text,
    unique_row_ids jsonb,
    product_attribute_filters jsonb,
    store_attribute_filters jsonb,
    date_filters jsonb,
    meta jsonb,
    is_update boolean
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_draft_id_int int4;
    v_quoted_ids TEXT;
    v_where_clause TEXT := '';
    v_order_by_clause TEXT := '';
    v_limit_clause TEXT := '';
    v_pa_query TEXT := '';
    v_sa_query TEXT := '';
    v_key TEXT;
    v_values jsonb;
    v_query TEXT := '';
    v_unapproved_count int4 := -1;
BEGIN
    ---------------------------------------------------------------------
    -- VALIDATIONS
    ---------------------------------------------------------------------
    IF draft_id IS NULL OR draft_id = '' THEN
        RAISE EXCEPTION 'draft_id is mandatory';
    END IF;

    IF unique_row_ids IS NULL OR unique_row_ids = '[]'::jsonb THEN
        RAISE EXCEPTION 'unique_row_ids cannot be empty';
    END IF;

    v_draft_id_int := draft_id::int4;

    ---------------------------------------------------------------------
    -- Convert JSONB array → quoted list
    ---------------------------------------------------------------------
    SELECT string_agg(quote_literal(value::text), ',')
    INTO v_quoted_ids
    FROM jsonb_array_elements_text(unique_row_ids);

    IF v_quoted_ids IS NULL OR v_quoted_ids = '' THEN
        RETURN;
    END IF;

    ---------------------------------------------------------------------
    -- WHERE clause
    ---------------------------------------------------------------------
    v_where_clause :=
        ' WHERE is_approved = FALSE AND ocr.draft_id = ' || v_draft_id_int ||
        ' AND ocr.article = ANY(ARRAY[' || v_quoted_ids || ']::TEXT[])';

    ---------------------------------------------------------------------
    -- META: sort + pagination
    ---------------------------------------------------------------------
    v_order_by_clause := ' ORDER BY A.article, A.linked_store_code';

    IF meta ? 'limit' THEN
        DECLARE
            v_limit_val int4;
            v_offset_val int4;
        BEGIN
            v_limit_val := (meta->'limit'->>'limit')::int4;
            v_offset_val := COALESCE((meta->'limit'->>'page')::int4 - 1, 0) * v_limit_val;

            IF v_limit_val > 0 THEN
                v_limit_clause := ' LIMIT ' || v_limit_val || ' OFFSET ' || v_offset_val;
            END IF;
        END;
    END IF;

    ---------------------------------------------------------------------
    -- PRODUCT ATTRIBUTE FILTERS
    ---------------------------------------------------------------------
    IF product_attribute_filters IS NOT NULL
       AND jsonb_typeof(product_attribute_filters) = 'object' THEN

        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(product_attribute_filters)
        LOOP
            v_pa_query := v_pa_query || ' AND ocr.' || v_key || ' IN (';

            v_pa_query := v_pa_query || (
                SELECT string_agg(quote_literal(val), ',')
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
            );

            v_pa_query := v_pa_query || ')';
        END LOOP;
    END IF;

    ---------------------------------------------------------------------
    -- STORE ATTRIBUTE FILTERS
    ---------------------------------------------------------------------
    IF store_attribute_filters IS NOT NULL
       AND jsonb_typeof(store_attribute_filters) = 'object' THEN

        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(store_attribute_filters)
        LOOP
            v_sa_query := v_sa_query || ' AND ocr.' || v_key || ' IN (';

            v_sa_query := v_sa_query || (
                SELECT string_agg(quote_literal(val), ',')
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val)
            );

            v_sa_query := v_sa_query || ')';
        END LOOP;
    END IF;

    ---------------------------------------------------------------------
    -- BUILD GET QUERY (unchanged)
    ---------------------------------------------------------------------
    v_query := format($$        
        WITH base_data AS (
            SELECT 
                ocr.article,
                ocr.loc_code AS linked_store_code,
                ocr.product_code::text AS product_code,
                ocr.order_quantity_cof,
                ocr.order_generation_date,
                ocr.adjusted_delivery_date,
                ocr.min_order_quantity_sku,
                ocr.min_order_quantity_style_color,
				ocr.dc_inv,
				ocr.elt_projected_safety_stock_cof,
                ocr.size AS size_desc,
                ocr.raw_roq_cof,
                ocr.roq_constrained_cof,
                ocr.roq_unconstrained_cof,
                ocr.ia_shipment_order_qty_cof,
                paf.cost,
                paf.l4_name,
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                CONCAT(ocr.article, ocr.loc_code) AS unique_row_id,
                COALESCE(ast."order", 999999) AS size_order
            FROM inventory_smart.oms_cof_orders_recommended ocr
            LEFT JOIN global.product_attributes_filter paf 
                ON ocr.article = paf.article 
               AND ocr.product_code = paf.product_code
            LEFT JOIN inventory_smart.article_status_tag ast
                ON ocr.product_code = ast.product_code 
               AND paf.size = ast.size
            %s   -- where clause
                AND ocr.order_quantity_cof > 0
            %s   -- product attribute filter
            %s   -- store filters
        )

        SELECT jsonb_build_object(
            'article', A.article,
            'linked_store_code', A.linked_store_code,
            'unique_row_id', A.unique_row_id,
            'order_quantity', SUM(COALESCE(A.order_quantity_cof, 0)),
            'total_order_quantity', SUM(SUM(COALESCE(A.order_quantity_cof, 0))) OVER (),
            'order_generation_date', MAX(A.order_generation_date),
            'adjusted_delivery_date', MAX(A.adjusted_delivery_date),
            'l4_name', MAX(A.l4_name),
            'l0_name', MAX(A.l0_name),
            'l1_name', MAX(A.l1_name),
            'l2_name', MAX(A.l2_name),
            'l3_name', MAX(A.l3_name),

            'status_obj', jsonb_agg(
                jsonb_build_object(
                    'article', A.article,
                    'size', A.size_desc,
                    'order_quantity', A.order_quantity_cof,
                    'size_order', A.size_order,
                    'order_placement_date', A.order_generation_date,
                    'expected_receipt_date', A.adjusted_delivery_date,
                    'product_code', A.product_code,
                    'linked_store_code', A.linked_store_code,
                    'dc_inv', A.dc_inv,
					'elt_projected_safety_stock_cof', A.elt_projected_safety_stock_cof,
                	'cost', A.cost,
                	'raw_roq_cof', A.raw_roq_cof,
                	'roq_constrained_cof', A.roq_constrained_cof,
                	'roq_unconstrained_cof', A.roq_unconstrained_cof,
                    'ia_shipment_order_quantity', A.ia_shipment_order_qty_cof,
                    'min_order_quantity_sku', A.min_order_quantity_sku,
                    'min_order_quantity_style', A.min_order_quantity_style_color
                )
                ORDER BY A.size_order ASC NULLS LAST
            ) FILTER (WHERE A.size_desc IS NOT NULL)
        )
        FROM base_data A
        GROUP BY A.article, A.linked_store_code, A.unique_row_id
        %s   -- order by
        %s   -- limit
        $$,
        v_where_clause,
        v_pa_query,
        v_sa_query,
        v_order_by_clause,
        v_limit_clause
    );

    ---------------------------------------------------------------------
    -- 1) ALWAYS EXECUTE GET FIRST & RETURN IT
    ---------------------------------------------------------------------
    RETURN QUERY EXECUTE v_query;


    -- 2) IF UPDATE FLAG TRUE → RUN UPDATE AFTER RETURNING GET RESULT
    ---------------------------------------------------------------------
    IF is_update THEN
        EXECUTE format(
            'UPDATE inventory_smart.oms_cof_orders_recommended ocr
             SET is_approved = TRUE %s %s %s',
            v_where_clause,
            v_pa_query,
            v_sa_query
        );
    END IF;

    ---------------------------------------------------------------------
    -- CHECK IF ALL ROWS ARE APPROVED AND MARK DRAFT AS DELETED
    ---------------------------------------------------------------------
    -- Check if there are any unapproved rows for this draft_id
    SELECT COUNT(*)
    INTO v_unapproved_count
    FROM inventory_smart.oms_cof_orders_recommended ocr1
    WHERE ocr1.draft_id = v_draft_id_int
      AND ocr1.is_approved = false;

    -- If no unapproved rows exist, mark the draft as deleted
    IF v_unapproved_count = 0 THEN
        UPDATE inventory_smart.oms_cno_off_cycle_draft ocd
        SET is_deleted = true
        WHERE ocd.draft_id = v_draft_id_int
          AND ocd.is_deleted = false;
        RAISE NOTICE 'Draft ID: % marked as deleted (all rows approved)', v_draft_id_int;
    END IF;

    RETURN;

END;
$function$;
