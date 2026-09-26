--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_competitor_positioning_summary_cards stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_competitor_positioning_summary_cards

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_competitor_positioning_summary_cards;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_competitor_positioning_summary_cards(p_segment_id integer DEFAULT 10001)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Dynamic SQL components
    v_base_select_columns TEXT;
    v_competitor_columns TEXT;
    v_case_statements TEXT;
    v_competitor_in_list TEXT;
    v_sql_query TEXT;
    v_mv_name TEXT;
	psam_select_clause_1 TEXT;
	psam_select_clause_2 TEXT;
	psam_select_clause_3 TEXT;
BEGIN
    -- Generate materialized view name
    v_mv_name := 'mv_competitor_positioning_summary_cards';
    
    -- Build competitor columns dynamically from metadata
    SELECT 
        STRING_AGG(database_column, ', '),
        STRING_AGG(
		    format('WHEN ''%s'' THEN bd.%s', database_column, database_column),
		    ' '
		),
        STRING_AGG(quote_literal(database_column), ', ')
    INTO 
        v_competitor_columns,
        v_case_statements,
        v_competitor_in_list
    FROM base_pricing_restaurant.bp_competitor_attributes_metadata
    WHERE is_active = true
      AND database_column IS NOT NULL
      AND database_column != '';
	
	   SELECT
        STRING_AGG(
            format('COALESCE(psam.%I, 0) AS %I', database_column, database_column),
            ', '
        ),
        STRING_AGG(
            format('ROUND(uc.%I::NUMERIC, 2) AS %I', database_column, database_column),
            ', '
        ),
        STRING_AGG(
            format('%I', database_column),
            ', '
        )
   INTO
        psam_select_clause_1,
        psam_select_clause_2,
        psam_select_clause_3
   FROM base_pricing_restaurant.bp_product_store_attributes_metadata
   WHERE is_active = true
     AND database_column IS NOT NULL
     AND attribute_name IN ('price');

    -- Construct the materialized view creation SQL
    v_sql_query := format(
        $fmt$
        CREATE MATERIALIZED VIEW base_pricing_restaurant.%I AS -- v_mv_name
        WITH base_data AS (
            SELECT
                psam.product_id,
                psam.store_id,
                %s, --psam_select_clause_1
                %s -- v_competitor_columns
            FROM
                base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psam
            WHERE
                psam.segment_id = %s -- p_segement_id
                AND psam.attribute_10 <> 'N'
        ),
        transaction_data AS (
            SELECT
                btda.product_id,
                btda.store_id,
                btda.sales_units
            FROM
                base_pricing_restaurant.bp_transaction_data_agg btda
            WHERE
                btda.segment_id = %L -- p_segment_id
        ),
        unpivoted_competitors AS (
            SELECT
                bd.product_id,
                bd.store_id,
                bd.attribute_4,
                bcam.attribute_name AS competitor_name,
                bcam.frontend_display_name AS competitor_display_name,
                CASE bcam.database_column
                    %s -- v_case_statements
                END AS competitor_price
            FROM
                base_data bd
            INNER JOIN base_pricing_restaurant.bp_competitor_attributes_metadata bcam
                ON bcam.database_column IN (%s) -- v_competitor_list
                AND bcam.is_active = true
            WHERE 
                CASE bcam.database_column
                    %s	-- v_case_statements
                END IS NOT NULL
        ),
        joined_data AS (
            SELECT
                uc.product_id,
                uc.store_id,
               	%s, -- psam_select_clause_2
                ROUND(uc.competitor_price::NUMERIC, 2) AS competitor_price,
                uc.competitor_name,
                uc.competitor_display_name,
                COALESCE(ROUND(td.sales_units::NUMERIC, 2), 0) AS sales_units
            FROM
                unpivoted_competitors uc
            LEFT JOIN transaction_data td ON
                uc.product_id = td.product_id
                AND uc.store_id = td.store_id::integer
        )
        SELECT
            product_id,
            store_id,
            %s, --psam_select_clause_3
            COALESCE(competitor_price, 0.0) AS competitor_price,
            competitor_name,
            competitor_display_name,
            sales_units AS sales_units
        FROM
            joined_data
        $fmt$,
        v_mv_name,              -- %I for materialized view name (FIRST placeholder)
		psam_select_clause_1,	-- %s psam_select_clause_1 Dynamic Attribute Clause
		v_competitor_columns,   -- %s for competitor columns
		p_segment_id,           -- %s for segment_id in base_data
		p_segment_id,      		-- %L for segment_id in transaction_data
		v_case_statements,      -- %s for CASE statements
		v_competitor_in_list,   -- %s for IN clause
		v_case_statements,		-- %s for CASE statements
		psam_select_clause_2,	-- %s psam_select_clause_2 Dynamic Attribute Clause	
		psam_select_clause_3	-- %s psam_select_clause_3 Dynamic Attribute Clause
    );

    -- Drop the materialized view if it exists
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS base_pricing_restaurant.%I', v_mv_name);
    
    -- Create the materialized view
    EXECUTE v_sql_query;
	
	EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_product_store 
                ON base_pricing_restaurant.%I(product_id, store_id)', 
                v_mv_name, v_mv_name);
    
    RAISE NOTICE 'Materialized view base_pricing_restaurant.% created successfully ✅', v_mv_name;
END;
$function$
;