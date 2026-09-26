--liquibase formatted sql
--changeset akshay.jain:distinct_rules_mapped_to_store_sb_version runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-126587
--comment: initial changeset for distinct_rules_mapped_to_store
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.distinct_rules_mapped_to_store(refcursor, text, text[], jsonb);
DROP FUNCTION IF EXISTS global.distinct_rules_mapped_to_store(refcursor, text, text[], jsonb, text);
CREATE OR REPLACE FUNCTION global.distinct_rules_mapped_to_store(refcursor, text, text[], jsonb, text DEFAULT NULL)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_final varchar;
_query_meta_filters text;
_where_clause text;
_query_sa text;
_use_itinerary boolean := false;
_itinerary_select text := '';
_itinerary_filter text := '';

/*
 * Updated to support itinerary_id for Starboard client (backward compatible).
 * When psm_itinerary_config.use_itinerary = true, includes itinerary_id in SELECT output.
 * $5 (optional): itinerary_id filter — when provided, filters to that specific itinerary.
 *
 * sample call:
 * select * from global.distinct_rules_mapped_to_store('cur', '1', '{2260_200_4205_10847_1}', '{"search": [], "sort": [], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0}, "query_type": "AND"}')
 * fetch all in "cur";
 */
BEGIN
    -- Check if itinerary mapping is enabled for this tenant
    BEGIN
        SELECT COALESCE((attribute_value->>'use_itinerary')::boolean, false)
        INTO _use_itinerary
        FROM global.tenant_attribute_master
        WHERE name = 'psm_itinerary_config';
    EXCEPTION WHEN OTHERS THEN
        _use_itinerary := false;
    END;

    -- Build itinerary-specific SQL fragments
    IF _use_itinerary THEN
        _itinerary_select := ', itinerary_id';
        IF $5 IS NOT NULL THEN
            _itinerary_filter := ' and itinerary_id = ' || quote_literal($5);
        END IF;
    END IF;

   _query_meta_filters := global.form_table_query($4);
   
   _query_combine := 'select * from (select distinct rule_code, rcl_dimension , validity' || _itinerary_select || '
					from global.rcl_product_mapping_product_store_rule join global.rcl_product_mapping_product_store
					using (rule_code, rcl_code) 
					where validity is not null and psa_name = ''' || $2 || ''' and 
					psa_code  in (''' || array_to_string($3, ''',''', '') || ''')' || _itinerary_filter || ' ) X ' || _query_meta_filters;
  	 raise notice 'data: %', _query_combine;
     open $1 for execute _query_combine;
	return $1;
END
$function$;
