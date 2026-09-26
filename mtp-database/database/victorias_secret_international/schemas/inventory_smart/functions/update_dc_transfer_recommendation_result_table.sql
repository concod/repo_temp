--liquibase formatted sql
--changeset liquibase:update_dc_transfer_recommendation_result_table_1 runOnChange:true stripComments:false splitStatements:false context:MTP-80390 labels:MTP-80390
--comment: MTP-80390 update_dc_transfer_recommendation_result_table few optimizations added
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_dc_transfer_recommendation_result_table();

CREATE OR REPLACE FUNCTION inventory_smart.update_dc_transfer_recommendation_result_table(_product_filters jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _timezone TEXT;
    _query TEXT;
    _inserted_count INT := 0;
    _query_pa text := '';
    _filtered_articles text := '';
    _partition_name TEXT;
    _partition_exists BOOLEAN;
    _current_ts TIMESTAMPTZ;
    _start_ts TIMESTAMPTZ;
    _end_ts TIMESTAMPTZ;
	_eligible_articles text[];
    _eligible_articles_str text;
BEGIN
    _query_pa := inventory_smart.form_main_table_filters('ph_master', _product_filters);
    RAISE NOTICE '_query_pa: %', _query_pa;
    
    -- Fetch tenant timezone config
    SELECT attribute_value::json->'value'->>'time_zone'
    INTO _timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

    -- Get current timestamp in the UTC timezone
    _current_ts := CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
    
    -- Create partition for current date based on tenant timezone
    _partition_name := 'dc_transfer_recommendation_result_' || to_char(_current_ts, 'YYYYMMDD');
    
    -- Calculate partition boundaries in UTC timezone
    -- Start of the day in UTC timezone
    _start_ts := date_trunc('day', _current_ts);
    -- Start of the next day in UTC timezone
    _end_ts := _start_ts + INTERVAL '1 day';
    
    -- Check if partition exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'inventory_smart'
        AND c.relname = _partition_name
    ) INTO _partition_exists;
    
    -- Create partition if it doesn't exist
    IF NOT _partition_exists THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS inventory_smart.%I PARTITION OF inventory_smart.dc_transfer_recommendation_result 
             FOR VALUES FROM (%L) TO (%L)',
            _partition_name, 
            _start_ts, 
            _end_ts
        );
        RAISE NOTICE 'Created partition % with date range [%, %)', 
            _partition_name, 
            _start_ts, 
            _end_ts;
    END IF;

    -- Populate _eligible_articles with distinct articles from dc_transfer_recommendation_dc_dc_mapping
    SELECT array_agg(DISTINCT article) INTO _eligible_articles FROM inventory_smart.dc_transfer_recommendation_dc_dc_mapping;
    _eligible_articles := coalesce(_eligible_articles, '{}');
    _eligible_articles_str := 'ARRAY[''' || array_to_string(_eligible_articles, ''',''') || ''']';
    raise notice 'resolved articles: %', _eligible_articles;

    _query := format($$
        WITH dc_transfer_recommendation_sn_resolved_filtered as materialized(
            select * 
            from inventory_smart.dc_transfer_recommendation_sn_resolved sn
            join (
                SELECT distinct article
                FROM inventory_smart.ph_master
                %s 
            ) x
            using (article)
            WHERE NOT EXISTS (
                -- Exclude articles that have status 'draft' or 'finalized' on the current date
                SELECT 1 
                FROM inventory_smart.dc_transfer_recommendation_result dtrr
                WHERE type = 'upcoming floorset dc transfer'
                  AND dtrr.created_at >= %L
                  AND dtrr.created_at < %L
                  AND dtrr.article = sn.article
                  AND dtrr.order_status IN (0, 2) -- 0 for draft, 1 for created, 2 for finalized
            )
        )
        --select * from dc_transfer_recommendation_sn_resolved_filtered;
        ,eligible_article_dc_mapping as materialized(
            select distinct 
                article, 
                source_code
            from dc_transfer_recommendation_sn_resolved_filtered
        )
        --select * from eligible_article_dc_mapping;
        ,dc_allocated as materialized (
            SELECT 
                sdau.article,
                ed.source_code,
                size,
                coalesce(quantity, 0) as dc_allocated_qty
            FROM eligible_article_dc_mapping ed
            JOIN global.distribution_centres dc on ed.source_code = dc.linked_store_code
            JOIN (SELECT * FROM inventory_smart.sku_dc_allocated_units('', %s)) sdau using (article, dc_code)
        )
        --select * from dc_allocated;
        ,dc_available as materialized (
            SELECT 
                sdau.article,
                ed.source_code,
                size,
                coalesce(oh, 0) as dc_oh
            FROM eligible_article_dc_mapping ed
            JOIN global.distribution_centres dc on ed.source_code = dc.linked_store_code
            JOIN inventory_smart.sku_dc_available_units sdau using (article, dc_code)
        )
        --select * from dc_available;
        ,dc_reserved as (
            SELECT 
                sdru.article,
                ed.source_code,
                size,
                quantity as reserved_quantity
            FROM eligible_article_dc_mapping ed
            JOIN global.distribution_centres dc on ed.source_code = dc.linked_store_code
            JOIN inventory_smart.sku_dc_reserved_units sdru using (article, dc_code)
        )
        --select * from dc_reserved;
        ,dc_to_rsite_metrics as materialized(
            select dca.article,
                sn.launch_date,
                sn.launch_floorset,
                sn.floorset_start_date,
                sn.floorset_end_date,
                sn.ship_date,
                sn.alert_start_date,
                sn.alert_end_date,
                sn.source_code,
                sn.source_type,
                sn.destination_code,  -- this is a rsite
                sn.destination_type,
                sn.supply_route_name,
                sn.tag,
                dca.size,
                coalesce(dca.dc_oh, 0) as dc_oh,
                coalesce(dcr.reserved_quantity, 0) as reserved_quantity,
                coalesce(dcal.dc_allocated_qty, 0) as dc_allocated_qty,
                coalesce(dca.dc_oh, 0) - coalesce(dcr.reserved_quantity, 0) - coalesce(dcal.dc_allocated_qty, 0) AS net_dc_oh,
                coalesce(a.promised_quantity, 0) as promised_quantity,
                a.store,
                a.allocation_codes
            from dc_available dca
            join dc_transfer_recommendation_sn_resolved_filtered sn using(article, source_code)
            left join dc_reserved dcr using(article, source_code, size)
            left join dc_allocated dcal using(article, source_code, size)
            left join inventory_smart.dc_transfer_recommendation_promised_allocations a on a.article = dca.article and a.size = dca.size and a.store = sn.destination_code
        )
        --select * from dc_to_rsite_metrics order by source_code desc, destination_code, size;
        ,allocation_codes_agg AS (
            SELECT
                article,
                source_code,
                size,
                array_agg(DISTINCT allocation_code) AS allocation_codes
            FROM (
                SELECT
                    dtm.article,
                    dtm.source_code,
                    dtm.size,
                    unnest(dtm.allocation_codes) AS allocation_code
                FROM dc_to_rsite_metrics dtm
                WHERE dtm.allocation_codes IS NOT NULL
            ) flat
            GROUP BY article, source_code, size
        )
        ,dc_metrics AS materialized(
            SELECT
                m.article,
                m.launch_date,
                m.launch_floorset,
                m.floorset_start_date,
                m.floorset_end_date,
                m.ship_date,
                m.alert_start_date,
                m.alert_end_date,
                m.source_code,
                m.source_type,
                m.supply_route_name,
                m.tag,
                m.size,
                MAX(m.net_dc_oh) AS net_dc_oh,
                SUM(m.promised_quantity) AS promised_quantity,
                CASE 
                    WHEN m.tag = 'source' THEN SUM(m.promised_quantity)
                    ELSE GREATEST(SUM(m.promised_quantity) - MAX(m.net_dc_oh), 0)
                END AS need,
                aca.allocation_codes,
                COUNT(DISTINCT m.destination_code) AS partner_count
            FROM
                dc_to_rsite_metrics m
            LEFT JOIN allocation_codes_agg aca
                ON m.article = aca.article
                AND m.source_code = aca.source_code
                AND m.size = aca.size
            GROUP BY
                m.article, m.launch_date, m.launch_floorset, m.floorset_start_date, m.floorset_end_date,
                m.ship_date, m.alert_start_date, m.alert_end_date, m.source_code, m.source_type,
                m.supply_route_name, m.tag, m.size, aca.allocation_codes
        )
        --select * from dc_metrics order by source_code desc, size;
        ,dc_dc_transfer_source_metrics AS (
            select 
                ddt.article,
                ddt.source_code,
                ddt.destination_code,
                size,
                allocation_codes,
                net_dc_oh as source_oh,
                promised_quantity as source_promised_quantity,
                need as source_need,
                partner_count as source_partner_count
            FROM
                inventory_smart.dc_transfer_recommendation_dc_dc_mapping ddt
            LEFT JOIN dc_metrics p
                ON ddt.article = p.article
                AND ddt.source_code = p.source_code
        )
        --select * from dc_dc_transfer_source_metrics order by source_code desc, destination_code, size;
        ,dc_dc_transfer_source_destination_metrics AS (
            select 
                ddts.article,
                ddts.source_code,
                ddts.destination_code,
                ddts.size,
                p.allocation_codes,
                ddts.source_oh,
                ddts.source_promised_quantity,
                ddts.source_need,
                ddts.source_partner_count,
                p.net_dc_oh as destination_oh,
                p.promised_quantity as destination_promised_quantity,
                p.need as destination_need,
                p.partner_count as destination_partner_count
            FROM
                dc_dc_transfer_source_metrics ddts
            JOIN dc_metrics p
                ON ddts.article = p.article
                AND ddts.destination_code = p.source_code
                AND ddts.size = p.size
        )
        --select * from dc_dc_transfer_source_destination_metrics order by source_code desc, destination_code, size;
        ,dc_dc_transfer_final as (
            select 
                article,
                source_code,
                destination_code,
                size,
                allocation_codes,
                source_oh,
                source_promised_quantity,
                source_need,
                source_partner_count,
                destination_oh,
                destination_promised_quantity,
                destination_need,
                destination_partner_count,
                FLOOR(
	                CASE
	                    WHEN SUM(destination_need) OVER (PARTITION BY source_code, size)
	                         > AVG(source_oh) OVER (PARTITION BY source_code, size)
	                    THEN source_oh * (
	                        destination_need /
	                        NULLIF(SUM(destination_need) OVER (PARTITION BY source_code, size), 0)
	                    )
	                    ELSE destination_need
	                END
	            ) AS recommended_transfer_quantity,
				FLOOR(
	                CASE
	                    WHEN SUM(destination_need) OVER (PARTITION BY source_code, size)
	                         > AVG(source_oh) OVER (PARTITION BY source_code, size)
	                    THEN source_oh * (
	                        destination_need /
	                        NULLIF(SUM(destination_need) OVER (PARTITION BY source_code, size), 0)
	                    )
	                    ELSE destination_need
	                END
	            ) AS user_adjusted_transfer_quantity
            from dc_dc_transfer_source_destination_metrics
        )
        ,transfer_data AS (
            SELECT 
                article,
                launch_date,
                launch_floorset,
                floorset_start_date,
                floorset_end_date,
                ship_date,
                order_status,
                type,
                article_date,
                source_code as dc_source,
                destination_code as dc_destination,
                size,
                allocation_codes,
                source_oh,
                destination_oh,
                source_promised_quantity,
                destination_promised_quantity,
                source_need,
                destination_need,
                source_partner_count,
                destination_partner_count,
                recommended_transfer_quantity,
                user_adjusted_transfer_quantity
            FROM dc_dc_transfer_final
            JOIN (
                SELECT DISTINCT 
                    article,
                    launch_date,
                    launch_floorset,
                    floorset_start_date,
                    floorset_end_date,
                    ship_date,
                    1 as order_status,
                    'upcoming floorset dc transfer' as type,
                    article || '_' || current_date::text as article_date
                FROM dc_transfer_recommendation_sn_resolved_filtered
            ) x
            USING(article)
        )
        , delete_query AS (
            DELETE FROM inventory_smart.dc_transfer_recommendation_result
            WHERE (article_date, size, dc_source, dc_destination, type) IN (
                SELECT 
                    article_date, 
                    size, 
                    dc_source, 
                    dc_destination, 
                    type
                FROM transfer_data
            )
            AND created_at >= %L
            AND created_at < %L
            RETURNING *
        )
        INSERT INTO inventory_smart.dc_transfer_recommendation_result (
            article,
            launch_date,
            launch_floorset,
            floorset_start_date,
            floorset_end_date,
            ship_date,
            order_status,
            type,
            article_date,
            dc_source,
            dc_destination,
            size,
            allocation_codes,
            source_oh,
            destination_oh,
            source_promised_quantity,
            destination_promised_quantity,
            source_need,
            destination_need,
            source_partner_count,
            destination_partner_count,
            recommended_transfer_quantity,
            user_adjusted_transfer_quantity
        )
        SELECT 
            article,
            launch_date,
            launch_floorset,
            floorset_start_date,
            floorset_end_date,
            ship_date,
            order_status,
            type,
            article_date,
            dc_source,
            dc_destination,
            size,
            allocation_codes,
            source_oh,
            destination_oh,
            source_promised_quantity,
            destination_promised_quantity,
            source_need,
            destination_need,
            source_partner_count,
            destination_partner_count,
            recommended_transfer_quantity,
            user_adjusted_transfer_quantity
        FROM transfer_data;
    $$, _query_pa, _start_ts, _end_ts, _eligible_articles_str, _start_ts, _end_ts);

    BEGIN
        -- Execute the query and store results in the table
		RAISE NOTICE '--query is ';
		RAISE NOTICE '%', _query;
        EXECUTE _query;
        GET DIAGNOSTICS _inserted_count = ROW_COUNT;
        RAISE NOTICE 'Inserted % rows into dc_transfer_recommendation_result', _inserted_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error during update of dc_transfer_recommendation_result: %', SQLERRM;
    END;
END;
$function$
;
