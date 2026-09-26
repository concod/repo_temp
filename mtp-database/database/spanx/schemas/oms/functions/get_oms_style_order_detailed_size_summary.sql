--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:style_order_summary_spanx_31 runOnChange:true stripComments:false splitStatements:false context:MTP-113733 labels:style_order_summary_spanx_test_update_30.
--comment: fix for nested sum in system_inv
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_style_order_detailed_size_summary(refcursor, jsonb, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_style_order_detailed_size_summary(input refcursor, product_filter jsonb, meta jsonb, order_group_id text, styles text, months text, fiscal_weeks text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_order_detailed_summary_sql TEXT := '';
    v_style_filter text := '';
    v_order_filter text := '';
    v_time_filter text := '';
    v_meta_cls text := '';
    v_where text := '';
    v_product_filter_sql text := '';
    v_limit_cls text := '';
    v_search_cls text := '';
    v_sort_cls text := '';
    limit_json jsonb := '{}';
    search_json jsonb:= '{}'; 
    sort_json jsonb := '{}';
    v_size_sort jsonb := NULL;
    v_order_direction text;
BEGIN
    -- Generate product attribute filter SQL
    v_product_filter_sql := inventory_smart.form_main_table_filters('product_attributes_filter', product_filter);

    -- Add product attributes filter join
    v_where := 'JOIN (SELECT * FROM global.product_attributes_filter ' || v_product_filter_sql || ') paf ON paf.product_code = oor.product_code';

    -- Generate Order filter
    IF order_group_id IS NOT NULL THEN
        v_order_filter := 'oor.order_group_id = ''' || order_group_id || '''';
    ELSE
        v_order_filter := ''; -- No order filter applied if the value is null
    END IF;

    -- Generate style filter dynamically
    IF styles IS NOT NULL THEN
        v_style_filter := 'paf.article IN (' || styles || ')';
    ELSE
        v_style_filter := '0=1'; -- No style filter applied if the array is empty
    END IF;

-- Generate month and fiscal month filter
    IF (months IS NOT NULL AND months <> '') OR (fiscal_weeks IS NOT NULL AND fiscal_weeks <> '') THEN
        v_time_filter := '(';
        IF months IS NOT NULL AND months <> '' THEN
            v_time_filter := v_time_filter || 'oor.month IN (' || upper(months) || ')';
        END IF;
        IF fiscal_weeks IS NOT NULL AND fiscal_weeks <> '' THEN
            IF months IS NOT NULL AND months <> '' THEN
                v_time_filter := v_time_filter || ' OR ';
            END IF;
            v_time_filter := v_time_filter || 'oor.fiscal_year_week IN (' || fiscal_weeks || ')';
        END IF;
        v_time_filter := v_time_filter || ')';
    ELSE
        v_time_filter := '0=1'; -- No time filter applied if both arrays are empty
    END IF;

    search_json = meta;
     if meta <> '{}' and  meta -> 'limit' is not null then
        -- Extract the 'limit' object
        limit_json := meta -> 'limit';
        search_json := search_json - 'limit';
        v_limit_cls := global.form_table_query(jsonb_build_object('limit', limit_json)) ;
      end if;

    IF meta IS NOT NULL AND jsonb_typeof(meta) = 'object' AND meta <> '{}'::jsonb THEN
        -- Check if size is in sort array and remove it
        IF meta->'sort' IS NOT NULL AND jsonb_array_length(meta->'sort') > 0 THEN
            FOR i IN 0..jsonb_array_length(meta->'sort')-1 LOOP
                IF (meta->'sort'->i->>'column') = 'size' THEN
                    v_size_sort := meta->'sort'->i;
                    -- Remove size from sort array
                    meta := jsonb_set(
                        meta,
                        '{sort}',
                        (meta->'sort') - i
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
     
     if meta <> '{}' and meta -> 'sort' is not null then 
     -- Extract the 'sort' object
        sort_json := meta -> 'sort';
        search_json := search_json - 'sort';
        v_sort_cls := global.form_table_query(jsonb_build_object('sort', sort_json)) ;
     end if;

    -- Generate meta conditions dynamically if provided
    IF meta <> '{}' THEN
        v_meta_cls := global.form_table_query(search_json);
         v_meta_cls := REPLACE(v_meta_cls, 'loc_code', 'oor.loc_code');
         v_meta_cls := REPLACE(v_meta_cls, 'size', 'paf.size');
         v_meta_cls := REPLACE(v_meta_cls, 'order_status', 'order_gen_type');
    END IF;
    -- Build the main query
    v_order_detailed_summary_sql := '
SELECT 
    paf.size_desc as size,
    SUM(COALESCE(ootb.otb, 0)) as otb,
    SUM(oor.elt_projected_store_inv) as elt_projected_store_inv,
    SUM(oor.elt_projected_bop) as elt_projected_bop,
    coalesce(SUM(opm.oo + opm.it),0) as open_receipt_units,
    sum(oor.elt_projected_safety_stock) as safety_stock,
    SUM(oor.roq_constrained) as roq_constrained,
    SUM(oor.unit_cost * oor.order_quantity) as order_cost,
    CASE 
        WHEN SUM(oor.order_quantity) = 0 THEN 0
        ELSE SUM(oor.unit_cost * oor.order_quantity) / SUM(oor.order_quantity)
    END as unit_cost,
    sum(oor.order_quantity) as order_quantity,
    CEIL(SUM(oor.raw_roq)) as raw_roq,
    SUM(oor.roq_unconstrained) as roq_unconstrained,
    AVG(oor.order_to_po_processing_time) as order_to_po_processing_time,
    AVG(oor.lead_time) as lead_time,
    MAX(oor.mode_shipment) as mode_shipment,
    oor.order_reason,
    string_agg(distinct oor.order_gen_type, '','') as order_gen_type,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            ''id'', oor.id,
            ''loc_code'', oor.loc_code,
            ''order_group_id'', oor.order_group_id,
            ''size'', paf.size_desc,
            ''product_description'', paf.l4_id,
            ''brand'', paf.l0_name,
            ''category'', paf.l1_id,
            ''elt_projected_bop'',oor.elt_projected_bop,
            ''elt_projected_store_inv'', oor.elt_projected_store_inv,
            ''subclass'', paf.l3_id,
            ''open_receipt_units'', coalesce(opm.oo + opm.it,0),
            ''safety_stock'',   oor.elt_projected_safety_stock,
            ''order_placement_date'',   oor.order_placement_date,
            ''unit_cost'',  oor.unit_cost,
            ''order_quantity'', oor.order_quantity,
            ''order_cost'', oor.order_quantity * oor.unit_cost,
            ''raw_roq'',    CEIL(oor.raw_roq),
            ''roq_unconstrained'', oor.roq_unconstrained,
            ''roq_constrained'', oor.roq_constrained,
            ''order_to_po_processing_time'', oor.order_to_po_processing_time,
            ''lead_time'', oor.lead_time,
            ''expected_receipt_date'', oor.expected_receipt_date,
            ''editable_expected_receipt_date'', oor.editable_expected_receipt_date,
            ''order_type'', oor.order_type,
            ''label_code'', paf.label_code,
            ''dimension_pack'', paf.dimension_pack,
            ''otb'', ootb.otb,
            ''order_gen_type'', oor.order_gen_type,
            ''updated_by'', u.name,
            ''updated_at'', oor.updated_at
        )
    ) as status_obj
        FROM
        inventory_smart.oms_orders_recommended oor
    LEFT JOIN
        global.fiscal_date_mapping fdm ON fdm.calendar_date = oor.expected_receipt_date
    LEFT JOIN inventory_smart.article_status_tag ast 
    ON ast.size = oor.size and ast.product_code = oor.product_code
    left join
        global.user_master u on u.user_code = oor.updated_by
    LEFT JOIN
            inventory_smart.oms_kpi ok ON ok.product_code = oor.product_code and ok.loc_code = oor.loc_code
    LEFT JOIN
            inventory_smart.oms_otb ootb ON ootb.product_code = oor.product_code AND ootb.loc_code = oor.loc_code AND ootb.channel = oor.channel AND ootb.fiscal_year_week = oor.fiscal_year_week
    LEFT JOIN
        (SELECT product_code,loc_code,fiscal_year_week,sum(oo) as oo, sum(it) as it FROM inventory_smart.oms_po_master GROUP BY 1,2,3) opm 
        ON opm.product_code = oor.product_code and opm.loc_code = oor.loc_code and opm.fiscal_year_week = fdm.fiscal_year_week
                ' || v_where || ' AND ' || v_order_filter || ' AND ' || v_style_filter ||'
                ' || COALESCE('AND ' || v_time_filter, '') ||' 
                ' || v_meta_cls || '
    GROUP BY 
         paf.size_desc,
         oor.order_reason
    ' || CASE         WHEN v_sort_cls = '' THEN 'ORDER BY MIN(ast.order) ' || v_order_direction
        ELSE v_sort_cls
    END || ' ' || v_limit_cls || '';

    RAISE NOTICE 'v_order_detailed_summary_sql: %', v_order_detailed_summary_sql;

    -- Open the cursor for the constructed query
    OPEN input FOR EXECUTE v_order_detailed_summary_sql;
    RETURN input;
END
$function$
;
