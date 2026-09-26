--liquibase formatted sql
--changeset pradeep.kumar:adding_order_quantity_condition runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:fetch_order_data_carters
--comment: updated po_id logic
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.fetch_order_data(filter_criteria jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.fetch_order_data(filter_criteria jsonb)
 RETURNS TABLE(
 l1_bulk_number TEXT,
    channel character varying,
    brand character varying,
    bulk_description TEXT,
    po_type TEXT,
    delivery_date DATE,
    cancel_date DATE,
    vendor_code character varying,
    is_prepack TEXT,
    buy_season TEXT,
    year INTEGER,
    po_line_id TEXT,
    cost DOUBLE PRECISION,
    style character varying,
    color TEXT,
    po_detail_id TEXT,
    class_log_units INTEGER,
    size_master_code character varying,
    size character varying,
    upc character varying,
    dim_code TEXT,
    po_attribute TEXT,
    file_name TEXT,
    is_deleted TEXT)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_column_name TEXT;
    v_values JSONB;
    v_query TEXT;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    -- Extract column name and value from the JSONB input
    v_column_name := filter_criteria->>'column_name';
    v_values := filter_criteria->'values';

    -- Validate column name to prevent SQL injection
    IF v_column_name NOT IN ('id', 'order_group_id') THEN
        RAISE EXCEPTION 'Invalid column name: %', v_column_name;
    END IF;

    -- Build the dynamic SQL query
    v_query := format(
        'WITH po_attribute_value AS (
            SELECT
                product_code,
                CONCAT(UPPER(LEFT(l2_name,1)), 
                    CASE 
                        WHEN UPPER(l3_name) = ''ACCESSORIES''   THEN ''6''
                        WHEN UPPER(l3_name) = ''BABY''          THEN ''1''
                        WHEN UPPER(l3_name) = ''BOYS PLAYWEAR'' THEN ''5''
                        WHEN UPPER(l3_name) = ''GIRLS PLAYWEAR''THEN ''4''
                        WHEN UPPER(l3_name) = ''OUTERWEAR''     THEN ''7''
                        WHEN UPPER(l3_name) = ''SHOES''         THEN ''9''
                        WHEN UPPER(l3_name) = ''SKIP HOP''      THEN ''10''
                        WHEN UPPER(l3_name) = ''SLEEPWEAR''     THEN ''3''
                        WHEN UPPER(l3_name) = ''SWIMWEAR''      THEN ''8''
                        WHEN UPPER(l3_name) = ''LITTLE PLANET'' THEN ''11''
                    END,
                    CASE
                        WHEN UPPER(l3_name) = ''OUTERWEAR'' THEN ''O''
                        WHEN UPPER(l3_name) = ''SHOES'' THEN ''S''
                        WHEN UPPER(l3_name) = ''ACCESSORIES'' THEN ''A''
                        WHEN l4_name = ''4-14'' THEN ''B''
                        WHEN l4_name = ''0-24M'' THEN ''I''
                        WHEN l4_name = ''2T-5T'' THEN ''T''
                        ELSE ''X''
                    END,
                    CASE
                        WHEN l1_name = ''Brick __ia_char_13 Mortar'' THEN ''S''
                        WHEN l1_name = ''E-Commerce'' THEN ''E''
                    END,
                    LEFT(collection_id,8)
                ) AS po_attribute
            FROM inventory_smart.oms_orders_recommended oor
            JOIN global.product_attributes_filter paf USING (product_code)
        ),
        approved_orders AS (
            SELECT DISTINCT
                oor.*,
                UPPER(SPLIT_PART(name, '' '', 2)) AS buy_season,
                SPLIT_PART(name, '' '', 1) AS year,
                CONCAT(UPPER(LEFT(SPLIT_PART(name, '' '', 2),3)),
                    RIGHT(SPLIT_PART(name, '' '', 1),2),
                    UPPER(LEFT(l2_name,1)),
                    UPPER(LEFT(l1_name,1)),
                    TO_CHAR(editable_expected_receipt_date, ''MMDDYYYY''),
                    ''B'',
                    po_attribute
                ) AS po_id,
                po_attribute,
                CONCAT(paf.style, ''_'', paf.size, ''_'', 
                    UPPER(LEFT(SPLIT_PART(name, '' '', 2),3)),
                    RIGHT(SPLIT_PART(name, '' '', 1),2),
                    UPPER(LEFT(l2_name,1)),
                    UPPER(LEFT(l1_name,1)),
                    TO_CHAR(editable_expected_receipt_date, ''MMDDYYYY''),
                    ''B'',
                    po_attribute
                ) AS po_detail_id
            FROM inventory_smart.oms_orders_recommended oor
            JOIN global.product_attributes_filter paf USING (product_code)
            JOIN po_attribute_value pav USING (product_code)
            JOIN global.season_master sm
                ON oor.editable_expected_receipt_date BETWEEN sm.season_start_date AND sm.season_end_date
            WHERE oor.id IN (
                SELECT id FROM inventory_smart.oms_orders_recommended 
                WHERE %I::text = ANY($1)
            )
        )
        SELECT
            po_id AS l1_bulk_number,
            l1_name AS channel,
            l2_name AS brand,
            po_id AS bulk_description,
            ''BK'' AS po_type,
            editable_expected_receipt_date::DATE AS delivery_date,
            CASE
                WHEN l1_name = ''E-Commerce'' THEN editable_expected_receipt_date + INTERVAL ''540 days''
                WHEN l1_name = ''Brick __ia_char_13 Mortar'' THEN editable_expected_receipt_date + INTERVAL ''45 days''
            END::DATE AS cancel_date,
            primary_vendor_cd AS vendor_code,
            ''FALSE'' AS is_prepack,
            buy_season,
            year::INTEGER,
            CONCAT(paf.style, ''_'', po_id) AS po_line_id,
            paf.cost::DOUBLE PRECISION,
            paf.style,
            cast(paf.clr_cd as text) AS color,
            po_detail_id,
            order_quantity AS class_log_units,
            paf.sz_rng_dsc AS size_master_code,
            paf.size,
            upc_nbr AS upc,
            CASE
                WHEN l1_name = ''E-Commerce'' THEN ''EC002''
                WHEN UPPER(l2_name) = ''LITTLE PLANET'' AND UPPER(paf.hang_fold_cd) = ''HANGING'' THEN ''HP001''
                WHEN UPPER(l2_name) = ''LITTLE PLANET'' AND UPPER(paf.hang_fold_cd) = ''FOLDED'' THEN ''HA001''
                WHEN UPPER(paf.hang_fold_cd) = ''HANGING'' THEN ''''
                WHEN UPPER(paf.hang_fold_cd) = ''FOLDED'' THEN ''FP002''
                WHEN UPPER(paf.hang_fold_cd) = ''DUAL'' THEN ''DM001''
            END AS dim_code,
            po_attribute,
            NULL AS file_name,
            NULL AS is_deleted
        FROM approved_orders
        JOIN global.product_attributes_filter paf USING (product_code)
        WHERE order_quantity > 0',
        v_column_name
    );

   	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.fetch_order_data','Before returning v query',v_query,jsonb_build_object('filter_criteria', $1));

    -- Execute the query dynamically, passing the values as an array
    RETURN QUERY EXECUTE v_query USING array(SELECT jsonb_array_elements_text(v_values));
END;
$function$
;