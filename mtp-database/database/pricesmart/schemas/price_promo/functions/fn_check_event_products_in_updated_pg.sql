--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_check_event_products_in_updated_pg runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_check_event_products_in_updated_pg

DROP FUNCTION if exists price_promo.fn_check_event_products_in_updated_pg;

CREATE OR REPLACE FUNCTION price_promo.fn_check_event_products_in_updated_pg(
    _event_id integer,
    _hierarchy_data jsonb,
    _product_ids integer[]
)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
    _product_hierarchies_config jsonb;
    _hierarchy_mapping_dict jsonb;
    hierarchy_combination_where text := '';
    hierarchy_product_ids integer[];
    event_product_ids integer[];
    mismatched_product_ids integer[];
    inclusion_type text;
    exclusion_type text;
    _query text;
    hierarchy_key text;
    hierarchy_value jsonb;
    _product_hierarchies_where_clause text[];
    
BEGIN
    SELECT product_inclusion_type, product_exclusion_type 
    INTO inclusion_type, exclusion_type 
    FROM price_promo.event_master 
    WHERE event_id = _event_id;
    
    
    RAISE NOTICE 'Event product selection type: %, exclusion type: %', inclusion_type, exclusion_type;
    
    IF _product_ids IS NOT NULL AND array_length(_product_ids::integer[], 1) > 0 THEN
        hierarchy_product_ids := _product_ids;
        RAISE NOTICE 'Using provided product_ids: %', array_length(hierarchy_product_ids, 1);
    ELSE
        SELECT config_value::jsonb INTO _product_hierarchies_config 
        FROM price_promo.tb_tool_configurations
        WHERE module = 'product' AND config_name = 'hierarchy_filters';
    
        _hierarchy_mapping_dict = (
            SELECT jsonb_object_agg(
                value->>'id', value->>'id_column'
            )
            FROM jsonb_each(_product_hierarchies_config)
            WHERE (value->>'id')::INTEGER IS NOT NULL
        );
        
        RAISE NOTICE 'Hierarchy mapping dict: %', _hierarchy_mapping_dict;
        
        FOR hierarchy_key, hierarchy_value IN 
            SELECT * FROM jsonb_each(_hierarchy_data)
        LOOP
            IF hierarchy_value IS NOT NULL AND hierarchy_value != '[]' THEN
                _product_hierarchies_where_clause := array_append(
                    _product_hierarchies_where_clause,
                    format(
                        '%1$s = any(array%2$s)',
                        (_product_hierarchies_config->hierarchy_key)->>'id_column',
                        hierarchy_value::text
                    )
                );
            END IF;
        END LOOP;
        
        IF array_length(_product_hierarchies_where_clause, 1) = 0 THEN
            RETURN false;
        END IF;
        
        hierarchy_combination_where := array_to_string(_product_hierarchies_where_clause, ' AND ');
        
        _query := format('
            SELECT array_agg(DISTINCT phlc.product_id)
            FROM price_promo.product_master phlc
            WHERE %s and is_active = 1
        ', hierarchy_combination_where);
        
        RAISE NOTICE 'Hierarchy products query: %', _query;
        EXECUTE _query INTO hierarchy_product_ids;
        
        
        RAISE NOTICE 'Products under hierarchies: %', array_length(hierarchy_product_ids, 1);
    END IF;
    
    SELECT array_agg(DISTINCT product_id)
    INTO event_product_ids
    FROM price_promo.event_product 
    WHERE event_id = _event_id;
    
    IF event_product_ids IS NULL OR array_length(event_product_ids, 1) = 0 THEN
        RETURN false;
    END IF;
    
    RAISE NOTICE 'Event products: %', array_length(event_product_ids, 1);
    
    SELECT array_agg(DISTINCT phlc.product_id)
    INTO mismatched_product_ids
    FROM price_promo.product_master phlc
    WHERE phlc.product_id = ANY(hierarchy_product_ids)
    AND phlc.product_id NOT IN (
        SELECT unnest(event_product_ids)
    );
    
    IF mismatched_product_ids IS NOT NULL AND array_length(mismatched_product_ids, 1) > 0 THEN
        RAISE NOTICE 'Mismatched products found: %', mismatched_product_ids;
        RETURN false;
    ELSE
        RAISE NOTICE 'All hierarchy products are in event selection';
        RETURN true;
    END IF;
    
END;
$function$;