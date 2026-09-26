--liquibase formatted sql
--changeset liquibase:reporting_excess_inv_article_store_list_temp runOnChange:true stripComments:false splitStatements:false context:Release_1_0_0 labels:Release_1_0_0
--comment: Release_1_0_0
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inv_article_store_list_temp(input refcursor, jsonb, jsonb, integer, integer);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inv_article_store_list_temp(input refcursor, jsonb, jsonb, integer, integer, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_pa TEXT := '';
    _query_sa TEXT := '';
    _query_combine_format TEXT := '';
    _query_combine_count_format TEXT := '';
    _ph_sort TEXT;
    _ph_search TEXT;
    _overall_search TEXT;
    _limit INT;
    _offset INT;
    _sub_limit INT;
    _sub_offset INT;
    _dummy TEXT;
    _sa_search TEXT;
    _formatter JSONB;
    _fiscal_year_week INT;
    _local_formatter JSONB;

    _records_collected INT := NULL;
    _batch_count INT := 1;
	increase_limit int := 10;
    records_accumalated TEXT;

BEGIN
    -- Fetch filters, sorts, and pagination details
    SELECT * 
    FROM inventory_smart.form_search_sort_clause($6, 'product_attributes_filter', 'global') 
    INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;

    -- Fetch store-related filters
    SELECT * 
    FROM inventory_smart.form_search_sort_clause($6, 'store_attributes_filter', 'global') 
    INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;

    -- Prepare query filters
    _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
    _query_sa := global.form_main_table_filters('store_attributes_filter', $3);

    -- Calculate fiscal year week
    SELECT (CAST($5 AS TEXT) || LPAD(CAST($4 AS TEXT), 2, '0'))::INTEGER 
    INTO _fiscal_year_week;

    -- Prepare the count query format
    _query_combine_count_format := $$
        SELECT COUNT(*)
        FROM (
            SELECT article
            FROM "global".product_attributes_filter paf {pa_filter} {pa_search}
            GROUP BY 1
            {limit_final}
        ) sq
    $$;

    -- Create temporary table to store results
--    CREATE TEMP TABLE temp_excess_inv_result (
--        article TEXT,
--        store_code TEXT,
--        fiscal_year INT,
--        fiscal_week INT,
--        product_description TEXT,
--        model_description TEXT,
--        color TEXT,
--        style_color_id TEXT,
--        brand TEXT,
--        supersede_flag TEXT,
--        retail_facility_code TEXT,
--        store_name TEXT,
--        min_stock INT,
--        total_oh INT,
--        total_oo INT,
--        total_it INT,
--        total_week_qty INT,
--        total_ros NUMERIC,
--        total_target_wos INT,
--        total_wos_pred INT,
--        total_execss_inv NUMERIC,
--        total_excess_inv_cost NUMERIC,
--        sum_tot_inv NUMERIC,
--        key TEXT,
--        sub_offset INT,
--        "limit" INT,
--        "offset" INT,
--        sub_limit INT
--    );

    -- Prepare the data selection query format
    _query_combine_format := $$
        WITH paf AS (
            SELECT article, product_description, model_description, color, style_color_id, supersede_flag, brand
            FROM "global".product_attributes_filter paf {pa_filter} {pa_search}
            GROUP BY 1, 2, 3, 4, 5, 6, 7
            ORDER BY article
            {limit_final}
        ),
        saf AS (
            SELECT store_code, store_name, retail_facility_code
            FROM global.store_attributes_filter
            {sa_filter} {sa_search}
        ),
        excess_data_aggregated AS (
            SELECT
                product_hierarchy article,
                store_code,
                COALESCE(SUM(min_stock), 0) AS min_stock,
                COALESCE(SUM(oh), 0) AS total_oh,
                COALESCE(SUM(oo), 0) AS total_oo,
                COALESCE(SUM(it), 0) AS total_it,
                COALESCE(SUM(week_qty), 0) AS total_week_qty,
                COALESCE(ROUND(SUM(ros::numeric), 2), 0) AS total_ros,
                COALESCE(ROUND(AVG(target_wos::numeric))) AS total_target_wos,
                COALESCE(ROUND(AVG(wos_pred::numeric))) AS total_wos_pred,
                COALESCE(ROUND(SUM(excess_inv::numeric), 2), 0) AS total_execss_inv,
                COALESCE(ROUND(SUM(excess_inv_cost::numeric), 2), 0) AS total_excess_inv_cost,
                COALESCE(ROUND(SUM(tot_inv::numeric), 2), 0) AS sum_tot_inv
            FROM inventory_smart.excess_units eu
            JOIN paf ON paf.article = eu.product_hierarchy
            JOIN saf USING(store_code)
            WHERE fiscal_year_week = {fiscal_year_week}
            GROUP BY 1, 2
        ),
        excess_inv AS (
            SELECT
                article,
                edu.store_code,
                {fiscal_year} AS fiscal_year,
                {fiscal_week} AS fiscal_week,
                product_description,
                model_description,
                color,
                style_color_id,
                brand,
                supersede_flag,
                retail_facility_code,
                saf.store_name,
                min_stock,
                total_oh,
                total_oo,
                total_it,
                total_week_qty,
                total_ros,
                total_target_wos,
                total_wos_pred,
                total_execss_inv,
                total_excess_inv_cost,
                sum_tot_inv
            FROM excess_data_aggregated edu
            JOIN paf USING(article)
            JOIN saf USING(store_code)
            {sub_limit_final}
        ),
        result AS (
            SELECT *,
                   CONCAT(article, store_code) key,
                   {sub_offset} + ROW_NUMBER() OVER () AS sub_offset,
                   {limit} AS "limit",
                   {offset} AS "offset",
                   {sub_limit} AS sub_limit
            FROM excess_inv
            ORDER BY sub_offset
        )
        SELECT {select} FROM result
    $$;

    _formatter := json_build_object(
        'pa_filter', _query_pa,
        'sa_filter', _query_sa,
        'pa_search', _ph_search,
        'sa_search', _sa_search,
        'limit', _limit,
        'sub_limit', _sub_limit,
        'offset', _offset,
        'sub_offset', _sub_offset,
        'fiscal_week', $4,
        'fiscal_year', $5,
        'fiscal_year_week', _fiscal_year_week
    );

--     If limit is -1, we fetch all rows without pagination
--    IF _limit = -1 THEN
--        RETURN inventory_smart.fetch_with_pagination(null, _query_combine_format, _query_combine_count_format, _formatter);
--	
--    ELSE
--        WHILE _batch_count > 0 OR _records_collected IS NOT NULL OR _records_collected < _limit LOOP
--     Execute and fetch data for the current batch
--    	INSERT INTO temp_excess_inv_result
--    	SELECT * FROM inventory_smart.fetch_with_pagination(null, _query_combine_format, _query_combine_count_format, _formatter);
--
--    	RAISE NOTICE 'I am here';
--
--     Get the last inserted row's offset, sub_offset, and sub_limit values from where the next batch should continue
--    	SELECT _offset, _sub_offset, _sub_limit
--    	INTO _offset, _sub_offset, _sub_limit
--    	FROM temp_excess_inv_result
--    	ORDER BY sub_offset DESC
--    	LIMIT 1;
--
--    	RAISE NOTICE 'offset, sub_offset, _sub_limit % % %', _offset, _sub_offset, _sub_limit;
--
--     Get the current batch count
--    _local_formatter := json_build_object(
--        'select', '*',
--        'limit_final', format('LIMIT %s OFFSET %s', _sub_limit, _sub_offset),
--        'sub_limit_final', format('LIMIT %s OFFSET %s', _sub_limit, _sub_offset),
--        'limit', _limit,
--        'offset', _offset,
--        'sub_limit', _sub_limit,
--        'sub_offset', _sub_offset
--    );
--
--     Update count query format with correct parameters
--    _query_combine_count_format := inventory_smart.format_with_json(_query_combine_count_format, _formatter || _local_formatter);
--
--     Execute the count query to fetch batch count
--    EXECUTE _query_combine_count_format INTO _batch_count;
--
--     Log the batch count
--    RAISE NOTICE 'Current batch count: %', _batch_count;
--
--	OPEN input FOR 
--        SELECT * 
--        FROM temp_excess_inv_result;
--	return input;
--     Calculate total records so far
--    EXECUTE 'SELECT COUNT(2) FROM temp_excess_inv_result' INTO _records_collected;
--
--     Log total records
--    RAISE NOTICE 'Total records collected: %', _records_collected;
--
--     Check if the loop should exit if no records are found or batch count is 0
--    IF _records_collected IS NULL OR _batch_count IS NULL OR _records_collected = 0 OR _batch_count = 0 THEN
--        RAISE NOTICE 'No records found or batch count is 0. Exiting loop.';
--        EXIT;
--    END IF;
--
--     Adjust pagination offsets and limits for the next batch
--     Increase the offset and sub_offset to continue from where the previous batch left off
--    IF _records_collected <= _limit - _records_collected THEN
--         Increase the offset and set sub_offset back to 0 for the next batch
--        _offset := _offset + _sub_limit;
--        _sub_offset := 0;
--        
--         Adjust the limit if needed (can be based on an external variable, like increase_limit)
--        IF increase_limit THEN
--            _sub_limit := _sub_limit * 2; -- Exponentially increase the sub_limit for quicker data retrieval if required
--        END IF;
--    END IF;
--    
--     Break the loop if the final result set reaches the exact required number
--    IF _records_collected >= _limit THEN
--        EXIT;
--    END IF;
--END LOOP;
--
--         Return the results as a refcursor
--        OPEN input FOR 
--        SELECT * 
--        FROM temp_excess_inv_result 
--        LIMIT _limit;
--		raise notice 'Hey there';

--        RETURN $1;
--    END IF;
        RETURN inventory_smart.fetch_with_pagination_temp($1, _query_combine_format, _query_combine_count_format, _formatter);
end;
$function$
;