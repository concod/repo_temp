--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_master_plan_with_output_v1 runOnChange:true stripComments:false splitStatements:false context:Release_tz labels:insert_master_plan_with_customised_v1
--comment: changes for insert_master_plan_with_customised_v1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_master_plan_with_output(date, date, character varying[], character varying[], jsonb, character varying, text, integer, text[], text[], text[], text[], integer, integer, integer[], text);
CREATE OR REPLACE FUNCTION item_smart.insert_master_plan_with_output(
    p_start_date date,
    p_end_date date, 
    p_channel character varying[], 
    p_sub_channel character varying[], 
    p_hierarchy_filter jsonb, 
    p_status_str character varying, 
    p_comment_str text, 
    p_created_by_id integer, 
    where_clause_mv text[], 
    where_clause_c_sc text[], 
    where_clause_mv_with_sku_list text[], 
    p_sku_list text[], 
    start_week integer, 
    end_week integer, 
    p_master_plan_attribute_id integer[], 
    p_time_zone text DEFAULT 'US/eastern'::text
    )
 RETURNS TABLE(master_plan_id integer, start_date date, end_date date, channel character varying[], sub_channel character varying[], hierarchy_filter jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_master_plan_attribute_id INTEGER;
    insert_query TEXT;
    hierarchy_code_list_wo_selected_sku_list TEXT[];
    hierarchy_code_count_selected INTEGER;
    hierarchy_code_count_wo_selected_sku_list INTEGER;
    hierarchy_code_list_selected TEXT[];
    where_clause_mv_format TEXT;
    where_clause_c_sc_format TEXT;
    where_clause_mv_with_sku_list_format TEXT;
    columns_list TEXT[];
    param_count INTEGER;
    param_values TEXT;
    col_name TEXT;
    param_list TEXT[];
    p_current_status TEXT;
    v_wp_sales_units NUMERIC;
    v_wp_revenue NUMERIC;
    v_wp_margin NUMERIC;
    -- Query variables for RAISE NOTICE
    query_get_hierarchy_codes_selected TEXT;
    query_get_hierarchy_codes_wo_selected TEXT;
    query_get_hierarchy_count_selected TEXT;
    query_get_hierarchy_count_wo_selected TEXT;
    query_get_current_status TEXT;
    query_get_wp_metrics_update TEXT;
    query_get_wp_metrics_insert TEXT;
BEGIN
    -- Set the time zone
    RAISE NOTICE 'Setting time zone to: %', p_time_zone;
    EXECUTE format('SET TIME ZONE %L', p_time_zone);

    -- Fetch available columns from the table dynamically
    SELECT array_agg(column_name ORDER BY ordinal_position)
    INTO columns_list
    FROM information_schema.columns 
    WHERE table_schema = 'item_smart' 
    AND table_name = 'master_plan_attributes'
    ;
    
    -- Set initial parameter count
    param_count := array_length(columns_list, 1);

    -- if p_master_plan_attribute_id is not null then update the sku_list and counts


    -- Format where clauses
    where_clause_mv_format := array_to_string(where_clause_mv, ' AND ');
    where_clause_c_sc_format := CASE 
        WHEN where_clause_c_sc IS NULL OR array_length(where_clause_c_sc, 1) IS NULL OR array_length(where_clause_c_sc, 1) = 0 
        THEN '' 
        ELSE array_to_string(where_clause_c_sc, ' AND ') 
    END;
    where_clause_mv_with_sku_list_format := array_to_string(where_clause_mv_with_sku_list, ' AND ');

    -- fetch distinct hierarchy_code from mv_product_hierarchies_filter using p_sku_list
    query_get_hierarchy_codes_selected := format($sql$
        SELECT array_agg(DISTINCT hierarchy_code) FROM (
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.mv_product_hierarchies_filter 
                            WHERE %s and %s
                            UNION ALL
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.placeholders_info
                            WHERE %s and %s and is_cadence_generated = true
                        ) combined_hierarchy
    $sql$, where_clause_mv_with_sku_list_format, where_clause_mv_format,
                    where_clause_mv_with_sku_list_format, where_clause_mv_format);
    RAISE NOTICE 'Executing query_get_hierarchy_codes_selected: %', query_get_hierarchy_codes_selected;
    EXECUTE query_get_hierarchy_codes_selected INTO hierarchy_code_list_selected;

    -- fetch distinct hierarchy_code from mv_product_hierarchies_filter using p_sku_list
    query_get_hierarchy_codes_wo_selected := format($sql$
        SELECT array_agg(DISTINCT hierarchy_code) FROM (
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.mv_product_hierarchies_filter 
                            WHERE %s
                            UNION ALL
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.placeholders_info
                            WHERE %s and is_cadence_generated = true
                        ) combined_hierarchy
    $sql$, where_clause_mv_format, where_clause_mv_format);
    RAISE NOTICE 'Executing query_get_hierarchy_codes_wo_selected: %', query_get_hierarchy_codes_wo_selected;
    EXECUTE query_get_hierarchy_codes_wo_selected INTO hierarchy_code_list_wo_selected_sku_list;



    -- fetch count of hierarchy_codes using filters hierarchy_code_list, p_channel, p_sub_channel,between p_start_date and p_end_date and p_hierarchy_filter
    query_get_hierarchy_count_selected := format(
                $sql$
                        SELECT COUNT(DISTINCT hierarchy_code) FROM item_smart.wp_master 
                        WHERE hierarchy_code in (
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.mv_product_hierarchies_filter 
                            WHERE %s and %s
                            UNION ALL
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.placeholders_info
                            WHERE %s and %s and is_cadence_generated = true
                        )
                        %s %s AND current_week BETWEEN %s AND %s
                $sql$, 
                    where_clause_mv_with_sku_list_format, where_clause_mv_format,
                    where_clause_mv_with_sku_list_format, where_clause_mv_format, 
                    CASE WHEN where_clause_c_sc_format != '' THEN 'AND' ELSE '' END,
                    where_clause_c_sc_format, 
                    start_week, 
                    end_week);
    RAISE NOTICE 'Executing query_get_hierarchy_count_selected: %', query_get_hierarchy_count_selected;
    EXECUTE query_get_hierarchy_count_selected INTO hierarchy_code_count_selected;

    -- fetch count of hierarchy_codes using filters hierarchy_code_list, p_channel, p_sub_channel,between p_start_date and p_end_date and p_hierarchy_filter
    query_get_hierarchy_count_wo_selected := format(
                    $sql$
                        SELECT COUNT(DISTINCT hierarchy_code) FROM item_smart.wp_master 
                        WHERE hierarchy_code in (
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.mv_product_hierarchies_filter 
                            WHERE %s
                            UNION ALL
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.placeholders_info
                            WHERE %s and is_cadence_generated = true
                        )
                        %s %s AND current_week BETWEEN %s AND %s
                    $sql$, 
                    where_clause_mv_format, where_clause_mv_format,
                    CASE WHEN where_clause_c_sc_format != '' THEN 'AND' ELSE '' END,
                    where_clause_c_sc_format, 
                    start_week, 
                    end_week);
    RAISE NOTICE 'Executing query_get_hierarchy_count_wo_selected: %', query_get_hierarchy_count_wo_selected;
    EXECUTE query_get_hierarchy_count_wo_selected INTO hierarchy_code_count_wo_selected_sku_list;


    IF array_length(p_master_plan_attribute_id, 1) > 0 THEN
        query_get_current_status := format($sql$
            select status from item_smart.master_plan_status where master_plan_attribute_id = %L
        $sql$, p_master_plan_attribute_id[1]);
        RAISE NOTICE 'Executing query_get_current_status: %', query_get_current_status;
        EXECUTE query_get_current_status INTO p_current_status;
        IF p_current_status IN ('LOCKED','UNLOCKED') THEN

			query_get_wp_metrics_update := format(
                    $sql$
                        SELECT 
                        ROUND(SUM(COALESCE(written_sales_units, 0))::NUMERIC, 2) as wp_sales_units, 
                        ROUND(SUM(COALESCE(written_sales_dollars, 0))::NUMERIC, 2) as wp_revenue, 
                            CASE 
                                WHEN SUM(COALESCE(written_sales_dollars, 0)) = 0 THEN 0 
                                ELSE ROUND((SUM(COALESCE(written_gm_dollar, 0))/SUM(COALESCE(written_sales_dollars, 0))*100)::NUMERIC, 2) 
                            END as wp_margin
                        FROM item_smart.wp_master 
                        WHERE hierarchy_code in (
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.mv_product_hierarchies_filter 
                            WHERE %s and %s
                            UNION ALL
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.placeholders_info
                            WHERE %s and %s and is_cadence_generated = true
                         ) %s %s AND current_week BETWEEN %s AND %s
                    $sql$, 
                        where_clause_mv_with_sku_list_format, where_clause_mv_format,
                        where_clause_mv_with_sku_list_format, where_clause_mv_format, 
                        CASE WHEN where_clause_c_sc_format != '' THEN 'AND' ELSE '' END,
                        where_clause_c_sc_format, 
                        start_week, 
                        end_week);
            RAISE NOTICE 'Executing query_get_wp_metrics_update: %', query_get_wp_metrics_update;
            EXECUTE query_get_wp_metrics_update INTO v_wp_sales_units, v_wp_revenue, v_wp_margin;

            UPDATE item_smart.master_plan_attributes
            SET sku_list = p_sku_list,
                total_item_count = hierarchy_code_count_wo_selected_sku_list,
				wp_sales_units = v_wp_sales_units,
				wp_revenue = v_wp_revenue,
				wp_margin = v_wp_margin,
				hierarchy_codes=hierarchy_code_list_selected
            WHERE item_smart.master_plan_attributes.master_plan_id = p_master_plan_attribute_id[1];
            
            -- Update master_plan_status
            RAISE NOTICE 'Updating master_plan_status for ID: %', p_master_plan_attribute_id[1];
            UPDATE item_smart.master_plan_status 
            SET status = p_status_str, 
                edited_on = NOW(), 
                edited_by = p_created_by_id,
				comment = p_comment_str
            WHERE master_plan_attribute_id = p_master_plan_attribute_id[1];
            RAISE NOTICE 'Updated master_plan_status successfully.';

            -- Insert into master_plan_ledger
            RAISE NOTICE 'Inserting into master_plan_ledger for ID: %', p_master_plan_attribute_id[1];
            INSERT INTO item_smart.master_plan_ledger (master_plan_filters_id, status, comment, edited_on, edited_by,item_count)
            VALUES (p_master_plan_attribute_id[1], p_status_str, p_comment_str, NOW(), p_created_by_id,hierarchy_code_count_selected);
            RAISE NOTICE 'Inserted into master_plan_ledger successfully.';

            -- Update master_plan_action_counts
            RAISE NOTICE 'Updating master_plan_action_counts for ID: %', p_master_plan_attribute_id[1];
            UPDATE item_smart.master_plan_action_counts 
            SET count = hierarchy_code_count_selected
            WHERE mpa_plan_id = p_master_plan_attribute_id[1] AND action_type = p_status_str;
            RAISE NOTICE 'Updated master_plan_action_counts successfully.';
            
            -- Return the updated record
            RAISE NOTICE 'Fetching updated record from master_plan_attributes for ID: %', p_master_plan_attribute_id[1];
            RETURN QUERY
            SELECT 
                mpa.master_plan_id,
                mpa.start_date, 
                mpa.end_date, 
                COALESCE(mpa.channel, ARRAY[]::VARCHAR[]), 
                COALESCE(mpa.sub_channel, ARRAY[]::VARCHAR[]),
                mpa.hierarchy_filter
            FROM item_smart.master_plan_attributes AS mpa
            WHERE mpa.master_plan_id = p_master_plan_attribute_id[1];
            
            RETURN;
        ELSE
            RAISE NOTICE 'Current status is not the same as the new status. Skipping update.';
        END IF;
    END IF;

	-- fetch aggregated written_sales_units, written_sales_dollars, written_gm_perc from wp_master using hierarchy_code_list_selected, where_clause_c_sc_format, start_week, end_week
    query_get_wp_metrics_insert := format(
                    $sql$
                        SELECT 
                            ROUND(SUM(COALESCE(written_sales_units, 0))::NUMERIC, 2) as wp_sales_units, 
                            ROUND(SUM(COALESCE(written_sales_dollars, 0))::NUMERIC, 2) as wp_revenue, 
                            CASE 
                                WHEN SUM(COALESCE(written_sales_dollars, 0)) = 0 THEN 0 
                                ELSE ROUND((SUM(COALESCE(written_gm_dollar, 0))/SUM(COALESCE(written_sales_dollars, 0))*100)::NUMERIC, 2) 
                            END as wp_margin 
                        FROM item_smart.wp_master 
                        WHERE hierarchy_code in (
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.mv_product_hierarchies_filter 
                            WHERE %s and %s
                            UNION ALL
                            SELECT DISTINCT hierarchy_code 
                            FROM item_smart.placeholders_info
                            WHERE %s and %s and is_cadence_generated = true
                         ) %s %s AND current_week BETWEEN %s AND %s
                    $sql$, 
                        where_clause_mv_with_sku_list_format, where_clause_mv_format,
                        where_clause_mv_with_sku_list_format, where_clause_mv_format, 
                        CASE WHEN where_clause_c_sc_format != '' THEN 'AND' ELSE '' END,
                        where_clause_c_sc_format, 
                        start_week, 
                        end_week);
    RAISE NOTICE 'Executing query_get_wp_metrics_insert: %', query_get_wp_metrics_insert;
    EXECUTE query_get_wp_metrics_insert INTO v_wp_sales_units, v_wp_revenue, v_wp_margin;

    RAISE NOTICE 'wp_sales_units: %, wp_revenue: %, wp_margin: %', v_wp_sales_units, v_wp_revenue, v_wp_margin;

    -- Build the INSERT query dynamically
    insert_query := 'INSERT INTO item_smart.master_plan_attributes (start_date, end_date, hierarchy_filter, sku_list, total_item_count,wp_sales_units,wp_revenue,wp_margin,start_week_id,end_week_id,hierarchy_codes';
    
    -- Add channel column if present
    IF p_channel IS NOT NULL AND array_length(p_channel, 1) > 0 THEN
        insert_query := insert_query || ', channel';
    END IF;
    
    -- Add sub_channel column if present
    IF p_sub_channel IS NOT NULL AND array_length(p_sub_channel, 1) > 0 THEN
        insert_query := insert_query || ', sub_channel';
    END IF;

    insert_query := insert_query || ') VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11';

    -- Add channel parameter placeholder if present
    IF p_channel IS NOT NULL AND array_length(p_channel, 1) > 0 THEN
        insert_query := insert_query || ', $12';
    END IF;

    -- Add sub_channel parameter placeholder if present
    IF p_sub_channel IS NOT NULL AND array_length(p_sub_channel, 1) > 0 THEN
        IF p_channel IS NOT NULL AND array_length(p_channel, 1) > 0 THEN
            insert_query := insert_query || ', $13';
        ELSE
            insert_query := insert_query || ', $12';
        END IF;
    END IF;

    insert_query := insert_query || ') RETURNING master_plan_id';

    -- Debugging message for query
    RAISE NOTICE 'Executing query: %', insert_query;

    -- Execute INSERT with appropriate parameters based on what's present
    IF p_channel IS NOT NULL AND array_length(p_channel, 1) > 0 AND p_sub_channel IS NOT NULL AND array_length(p_sub_channel, 1) > 0 THEN
        -- Both channel and sub_channel present
        EXECUTE insert_query INTO v_master_plan_attribute_id USING p_start_date, p_end_date, p_hierarchy_filter, p_sku_list, hierarchy_code_count_wo_selected_sku_list, v_wp_sales_units,v_wp_revenue,v_wp_margin,start_week,end_week,hierarchy_code_list_selected,p_channel, p_sub_channel;
    ELSIF p_channel IS NOT NULL AND array_length(p_channel, 1) > 0 THEN
        -- Only channel present
        EXECUTE insert_query INTO v_master_plan_attribute_id USING p_start_date, p_end_date, p_hierarchy_filter, p_sku_list, hierarchy_code_count_wo_selected_sku_list, v_wp_sales_units,v_wp_revenue,v_wp_margin,start_week,end_week,hierarchy_code_list_selected, p_channel;
    ELSIF p_sub_channel IS NOT NULL AND array_length(p_sub_channel, 1) > 0 THEN
        -- Only sub_channel present
        EXECUTE insert_query INTO v_master_plan_attribute_id USING p_start_date, p_end_date, p_hierarchy_filter, p_sku_list, hierarchy_code_count_wo_selected_sku_list, v_wp_sales_units,v_wp_revenue,v_wp_margin,start_week,end_week,hierarchy_code_list_selected, p_sub_channel;
    ELSE
        -- Neither channel nor sub_channel present
        EXECUTE insert_query INTO v_master_plan_attribute_id USING p_start_date, p_end_date, p_hierarchy_filter, p_sku_list, hierarchy_code_count_wo_selected_sku_list, v_wp_sales_units,v_wp_revenue,v_wp_margin,start_week,end_week,hierarchy_code_list_selected;
    END IF;

    RAISE NOTICE 'Inserted into master_plan_attributes. Generated ID: %', v_master_plan_attribute_id;

    -- Insert into master_plan_status
    RAISE NOTICE 'Inserting into master_plan_status for ID: %', v_master_plan_attribute_id;
    INSERT INTO item_smart.master_plan_status (master_plan_attribute_id, status, created_on, created_by,comment)
    VALUES (v_master_plan_attribute_id, p_status_str, NOW(), p_created_by_id,p_comment_str);
    RAISE NOTICE 'Inserted into master_plan_status successfully.';

    -- Insert into master_plan_ledger
    RAISE NOTICE 'Inserting into master_plan_ledger for ID: %', v_master_plan_attribute_id;
    INSERT INTO item_smart.master_plan_ledger (master_plan_filters_id, status, comment, edited_on, edited_by,item_count)
    VALUES (v_master_plan_attribute_id, p_status_str, p_comment_str, NOW(), p_created_by_id,hierarchy_code_count_selected);
    RAISE NOTICE 'Inserted into master_plan_ledger successfully.';

    -- Insert into master_plan_action_counts
    RAISE NOTICE 'Inserting into master_plan_action_counts for ID: %', v_master_plan_attribute_id;
    INSERT INTO item_smart.master_plan_action_counts (mpa_plan_id, action_type, count)
    VALUES (v_master_plan_attribute_id, p_status_str, hierarchy_code_count_selected);
    RAISE NOTICE 'Inserted into master_plan_action_counts successfully.';

    -- **Fix: Explicitly return the required fields**
    RAISE NOTICE 'Fetching inserted record from master_plan_attributes for ID: %', v_master_plan_attribute_id;
    RETURN QUERY
    SELECT 
        mpa.master_plan_id,
        mpa.start_date, 
        mpa.end_date, 
        COALESCE(mpa.channel, ARRAY[]::VARCHAR[]), 
        COALESCE(mpa.sub_channel, ARRAY[]::VARCHAR[]), 
        mpa.hierarchy_filter
    FROM item_smart.master_plan_attributes AS mpa
    WHERE mpa.master_plan_id = v_master_plan_attribute_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error occurred: %', SQLERRM;
        ROLLBACK;
END;
$function$
;