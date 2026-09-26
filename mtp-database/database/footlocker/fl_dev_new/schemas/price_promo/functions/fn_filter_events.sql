--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_filter_events runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_filter_events

DROP FUNCTION IF EXISTS price_promo.fn_filter_events;
CREATE OR REPLACE FUNCTION price_promo.fn_filter_events(request_payload jsonb, p_user_id integer)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare
    _query text;

    date_range_where_clause text;

    _filtered_events int[];

    _product_hierarchies_config jsonb;
    
    _store_hierarchies_config jsonb;

    store_hierarchical_where_clause TEXT := '';
	product_hierarchical_where_clause TEXT := '';
    key TEXT;
    val JSONB;
    id_column TEXT;
    clause_parts TEXT[] := ARRAY[]::TEXT[];
	calendar_view_event_id_where_text TEXT := ''; 
	calendar_view_event_hierarchy_where_text TEXT := ''; 

begin
	raise notice 'in fn_filter_events: yes';
    select config_value::jsonb into _product_hierarchies_config 
    from price_promo.tb_tool_configurations
    where module = 'product' and config_name = 'hierarchy_filters';

    select config_value::jsonb into _store_hierarchies_config
    from price_promo.tb_tool_configurations
    where module = 'store' and config_name = 'hierarchy_filters';

    date_range_where_clause := format(
        CASE 
            WHEN request_payload ->> 'show_partially_overlapping_events' = 'true' THEN 
                'start_date <= TO_DATE(%L, ''YYYY-MM-DD'') 
                AND end_date >= TO_DATE(%L, ''YYYY-MM-DD'')'
            ELSE 
                'end_date <= TO_DATE(%L, ''YYYY-MM-DD'') 
                AND start_date >= TO_DATE(%L, ''YYYY-MM-DD'')'
        END,
       request_payload->>'end_date', request_payload->>'start_date'
	);

    IF request_payload ? 'product_hierarchies' THEN

        FOR key IN SELECT jsonb_object_keys(request_payload->'product_hierarchies')
        LOOP
            val := request_payload->'product_hierarchies'->key;

            -- Skip empty or null values
            IF val IS NULL OR (jsonb_typeof(val) = 'array' AND jsonb_array_length(val) = 0) OR val = '""' THEN
                CONTINUE;
            END IF;

            -- Fetch id_column from product_hierarchy_config JSONB
            id_column := (_product_hierarchies_config->key->>'id_column');

            -- Skip if id_column is missing
            IF id_column IS NULL THEN
                CONTINUE;
            END IF;

            -- Use helper function to generate the condition string
            clause_parts := clause_parts || price_promo.fn_get_key_value_str(id_column, val);
        END LOOP;

        -- Assemble final WHERE clause if any filters exist
        IF array_length(clause_parts, 1) > 0 THEN
            product_hierarchical_where_clause := 'where ' ||
                                               array_to_string(clause_parts, ' and ');
        END IF;
    END IF;


	IF request_payload ? 'store_hierarchies' THEN
		
		clause_parts = ARRAY[]::TEXT[];
		FOR key IN SELECT jsonb_object_keys(request_payload->'store_hierarchies')
        LOOP
            val := request_payload->'store_hierarchies'->key;

            -- Skip empty or null values
            IF val IS NULL OR (jsonb_typeof(val) = 'array' AND jsonb_array_length(val) = 0) OR val = '""' THEN
                CONTINUE;
            END IF;

            -- Fetch id_column from store_hierarchy_config JSONB
            id_column := (_store_hierarchies_config->key->>'id_column');

            -- Skip if id_column is missing
            IF id_column IS NULL THEN
                CONTINUE;
            END IF;

            -- Use helper function to generate the condition string
            clause_parts := clause_parts || price_promo.fn_get_key_value_str(id_column, val);
        END LOOP;

        -- Assemble final WHERE clause if any filters exist
        IF array_length(clause_parts, 1) > 0 THEN
            store_hierarchical_where_clause := 'where ' ||
                                               array_to_string(clause_parts, ' and ');
        END IF;
	END IF;

    IF jsonb_array_length(COALESCE(request_payload->'event_ids', '[]'::jsonb)) > 0 THEN
        calendar_view_event_id_where_text = format('A.event_id = any(array%1$s)', request_payload->'event_ids');
        date_range_where_clause = '';
    ELSE
        calendar_view_event_hierarchy_where_text := '
            INNER JOIN product_filtered_events B ON A.event_id = B.event_id
            INNER JOIN store_filtered_events C ON A.event_id = C.event_id';
    END IF;

    _query := format('
            with product_filtered_events as (
                select 
                    distinct A.event_id 
                from 
                    price_promo.event_product_hierarchy A
                inner join
                    price_promo.tb_product_hierarchy_combination B on A.hierarchy_id = B.hierarchy_id 
                inner join
                    price_promo.fn_get_user_restricted_products(%6$L) up on up.hierarchy_id = B.hierarchy_id
                %4$s
            ),
            store_filtered_events as (
                select 
                    distinct A.event_id 
                from 
                    price_promo.event_store_hierarchy A
                inner join
                    pricesmart.tb_store_master B on A.hierarchy_id = B.hierarchy_id 
                %5$s
            ),
            final_eligible_events as (
                select
                    A.event_id
                from
                    price_promo.event_master A
                    %1$s
                where
                    %2$s
                    %3$s
                    and A.is_deleted = 0
            )
            select array_agg(event_id) from final_eligible_events
    ',  calendar_view_event_hierarchy_where_text, 
        calendar_view_event_id_where_text, 
        date_range_where_clause, 
        product_hierarchical_where_clause,
        store_hierarchical_where_clause,
        p_user_id
    );

    raise notice 'query: %', _query;

    execute _query into _filtered_events;

    return coalesce(_filtered_events, array[-1]::integer[]);
end;

$function$
;
