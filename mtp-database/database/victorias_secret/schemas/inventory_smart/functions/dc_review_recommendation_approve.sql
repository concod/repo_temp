--liquibase formatted sql
--changeset liquibase:dc_review_recommendation_approve runOnChange:true stripComments:false splitStatements:false context:MTP-94769 labels:MTP-94769
--comment: DC Review Recommendation Approve SP updated to include ticket_type in attributes.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_review_recommendation_approve(refcursor, jsonb, text[], jsonb, jsonb, integer, uuid, integer);

CREATE OR REPLACE FUNCTION inventory_smart.dc_review_recommendation_approve(product_filter jsonb, store_filter jsonb, non_reviewed_articles text[], reviewed_articles jsonb, user_id integer, dc_transfer_code uuid, status_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
    _pa_query text;
    _sa_query text;
    _pa_sa_query text;
    _insert_reviewed_articles text;
    _insert_non_reviewed_articles text;
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    v_transfer_number text;
	v_l0_name text;
    v_config JSONB;
    v_default_ticket_type TEXT;
begin
   /*

    "reviewed_article": [
        {
            "article": "123456",
            "product_code": "123456",
            "source_dc": "123456",
            "destination_dc": "123456",
            "transfer_units": 10
        },
        {
            "article": "1234567",
            "product_code": "1234567",
            "source_dc": "1234567",
            "destination_dc": "1234567",
            "transfer_units": 10
        }
    ],
    "non_reviewed_article": ["1234568", "1234569"],
    "status_code": 3
    "dc_transfer_code": "1234567890"
    "user_id": 1
    
    */

    -- Fetch default config for ticket_type
    SELECT attribute_value
    INTO v_config
    FROM global.tenant_attribute_master
    WHERE name = 'dc_review_recommendation_config' AND status = TRUE;

    v_default_ticket_type := COALESCE(v_config->>'default_ticket_type', '10_Regular Business');

    _pa_query := inventory_smart.form_dc_dc_transfer_table_filters('dc_transfer_constraints', product_filter);

    v_l0_name := trim(both '"' from (regexp_matches(_pa_query, 'l0_name''::varchar = any\(''\{(.*?)\}''', 'i'))[1]);
	raise notice 'v_l0_name %', v_l0_name;

    _sa_query := global.form_main_table_filters('store_attributes_filter', store_filter);
    
    IF _sa_query IS NOT NULL AND LENGTH(TRIM(_sa_query)) > 0 THEN
        _sa_query := replace(_sa_query, 'WHERE', 'AND');
    ELSE
        _sa_query := '';
    END IF;

	raise notice 'reviewed_articles: %', reviewed_articles;

    IF reviewed_articles IS NOT NULL AND reviewed_articles != '{}' AND reviewed_articles != 'null' THEN

        v_transfer_number := 'DC_Transfer_6_' || user_id::text || '_' || 
                (reviewed_articles[0]->>'l0_name') || '_' || 
                to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS');

        _insert_reviewed_articles := '
            INSERT INTO inventory_smart.dc_review_recommendation_updated 
            (article, product_code, source_dc, destination_dc, transfer_units, status_code, dc_transfer_code,
            source_adj_wos, destination_adj_wos, transfer_number, source_cata_before_transfer, created_by, updated_by, updated_at,
			"attributes")
            SELECT 
                (value->>''article'')::text,
                (value->>''product_code'')::text,
                (value->>''source_dc_code'')::integer,
                (value->>''destination_dc_code'')::integer,
                (value->>''transfer_units'')::integer,
                ' || status_code || ',
                ''' || dc_transfer_code || '''::uuid,
                (value->>''source_dc_wos_after'')::integer,
                (value->>''destination_dc_wos_after'')::integer,
                ''' || v_transfer_number || '''::text,
                (value->>''source_dc_oh_initial'')::integer,
                ' || user_id || ',
                NULL,
                now(),
				jsonb_build_object(''ticket_type'', COALESCE((value->''attributes''->>''ticket_type'')::TEXT, ''' || v_default_ticket_type || '''::TEXT))
			FROM jsonb_array_elements('|| quote_literal(reviewed_articles) ||')
            ON CONFLICT (dc_transfer_code, product_code, source_dc, destination_dc)
            DO UPDATE SET 
                transfer_units = EXCLUDED.transfer_units,
                status_code = EXCLUDED.status_code,
                source_adj_wos = EXCLUDED.source_adj_wos,
                destination_adj_wos = EXCLUDED.destination_adj_wos,
                transfer_number = EXCLUDED.transfer_number,
                source_cata_before_transfer = EXCLUDED.source_cata_before_transfer,
                updated_by = ' || user_id || ',
                updated_at = EXCLUDED.updated_at,
				"attributes" = jsonb_set(EXCLUDED."attributes", ''{ticket_type}'', 
                    TO_JSONB(COALESCE(EXCLUDED."attributes"->>''ticket_type'', ''' || v_default_ticket_type || '''::TEXT)), TRUE)';
        
        RAISE NOTICE '_insert_reviewed_articles : %', _insert_reviewed_articles;
        EXECUTE _insert_reviewed_articles;
    END IF;

    IF non_reviewed_articles IS NOT NULL AND non_reviewed_articles != '{}' THEN
        v_transfer_number := 'DC_Transfer_6_' || user_id::text || '_' || 
                v_l0_name || '_' || 
                to_char(now() at time zone 'UTC', 'YYYYMMDD"T"HH24MISS');

        _insert_non_reviewed_articles := '
            WITH article_list AS (
                SELECT UNNEST(' || quote_literal(non_reviewed_articles) || '::text[]) as article
            ),
            allocated_units AS materialized (
                SELECT article, dc_code, size, SUM(quantity) as quantity FROM inventory_smart.sku_dc_allocated_units('''', (SELECT array_agg(article) FROM article_list)) GROUP BY article, dc_code, size
            ),
            dc_to_dc_available_units AS materialized (
                SELECT * FROM inventory_smart.dc_to_dc_available_units((SELECT string_agg(article, '','')::varchar FROM article_list))
            ),
            initial_oh AS MATERIALIZED (
                SELECT 
                    d.article,
                    d.product_code,
                    d.dc_code,
                    COALESCE(dtda.oh, 0) - COALESCE(sdru.quantity, 0) - COALESCE(sda.quantity, 0) AS oh_initial
                FROM inventory_smart.dc_details_table d
                LEFT JOIN dc_to_dc_available_units dtda 
                    USING(article, product_code, dc_code)
                LEFT JOIN (SELECT article, size, dc_code, SUM(quantity) AS quantity 
                        FROM inventory_smart.sku_dc_reserved_units((SELECT array_agg(article) FROM article_list))  
                        WHERE type <> ''D'' 
                        GROUP BY 1,2,3) sdru
                    ON dtda.article = sdru.article AND dtda.size = sdru.size 
                    AND dtda.dc_code = sdru.dc_code            
                LEFT JOIN allocated_units sda 
                    ON d.article = sda.article AND dtda.size = sda.size 
                    AND d.dc_code = sda.dc_code
                WHERE d.article = ANY(' || quote_literal(non_reviewed_articles) || ')
            ),
            forecast_wos AS MATERIALIZED (
                SELECT f.article,
                    f.product_code,
                    f.dc_code,
                    f.fiscal_year_week,
                    sum(f.dc_outbound) OVER (PARTITION BY f.article, f.product_code, f.dc_code ORDER BY f.fiscal_year_week) AS cumulative_outbound
                FROM inventory_smart.dc_forecast_week_level f 
                WHERE article = ANY(' || quote_literal(non_reviewed_articles) || ')
            ),
            dc_metrics AS MATERIALIZED (
                SELECT i.article,
                    i.product_code,
                    i.dc_code,
                    i.oh_initial,
                    count(*) FILTER (WHERE i.oh_initial::double precision >= f.cumulative_outbound) AS wos
                FROM initial_oh i
                LEFT JOIN forecast_wos f 
                    ON f.article::text = i.article::text 
                    AND f.product_code::text = i.product_code::text 
                    AND f.dc_code = i.dc_code
                GROUP BY i.article, i.product_code, i.dc_code, i.oh_initial
            ),
            transfer_base AS MATERIALIZED (
                SELECT 
                    src.article,
                    src.product_code,
                    src.dc_code AS source_dc,
                    dst.dc_code AS destination_dc,
                    src.oh_initial AS source_dc_oh_initial,
                    dst.oh_initial AS destination_dc_oh_initial,
                    src.wos AS source_initial_wos,
                    dst.wos AS destination_initial_wos,
                    COALESCE(sum(r.ia_reco_transfer), 0::bigint) AS recommended_transfer_units
                FROM dc_metrics src
                JOIN dc_metrics dst 
                    ON src.article::text = dst.article::text 
                    AND src.product_code::text = dst.product_code::text 
                    AND src.dc_code <> dst.dc_code
                JOIN inventory_smart.dc_review_recommendation r 
                    ON src.article::text = r.article::text 
                    AND src.product_code::text = r.product_code::text 
                    AND src.dc_code = r.source_dc 
                    AND dst.dc_code = r.destination_dc
                GROUP BY 
                    src.article, src.product_code, 
                    src.dc_code, dst.dc_code,
                    src.oh_initial, dst.oh_initial,
                    src.wos, dst.wos
            ),
            transfer_metrics AS MATERIALIZED (
                SELECT 
                    tb.*,
                    count(*) FILTER (
                        WHERE f.dc_code = tb.source_dc 
                        AND (tb.source_dc_oh_initial - tb.recommended_transfer_units)::double precision >= f.cumulative_outbound
                    ) AS source_dc_wos_after,
                    count(*) FILTER (
                        WHERE f.dc_code = tb.destination_dc 
                        AND (tb.destination_dc_oh_initial + tb.recommended_transfer_units)::double precision >= f.cumulative_outbound
                    ) AS destination_dc_wos_after
                FROM transfer_base tb
                LEFT JOIN forecast_wos f 
                    ON tb.article::text = f.article::text 
                    AND tb.product_code::text = f.product_code::text 
                    AND (f.dc_code = tb.source_dc OR f.dc_code = tb.destination_dc)
                GROUP BY 
                    tb.article, tb.product_code, 
                    tb.source_dc, tb.destination_dc,
                    tb.source_dc_oh_initial, tb.destination_dc_oh_initial,
                    tb.source_initial_wos, tb.destination_initial_wos,
                    tb.recommended_transfer_units
            )
            INSERT INTO inventory_smart.dc_review_recommendation_updated 
            (article, product_code, source_dc, destination_dc, transfer_units, status_code, dc_transfer_code,
            source_adj_wos, destination_adj_wos, transfer_number, source_cata_before_transfer, created_by, updated_by, updated_at,
			"attributes")
            SELECT DISTINCT ON (tm.product_code, tm.source_dc, tm.destination_dc)
                tm.article,
                tm.product_code,
                tm.source_dc,
                tm.destination_dc,
                CASE 
                    WHEN tm.recommended_transfer_units > tm.source_dc_oh_initial 
                    THEN tm.source_dc_oh_initial 
                    ELSE tm.recommended_transfer_units 
                END AS transfer_units,
                ' || status_code || ',
                ''' || dc_transfer_code || '''::uuid,
                tm.source_dc_wos_after,
                tm.destination_dc_wos_after,
                ''' || v_transfer_number || '''::text,
                tm.source_dc_oh_initial,
                ' || user_id || ',
                NULL,
                now(),
				jsonb_build_object(''ticket_type'', ''' || v_default_ticket_type || '''::TEXT)
            FROM transfer_metrics tm
            JOIN global.store_attributes_filter saf 
                ON tm.source_dc = saf.dc_code
            WHERE tm.recommended_transfer_units > 0 ' || _sa_query || '
            ORDER BY tm.product_code, tm.source_dc, tm.destination_dc, tm.article
            ON CONFLICT (dc_transfer_code, product_code, source_dc, destination_dc)
            DO UPDATE SET 
                article = EXCLUDED.article,
                transfer_units = EXCLUDED.transfer_units,
                status_code = EXCLUDED.status_code,
                source_adj_wos = EXCLUDED.source_adj_wos,
                destination_adj_wos = EXCLUDED.destination_adj_wos,
                transfer_number = EXCLUDED.transfer_number,
                source_cata_before_transfer = EXCLUDED.source_cata_before_transfer,
                updated_by = ' || user_id || ',
                updated_at = EXCLUDED.updated_at,
				"attributes" = jsonb_build_object(''ticket_type'', ''' || v_default_ticket_type || '''::TEXT)';
        RAISE NOTICE '_insert_non_reviewed_articles : %', _insert_non_reviewed_articles;
        EXECUTE _insert_non_reviewed_articles;
    END IF;   

    perform global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_review_recommendation_approve', 'Operation Complete', null,
        jsonb_build_object(
            'product_filter', product_filter, 
            'store_filter', store_filter, 
            'non_reviewed_articles', non_reviewed_articles,
            'status_code', status_code,
            'dc_transfer_code', dc_transfer_code,
            'user_id', user_id
        )
    ); 

END
$function$
; 