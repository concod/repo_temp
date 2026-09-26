--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:itemfact_edit_tiers runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfacts_edits_tiers-1
--comment: initial changeset for itemfacts_edits_tiers-1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.itemfact_edit_tiers(date, date, jsonb, jsonb, text, integer, integer);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_tiers(sdate date, edate date, filters jsonb, timephased_edits jsonb, dept text,min_week_timephased integer,max_week_timephased integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    hierarchy_code_var INTEGER;
    updated_row_count INTEGER := 0;
    
    where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    original_channels text[];
    channel_array text[];
    hierarchy_code_list INT[];
    channel TEXT;
    
    itemfact_sku_week_table_name TEXT;
    timephased_edit JSONB;
    current_week_id INTEGER;
    tier JSONB;
    air INTEGER;
    source_var TEXT;
    wp_table_name TEXT;
    iaf_table_name TEXT;
    store_count_diff_percentage DECIMAL;
    old_store_count INTEGER;
    updated_store_count INTEGER;
    store_elasticity DECIMAL;
    written_sales_units_var DECIMAL;
    written_aur_var DECIMAL;
    written_auc_var DECIMAL;
    new_written_sales_units DECIMAL;
    written_sales_units_wp_var DECIMAL;
    written_sales_units_iaf_var DECIMAL;
    new_written_sales_units_wp DECIMAL;
    new_written_sales_units_iaf DECIMAL;
    min_week_id integer;
    max_week_id integer;
    wp_master_update_query TEXT;
    iaf_master_update_query TEXT;
    w2d_query_text TEXT;
    rows_updated_for_w2d integer;
    eop_bop_query_text TEXT;
    rows_updated_for_eop_bop_sync integer;
    fwos_query_text TEXT;
    rows_updated_for_fwos integer;
    reco_receipt_edit_text TEXT;
    rows_updated_for_reco_receipt_edit integer;
    sdate_tp date;
    edate_tp date;
BEGIN
    itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
    wp_table_name := 'item_smart.wp_master_' || dept;
    iaf_table_name := 'item_smart.iaf_master_' || dept; 
    
    -- Convert week IDs to dates if they were passed as integers
    IF min_week_timephased IS NOT NULL AND max_week_timephased IS NOT NULL THEN
        -- Convert fiscal week IDs to actual dates
        EXECUTE format('SELECT MIN(calendar_date), MAX(calendar_date) FROM global.fiscal_date_mapping WHERE fiscal_year_week BETWEEN %L AND %L', 
                      min_week_timephased, max_week_timephased) 
        INTO sdate_tp, edate_tp;
        
        -- Validate conversion was successful
        IF sdate_tp IS NULL OR edate_tp IS NULL THEN
            RAISE WARNING 'Failed to convert week range %-% to dates, falling back to original sdate/edate', min_week_timephased, max_week_timephased;
            sdate_tp := sdate;
            edate_tp := edate;
        ELSE
            RAISE NOTICE 'Converted week range %-% to date range %-%', min_week_timephased, max_week_timephased, sdate_tp, edate_tp;
        END IF;
    ELSE
        -- Use original date parameters if week parameters are NULL
        sdate_tp := sdate;
        edate_tp := edate;
        RAISE NOTICE 'Using original date parameters: %-%', sdate_tp, edate_tp;
    END IF;
    
    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        RAISE NOTICE 'attribute_name: %', attribute_name;

        values := (SELECT string_agg(quote_literal(value), ', ')
                   FROM jsonb_array_elements_text(filter->'value') value);
        operator := filter->>'operator';

        -- Append to the where_clause
        IF where_clause = '' THEN
            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
        ELSE
            where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
        END IF;
    END LOOP;

    RAISE NOTICE 'Generated WHERE clause: %', where_clause;
    RAISE NOTICE 'timephased_edits: %', timephased_edits;

    EXECUTE format(
        'SELECT hierarchy_code, ''mv'' as source FROM item_smart.mv_product_hierarchies_filter WHERE %s 
        UNION ALL 
        SELECT hierarchy_code, ''ph'' as source FROM item_smart.placeholders_info WHERE %s 
        LIMIT 1',
        where_clause, where_clause
    )
    INTO hierarchy_code_var, source_var;

    hierarchy_code_list := ARRAY[hierarchy_code_var];

    EXECUTE format(
        'SELECT ARRAY(
            SELECT DISTINCT channel 
            FROM %s
            WHERE hierarchy_code = %L
        )',
        iaf_table_name,
        hierarchy_code_var
    ) INTO channel_array;

    RAISE NOTICE 'channels %', channel_array;

    original_channels := channel_array; 

    -- Iterate over timephased_edits array
    FOR timephased_edit IN
        SELECT * FROM jsonb_array_elements(timephased_edits)
    LOOP
        current_week_id := (timephased_edit->>'current_week_id')::INTEGER;
        tier := CASE WHEN timephased_edit ? 'tier' THEN timephased_edit->'tier' ELSE NULL END;
        air := CASE WHEN timephased_edit ? 'updated_air' THEN timephased_edit->'updated_air' ELSE NULL END;
        old_store_count := CASE WHEN timephased_edit ? 'tier' AND timephased_edit ? 'old_store_count' THEN timephased_edit->'old_store_count' ELSE NULL END;
        updated_store_count := CASE WHEN timephased_edit ? 'tier' AND timephased_edit ? 'updated_store_count' THEN timephased_edit->'updated_store_count' ELSE NULL END;

        store_count_diff_percentage := CASE 
            WHEN old_store_count IS NOT NULL AND updated_store_count IS NOT NULL AND old_store_count::INTEGER != 0
            THEN ABS((updated_store_count::INTEGER) - (old_store_count::INTEGER))::DECIMAL / (old_store_count::INTEGER)
            ELSE 0 
        END;

        RAISE NOTICE 'store_count_diff_percentage: %', store_count_diff_percentage;

        -- Tier update section
        IF hierarchy_code_var IS NOT NULL AND tier IS NOT NULL THEN
            -- Replace the tier_store_count in the sku_week table for the matching hierarchy_code and current_week_id
            EXECUTE format(
                'SELECT store_elasticity FROM item_smart.store_elasticity WHERE hierarchy_code = %L',
                hierarchy_code_var
            )
            INTO store_elasticity;

            -- Set default store_elasticity if not found
            IF store_elasticity IS NULL THEN
                store_elasticity := 0;
                RAISE NOTICE 'No store_elasticity found for hierarchy_code %, using default value 0', hierarchy_code_var;
            END IF;

            EXECUTE format(
                'UPDATE %s SET tier_store_count = %L::jsonb WHERE hierarchy_code = %L AND current_week = %L',
                itemfact_sku_week_table_name, tier, hierarchy_code_var, current_week_id
            );
            GET DIAGNOSTICS updated_row_count = ROW_COUNT;

            -- Fetch the wp_master row
            EXECUTE format(
                'SELECT written_sales_units FROM %s WHERE hierarchy_code = %L AND current_week = %L',
                wp_table_name, hierarchy_code_var, current_week_id
            )
            INTO written_sales_units_wp_var;

            EXECUTE format(
                'SELECT written_sales_units FROM %s WHERE hierarchy_code = %L AND current_week = %L',
                iaf_table_name, hierarchy_code_var, current_week_id
            )
            INTO written_sales_units_iaf_var;

            IF store_count_diff_percentage != 0 THEN
                RAISE NOTICE 'store_count_diff_percentage is not 0';

                new_written_sales_units_wp := COALESCE(((store_elasticity * store_count_diff_percentage)+1) * COALESCE(written_sales_units_wp_var,0), 0);
                new_written_sales_units_iaf := COALESCE(((store_elasticity * store_count_diff_percentage)+1) * COALESCE(written_sales_units_iaf_var,0), 0);
            ELSE
                new_written_sales_units_wp := COALESCE((store_elasticity + 1) * COALESCE(written_sales_units_wp_var,0), 0);
                new_written_sales_units_iaf := COALESCE((store_elasticity + 1) * COALESCE(written_sales_units_iaf_var,0), 0);
            END IF;

            RAISE NOTICE 'Calculated values - wp: %, iaf: %', new_written_sales_units_wp, new_written_sales_units_iaf;

            wp_master_update_query := format('
                UPDATE %s wp
                SET
                    written_sales_units = %s,
                    written_sales_dollars = COALESCE(wp.written_aur, 0) * COALESCE(%s, 0),
                    written_sales_cost = (COALESCE(%s, 0)*COALESCE(wp.written_auc,0)),
                    written_gm_dollar = (COALESCE(wp.written_aur, 0) * COALESCE(%s, 0)) - (COALESCE(%s, 0)*COALESCE(wp.written_auc,0)),
                    written_gm_perc = (COALESCE((COALESCE(wp.written_aur, 0) * COALESCE(%s, 0)) - (COALESCE(%s, 0)*COALESCE(wp.written_auc,0)), 0)) / NULLIF((COALESCE(wp.written_aur, 0) * COALESCE(%s, 0)), 0)
                WHERE
                    hierarchy_code = %s AND current_week = %s',
                wp_table_name, 
                new_written_sales_units_wp,
                new_written_sales_units_wp,
                new_written_sales_units_wp,
                new_written_sales_units_wp,
                new_written_sales_units_wp,
                new_written_sales_units_wp,
                new_written_sales_units_wp,
                new_written_sales_units_wp,
                hierarchy_code_var, 
                current_week_id
            );

            RAISE NOTICE 'Formed WP_MASTER UPDATE query: %', wp_master_update_query;
            EXECUTE wp_master_update_query;

            RAISE NOTICE 'Updated % rows for current_week_id % with new tier data.', updated_row_count, current_week_id;

            -- Update iaf_master
            iaf_master_update_query := format('
                UPDATE %s iaf
                SET
                    written_sales_units = %s,
                    written_sales_dollars = COALESCE(iaf.written_aur, 0) * COALESCE(%s, 0),
                    written_sales_cost = (COALESCE(%s, 0)*COALESCE(iaf.written_auc,0)),
                    written_gm_dollar = (COALESCE(iaf.written_aur, 0) * COALESCE(%s, 0)) - (COALESCE(%s, 0)*COALESCE(iaf.written_auc,0)),
                    written_gm_perc = (COALESCE((COALESCE(iaf.written_aur, 0) * COALESCE(%s, 0)) - (COALESCE(%s, 0)*COALESCE(iaf.written_auc,0)), 0)) / NULLIF((COALESCE(iaf.written_aur, 0) * COALESCE(%s, 0)), 0)
                WHERE
                    hierarchy_code = %s AND current_week = %s',
                iaf_table_name, 
                new_written_sales_units_iaf,
                new_written_sales_units_iaf,
                new_written_sales_units_iaf,
                new_written_sales_units_iaf,
                new_written_sales_units_iaf,
                new_written_sales_units_iaf,
                new_written_sales_units_iaf,
                new_written_sales_units_iaf,
                hierarchy_code_var, 
                current_week_id
            );

            RAISE NOTICE 'Formed IAF_MASTER UPDATE query: %', iaf_master_update_query;
            EXECUTE iaf_master_update_query;

            RAISE NOTICE 'Updated % rows for current_week_id % with new tier data.', updated_row_count, current_week_id;
        ELSE
            RAISE NOTICE 'No hierarchy_code found for given filters and current_week_id %.', current_week_id;
        END IF;

        -- Air update section
        IF source_var = 'ph' THEN
            IF hierarchy_code_var IS NOT NULL AND air IS NOT NULL THEN
                -- Replace the air_store_count in the sku_week table for the matching hierarchy_code and current_week_id
                EXECUTE format(
                    'UPDATE %s SET air = %L WHERE hierarchy_code = %L AND current_week = %L',
                    itemfact_sku_week_table_name, air, hierarchy_code_var, current_week_id
                );
                GET DIAGNOSTICS updated_row_count = ROW_COUNT;

                EXECUTE format(
                    'UPDATE %s iaf SET
                        written_air = %s,
                        written_aur = %s * (1 - iaf.written_dr_perc),
                        written_sales_dollars = iaf.written_sales_units * (%s * (1 - iaf.written_dr_perc)),
                        written_gm_dollar = (iaf.written_sales_units * (%s * (1 - iaf.written_dr_perc))) - iaf.written_sales_cost,
                        written_gm_perc = ((iaf.written_sales_units * (%s * (1 - iaf.written_dr_perc))) - iaf.written_sales_cost) / 
                                        NULLIF((iaf.written_sales_units * (%s * (1 - iaf.written_dr_perc))), 0),
                        written_imu = 1 - (iaf.written_auc / NULLIF(%s,0))
                    WHERE iaf.hierarchy_code = %s AND iaf.current_week = %s',
                    iaf_table_name,
                    air, air, air, air, air, air, air,
                    hierarchy_code_var,
                    current_week_id
                );

                GET DIAGNOSTICS updated_row_count = ROW_COUNT;
                RAISE NOTICE 'Number of rows updated for IAF line: %', updated_row_count;

                -- Update wp_master
                EXECUTE format(
                    'UPDATE %s wp SET
                        written_air = %s,
                        written_aur = %s * (1 - wp.written_dr_perc),
                        written_sales_dollars = wp.written_sales_units * (%s * (1 - wp.written_dr_perc)),
                        written_gm_dollar = (wp.written_sales_units * (%s * (1 - wp.written_dr_perc))) - wp.written_sales_cost,
                        written_gm_perc = ((wp.written_sales_units * (%s * (1 - wp.written_dr_perc))) - wp.written_sales_cost) / 
                                        NULLIF((wp.written_sales_units * (%s * (1 - wp.written_dr_perc))), 0),
                        written_imu = 1 - (wp.written_auc / NULLIF(%s,0))
                    WHERE wp.hierarchy_code = %s AND wp.current_week = %s',
                    wp_table_name,
                    air, air, air, air, air, air, air,
                    hierarchy_code_var,
                    current_week_id
                );

                GET DIAGNOSTICS updated_row_count = ROW_COUNT;
                RAISE NOTICE 'Number of rows updated for WP_MASTER line: %', updated_row_count;

                FOREACH channel IN ARRAY channel_array LOOP
                    w2d_query_text := format('SELECT item_smart.w2d_edit(%L, %L, %L, %L, %L, %L, %L)', 
                    sdate_tp, edate_tp, filters, dept, channel,'written_sales_units','sku');
                    RAISE NOTICE 'Called w2d_edit for channel: %', channel;
                    EXECUTE w2d_query_text INTO rows_updated_for_w2d;
                END LOOP;

                RAISE NOTICE 'Updated % rows for current_week_id % with new air data.', updated_row_count, current_week_id;
            ELSE
                RAISE NOTICE 'No hierarchy_code found for given filters and current_week_id %.', current_week_id;
            END IF;
        END IF;
    END LOOP;

    IF hierarchy_code_var IS NOT NULL AND tier IS NOT NULL THEN
        RAISE NOTICE 'hierarchy_code_var: %, tier: %', hierarchy_code_var, tier;

        FOREACH channel IN ARRAY channel_array LOOP
            w2d_query_text := format('SELECT item_smart.w2d_edit(%L, %L, %L, %L, %L, %L, %L)', 
            sdate_tp, edate_tp, filters, dept, channel,'written_sales_units','sku');
            RAISE NOTICE 'Called w2d_edit for channel: %', channel;
            EXECUTE w2d_query_text INTO rows_updated_for_w2d;
        END LOOP;

        eop_bop_query_text := format('SELECT item_smart.sync_eop_bop_v3(%L, %L, %L, %L, %L)', 
        sdate_tp, filters, dept,'sku', hierarchy_code_list);
        RAISE NOTICE 'Called eop bop sync';
        EXECUTE eop_bop_query_text INTO rows_updated_for_eop_bop_sync;

        fwos_query_text := format('SELECT item_smart.sync_fwos_v3(%L, %L, %L, %L, %L, %L)', 
        sdate_tp, edate_tp, filters, dept,'sku',hierarchy_code_list);
        RAISE NOTICE 'Called sync fwos';
        EXECUTE fwos_query_text INTO rows_updated_for_fwos;

        reco_receipt_edit_text := format(
            'SELECT item_smart.reco_receipt_edit_itemfacts(%L, %L, %L, %L)',
            filters,               -- filters jsonb
            dept,                  -- dept
            'sku',                 -- planing_level
            hierarchy_code_list
        );
        RAISE NOTICE 'Called reco receipt edit';
        EXECUTE reco_receipt_edit_text INTO rows_updated_for_reco_receipt_edit;
    END IF;

    -- Return the total number of rows updated
    RETURN updated_row_count;
END;
$function$
;