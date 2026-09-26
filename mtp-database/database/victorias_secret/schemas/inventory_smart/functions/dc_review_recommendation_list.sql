--liquibase formatted sql
--changeset liquibase:dc_review_recommendation_list runOnChange:true stripComments:false splitStatements:false context:MTP-95543 labels:MTP-95543
--comment: Removed unnecessary ticket_type values from data and updated return format to include label and value.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_review_recommendation_list(refcursor, jsonb, jsonb, varchar, uuid, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.dc_review_recommendation_list(refcursor, jsonb, jsonb, character varying, uuid, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_pa_query text;
_sa_query text;
_pa_sa_query text;
_query_meta_filters text;
_query_combine text;
v_gen_random_uuid text  := gen_random_uuid()::varchar;
v_config JSONB;
v_default_ticket_type TEXT;

begin
    _pa_query := inventory_smart.form_dc_dc_transfer_table_filters('dc_transfer_constraints', $2);
    raise notice '_where: %', _pa_query;

	raise notice 'article: %', $4;

    _sa_query := global.form_main_table_filters('store_attributes_filter', $3);
    IF _sa_query IS NOT NULL AND LENGTH(TRIM(_sa_query)) > 0 THEN
		_sa_query := replace(_sa_query, 'WHERE', 'AND');
    ELSE
        _sa_query := '';
    END IF;

    raise notice '_sa_query: %', _sa_query;

    _query_meta_filters := inventory_smart.form_table_query($6); 
	raise notice '_query_meta_filters: %', _query_meta_filters;

    -- Fetch default config for ticket_type
    SELECT attribute_value
    INTO v_config
    FROM global.tenant_attribute_master
    WHERE name = 'dc_review_recommendation_config' AND status = TRUE;

    v_default_ticket_type := COALESCE(v_config->>'default_ticket_type', '10_Regular Business');

	_query_combine := '
	WITH computed_values AS (
	    WITH allocated_units AS materialized(
			SELECT article, dc_code, size, SUM(quantity) as quantity FROM inventory_smart.sku_dc_allocated_units('''', ''{' || $4 || '}'') GROUP BY article, dc_code, size
		),
		dc_to_dc_available_units AS materialized(
			SELECT * FROM inventory_smart.dc_to_dc_available_units(' || quote_literal($4) || ')
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
					FROM inventory_smart.sku_dc_reserved_units(''{' || $4 || '}'') 
					WHERE type <> ''D'' 
					GROUP BY 1,2,3) sdru
				ON dtda.article = sdru.article AND dtda.size = sdru.size 
				AND dtda.dc_code = sdru.dc_code			
			LEFT JOIN allocated_units sda 
				ON d.article = sda.article AND dtda.size = sda.size 
					AND d.dc_code = sda.dc_code
           WHERE d.article = ' || quote_literal($4) || '
        ),
        forecast_wos AS MATERIALIZED (
         SELECT f.article,
            f.product_code,
            f.dc_code,
            f.fiscal_year_week,
            sum(f.dc_outbound) OVER (PARTITION BY f.article, f.product_code, f.dc_code ORDER BY f.fiscal_year_week) AS cumulative_outbound
           FROM inventory_smart.dc_forecast_week_level f 
           WHERE article = ' || quote_literal($4) || '
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
        metrics_before AS MATERIALIZED (
         SELECT src.article,
            src.product_code,
            src.dc_code AS source_dc,
            dst.dc_code AS destination_dc,
            src.oh_initial AS source_dc_oh_initial,
            dst.oh_initial AS destination_dc_oh_initial,
            src.wos AS source_initial_wos,
            dst.wos AS destination_initial_wos,
            COALESCE(sum(r.excess_units), 0::bigint) AS excess_units,
            COALESCE(sum(r.deficit_units), 0::bigint) AS deficit_units,
            COALESCE(sum(COALESCE(ru.transfer_units, r.ia_reco_transfer)), 0::bigint) AS recommended_transfer_units,
			CASE WHEN ru.article IS NOT NULL THEN True ELSE False END as updated_recommendation,
			ru.attributes->>''ticket_type'' AS ticket_type
           FROM dc_metrics src
             JOIN dc_metrics dst ON src.article::text = dst.article::text 
                AND src.product_code::text = dst.product_code::text 
                AND src.dc_code <> dst.dc_code
             JOIN inventory_smart.dc_review_recommendation r 
                ON src.article::text = r.article::text 
                AND src.product_code::text = r.product_code::text 
                AND src.dc_code = r.source_dc 
                AND dst.dc_code = r.destination_dc
             LEFT JOIN inventory_smart.dc_review_recommendation_updated ru 
                ON src.article::text = ru.article::text 
                AND src.product_code::text = ru.product_code::text 
                AND src.dc_code = ru.source_dc 
                AND dst.dc_code = ru.destination_dc 
                AND ru.dc_transfer_code::varchar = ' || quote_literal($5) || '
          GROUP BY src.article, src.product_code, src.dc_code, dst.dc_code, src.oh_initial, dst.oh_initial, src.wos, dst.wos, ru.article, ru.attributes->>''ticket_type''
        ),
        after_wos AS MATERIALIZED (
         SELECT mb_1.article,
            mb_1.product_code,
            mb_1.source_dc,
            mb_1.destination_dc,
            count(*) FILTER (WHERE f.dc_code = mb_1.source_dc AND (mb_1.source_dc_oh_initial - mb_1.recommended_transfer_units)::double precision >= f.cumulative_outbound) AS source_dc_wos_after,
            count(*) FILTER (WHERE f.dc_code = mb_1.destination_dc AND (mb_1.destination_dc_oh_initial + mb_1.recommended_transfer_units)::double precision >= f.cumulative_outbound) AS destination_dc_wos_after
           FROM metrics_before mb_1
           LEFT JOIN forecast_wos f 
              ON mb_1.article::text = f.article::text 
              AND mb_1.product_code::text = f.product_code::text 
              AND (f.dc_code = mb_1.source_dc OR f.dc_code = mb_1.destination_dc)
          GROUP BY mb_1.article, mb_1.product_code, mb_1.source_dc, mb_1.destination_dc, mb_1.source_dc_oh_initial, mb_1.destination_dc_oh_initial, mb_1.recommended_transfer_units
        ),
        final_transfer_metrics AS MATERIALIZED (
            SELECT mb.article,
                mb.product_code,
                mb.source_dc,
                mb.destination_dc,
                mb.source_dc_oh_initial,
                mb.destination_dc_oh_initial,
                mb.source_initial_wos,
                mb.destination_initial_wos,
                mb.excess_units,
                mb.deficit_units,
                mb.recommended_transfer_units,
                mb.source_dc_oh_initial - mb.recommended_transfer_units AS source_dc_oh_after,
                mb.destination_dc_oh_initial + mb.recommended_transfer_units AS destination_dc_oh_after,
                aw.source_dc_wos_after,
                aw.destination_dc_wos_after,
                mb.updated_recommendation,
				mb.ticket_type
            FROM metrics_before mb
            JOIN after_wos aw 
                ON mb.article::text = aw.article::text 
                AND mb.product_code::text = aw.product_code::text 
                AND mb.source_dc = aw.source_dc 
                AND mb.destination_dc = aw.destination_dc
        ),
        dc_options AS MATERIALIZED (
            SELECT jsonb_agg(jsonb_build_object(
                ''id'', dc_code,
                ''value'', linked_store_code,
                ''label'', linked_store_code
            )) AS dc_options
            FROM (
                SELECT DISTINCT dc_code, name, linked_store_code
                FROM inventory_smart.dc_details_table
                JOIN global.distribution_centres dc USING(dc_code)
            ) b
        ),
		 ticket_type_options AS MATERIALIZED (
		    SELECT jsonb_agg(jsonb_build_object(
		        ''label'', ticket_type,
		        ''value'', ticket_type
		    )) AS ticket_type_options
		    FROM (
		        SELECT DISTINCT ticket_type_ticket_type_description AS ticket_type
		        FROM inventory_smart.ticket_type_master
		        WHERE ticket_type_ticket_type_description IS NOT NULL
		        ORDER BY ticket_type_ticket_type_description
		    ) t
		),
        source_safety_stocks AS MATERIALIZED (
            SELECT product_code, dc_code, SUM(safety_stock) AS safety_stock 
            FROM inventory_smart.dc_details_table 
            WHERE article = ' || quote_literal($4) || '
			GROUP BY 1,2
        ),
        destination_safety_stocks AS MATERIALIZED (
            SELECT product_code, dc_code, SUM(safety_stock) AS safety_stock 
            FROM inventory_smart.dc_details_table 
            WHERE article = ' || quote_literal($4) || '
			GROUP BY 1,2
        ),
        source_dcs AS MATERIALIZED (
            SELECT store_code, dc_code 
            FROM global.store_attributes_filter 
            WHERE dc_flag ' || _sa_query || '
        ),
        destination_dcs AS MATERIALIZED (
            SELECT store_code, dc_code 
            FROM global.store_attributes_filter 
            WHERE dc_flag ' || _sa_query || '
        )
    SELECT 			
			paf.product_code,
			paf.inner_pack_units,
	        drr.article,
	        paf.size AS size,
			ast.order as size_order,
	        case when SUM(drr.ia_reco_transfer) >= SUM(dtc.min_transfer_quantity::INTEGER) or drrv.updated_recommendation then safsdc.store_code else null end as source_dc,
	        case when SUM(drr.ia_reco_transfer) >= SUM(dtc.min_transfer_quantity::INTEGER) or drrv.updated_recommendation then drr.source_dc else null end as source_dc_code,
	        case when SUM(drr.ia_reco_transfer) >= SUM(dtc.min_transfer_quantity::INTEGER) or drrv.updated_recommendation then drr.destination_dc else null end as destination_dc_code,
	        case when SUM(drr.ia_reco_transfer) >= SUM(dtc.min_transfer_quantity::INTEGER) or drrv.updated_recommendation then safddc.store_code else null end as destination_dc,
	        safsdc.store_code as og_source_dc,
	        drr.source_dc og_source_dc_code,
	        drr.destination_dc og_destination_dc_code,
	        safddc.store_code og_destination_dc,
	        ddt.dc_options,
			tto.ticket_type_options,
	        SUM(drrv.excess_units) AS total_source_dc_excess_units,
	        SUM(drrv.deficit_units) AS total_destination_dc_deficit_units,
	        SUM(drr.ia_reco_transfer) AS ia_reco_transfer,
	        SUM(drrv.recommended_transfer_units) AS transfer_units,
	        SUM(source_dc_oh_initial) AS source_dc_oh_initial,
	        SUM(destination_dc_oh_initial) AS destination_dc_oh_initial,
	        SUM(source_initial_wos) AS source_dc_wos_initial,
	        SUM(destination_initial_wos) AS destination_dc_wos_initial,
	        SUM(source_dc_oh_after) AS source_dc_oh_after,
	        SUM(destination_dc_oh_after) AS destination_dc_oh_after,
	        SUM(source_dc_wos_after) AS source_dc_wos_after,
	        SUM(destination_dc_wos_after) AS destination_dc_wos_after,
	        SUM(sds_min_stock.min_stock) AS source_dc_min_stock,
	        SUM(source_safety_stock.safety_stock) AS source_dc_safety_stock_units,
	        SUM(dds_min_stock.min_stock) AS destination_dc_min_stock,
	        SUM(destination_safety_stock.safety_stock) AS destination_dc_safety_stock_units,
	        SUM(drr.source_dc_demand_projection) AS source_dc_demand_projection,
	        SUM(drr.destination_dc_demand_projection) AS destination_dc_demand_projection,
	        SUM(dtc.min_transfer_quantity::INTEGER) AS min_transfer_quantity,
	        SUM(drrv.deficit_units) - SUM(drrv.recommended_transfer_units) AS pending_deficit,
	        SUM(drrv.excess_units) - SUM(drrv.recommended_transfer_units) AS remaining_excess,
	        SUM(SUM(drr.excess_units)) OVER (PARTITION BY drr.article, paf.size) AS total_excess_units,
	        SUM(SUM(drr.deficit_units)) OVER (PARTITION BY drr.article, paf.size) AS total_deficit_units,
	        case when SUM(drr.ia_reco_transfer) >= SUM(dtc.min_transfer_quantity::INTEGER) or drrv.updated_recommendation then True else False end as recommendation_flag,
	        case when SUM(drr.ia_reco_transfer) >= SUM(dtc.min_transfer_quantity::INTEGER) or drrv.updated_recommendation then (drr.article::text || ''-'' || safsdc.store_code || ''-'' || safddc.store_code || ''-true'') else (drr.article || ''-false'') end as key,
	    	jsonb_build_array(jsonb_build_object(
			  ''label'', COALESCE(drru2.attributes->>''ticket_type'', ' || quote_literal(v_default_ticket_type) || '),
			  ''value'', COALESCE(drru2.attributes->>''ticket_type'', ' || quote_literal(v_default_ticket_type) || ')
			)) AS ticket_type
		
		FROM 
	        inventory_smart.dc_review_recommendation drr
	    JOIN 
	        global.product_attributes_filter paf 
	    ON 
	        drr.product_code = paf.product_code
		JOIN 
	        final_transfer_metrics drrv
	    ON 
	        drr.product_code = drrv.product_code 
	        AND drr.source_dc = drrv.source_dc 
	        AND drr.destination_dc = drrv.destination_dc
	    JOIN 
	        inventory_smart.dc_transfer_constraints dtc 
	    ON 
	        drr.product_code = dtc."hierarchy" ->> ''product_code'' 
	        AND drr.source_dc = dtc.source_dc::INTEGER 
	        AND drr.destination_dc = dtc.destination_dc::INTEGER
	    LEFT JOIN 
	        inventory_smart.dc_service_levels sds_min_stock 
	    ON 
	        sds_min_stock."hierarchy" ->> ''product_code'' = drr.product_code 
	        AND sds_min_stock.dc = drr.source_dc
	    LEFT JOIN 
	        inventory_smart.dc_service_levels dds_min_stock 
	    ON 
	        dds_min_stock."hierarchy" ->> ''product_code'' = drr.product_code 
	        AND dds_min_stock.dc = drr.destination_dc
	    LEFT JOIN 
	        source_safety_stocks source_safety_stock
	    ON 
	        source_safety_stock.product_code = drr.product_code 
	        AND source_safety_stock.dc_code = drr.source_dc
	    LEFT JOIN 
	        destination_safety_stocks destination_safety_stock
	    ON 
	        destination_safety_stock.product_code = drr.product_code 
	        AND destination_safety_stock.dc_code = drr.destination_dc
	    LEFT JOIN
			source_dcs safsdc on drr.source_dc = safsdc.dc_code
	    LEFT JOIN 
			destination_dcs safddc on drr.destination_dc = safddc.dc_code
		left join inventory_smart.dc_review_recommendation_updated drru2 on drru2.product_code = drrv.product_code and drru2.article = drrv.article AND drru2.dc_transfer_code::varchar = ' || quote_literal($5) || '
	    LEFT JOIN (
	     SELECT product_code, size, MIN("order") AS order
	     FROM inventory_smart.article_status_tag
	     GROUP BY product_code, size
	    ) ast ON ast.product_code = drr.product_code AND ast.size = paf.size
		cross join dc_options ddt
		cross join ticket_type_options tto
	    WHERE 
	        drr.article = ' || quote_literal($4) || ' and not (drru2.article is not null and updated_recommendation is false)
	    GROUP BY 1,2,3,4, safsdc.store_code, safddc.store_code, drr.source_dc, drr.destination_dc, drrv.updated_recommendation, ddt.dc_options, ast.order, tto.ticket_type_options, drru2.attributes->>''ticket_type''
	)
	SELECT 
	    article,
		' || quote_literal($5) || ' as dc_transfer_code,
		case when recommendation_flag is true then source_dc else null end as source_dc,
		case when recommendation_flag is true then destination_dc else null end as destination_dc,
		case when recommendation_flag is true then destination_dc_code else null end as destination_dc_code,
		case when recommendation_flag is true then source_dc_code else null end as source_dc_code,
		sum(total_excess_units) total_excess_units,
		sum(total_deficit_units) total_deficit_units,
		sum(ia_reco_transfer) ia_recommended_transfer,
		sum(transfer_units) transfer_units,
		recommendation_flag as is_visible,
		key,
		ticket_type,
    	ticket_type_options,
    	(
        SELECT jsonb_agg(
	        jsonb_build_object(
				''key'', (article::text || ''-'' || size::text || ''-'' || og_source_dc || ''-'' || og_destination_dc),
	        	''sourceoptions'', dc_options,
	        	''destinationoptions'', dc_options,
				''source_dc'', og_source_dc,
				''destination_dc'',og_destination_dc,
				''destination_dc_code'',og_destination_dc_code,
				''source_dc_code'',og_source_dc_code,
				''product_code'', product_code,
				''inner_pack_units'', inner_pack_units,
	            ''size'', size,
				''size_order'', size_order,
	            ''total_excess_units'', total_excess_units,
	            ''total_deficit_units'', total_deficit_units,
	            ''total_source_dc_excess_units'', total_source_dc_excess_units,
	            ''total_destination_dc_deficit_units'', total_destination_dc_deficit_units,
	            ''ia_reco_transfer'', ia_reco_transfer,
	            ''transfer_units'', transfer_units,
	            ''pending_deficit'', pending_deficit,
	            ''remaining_excess'', remaining_excess,
	            ''source_dc_oh_initial'', GREATEST(source_dc_oh_initial, 0),
	            ''destination_dc_oh_initial'', destination_dc_oh_initial,
	            ''source_dc_wos_initial'', source_dc_wos_initial,
	            ''destination_dc_wos_initial'', destination_dc_wos_initial,
	            ''source_dc_oh_after'', source_dc_oh_after,
	            ''destination_dc_oh_after'', destination_dc_oh_after,
	            ''source_dc_wos_after'', source_dc_wos_after,
	            ''destination_dc_wos_after'', destination_dc_wos_after,
	            ''source_dc_min_stock'', source_dc_min_stock,
	            ''source_dc_safety_stock_units'', source_dc_safety_stock_units::INTEGER,
	            ''destination_dc_min_stock'', destination_dc_min_stock,
	            ''destination_dc_safety_stock_units'', destination_dc_safety_stock_units::INTEGER,
	            ''source_dc_demand_projection'', source_dc_demand_projection::INTEGER,
	            ''destination_dc_demand_projection'', destination_dc_demand_projection::INTEGER,
	            ''min_transfer_quantity'', min_transfer_quantity,
				''is_visible'', recommendation_flag
	        ) ORDER BY size_order ASC
        )
    ) as data
	FROM computed_values
	GROUP BY article, dc_transfer_code, source_dc, destination_dc, destination_dc_code, source_dc_code, recommendation_flag, key, ticket_type, ticket_type_options
	ORDER BY key LIKE ''%-false'', key';

	_query_combine := 'SELECT * FROM (' || _query_combine || ') as subquery ' || _query_meta_filters;

	raise notice 'query_combine: %', _query_combine;
    open $1 for execute _query_combine;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.dc_review_recommendation_list', 'Before Return',_query_combine,jsonb_build_object('product_filter', $2, 'store_filter', $3, 'article', $4, 'meta_filters', $5));	
	return $1;
END
$function$
;