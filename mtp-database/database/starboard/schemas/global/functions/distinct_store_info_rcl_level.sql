--liquibase formatted sql
--changeset pradeep.nayak@impactanalytics.co:distinct_store_info_rcl_level_return_query_sb_version runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-126587
--comment: modified for active stores
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.distinct_store_info_rcl_level(refcursor, text[], jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.distinct_store_info_rcl_level(refcursor, text[], jsonb, jsonb, jsonb)
RETURNS text
LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;

_final varchar;
_query_meta_filters text;
_where_clause text;
_query_sa text := '';
_query_psa text;
suffix_multiple_dimension_table text := '';
_active_filter jsonb := '{"active": [{"type": "list", "operator": "in", "values": [true]}]}';
_use_itinerary boolean := false;
_itinerary_select text := '';
_itinerary_group_by text := '';
_itinerary_join text := '';

/*
 * Updated to support itinerary_id for Starboard client (backward compatible).
 * When psm_itinerary_config.use_itinerary = true, joins with store_itinerary_table
 * to return (psa_name, itinerary_id) combos instead of just psa_name.
 *
 * sample call:
 * select * from global.distinct_store_info_rcl_level('cur', '{}',
 *   '{"l0_name": [{"type": "list", "operator": "in", "values": ["CAN"], "dimension": "product_store"}]}',
 *   '{}',
 *   '{"search": [], "sort": [], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0}, "query_type": "AND"}');
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
        _itinerary_select := ', sit.itineraryid as itinerary_id';
        _itinerary_group_by := ', sit.itineraryid';
        _itinerary_join := ' JOIN global.store_itinerary_table sit ON X.psa_name = sit.store_code';
    END IF;

    _query_meta_filters := global.form_table_query($5);
   
	select attribute_value->>'suffix' from global.tenant_attribute_master tam where name = 'mapping_multidimension_suffix' into suffix_multiple_dimension_table;
   
   _query_psa := "global".form_attribute_table_filters_v3('product_store_attributes', '', $3, suffix_multiple_dimension_table);
  
 	raise notice 'data: %', _query_psa;

   IF _use_itinerary THEN
       -- With itinerary: group by (psa_name, itinerary_id) to get store-itinerary combos
       _query_combine := 'select psa_name, array_agg(distinct psa_code) as psa_code' || _itinerary_select || ' from (' || _query_psa || ') X' || _itinerary_join || ' group by psa_name' || _itinerary_group_by;
   ELSE
       -- Without itinerary: original grouping by psa_name only
       _query_combine := 'select psa_name, array_agg(distinct psa_code) as psa_code from (' || _query_psa || ') X group by psa_name ';
   END IF;
  	
   if $4 != '{}'::jsonb then
		$4 = $4 || _active_filter;
        -- Only append store_name if it doesn't already exist in the store filters
        if not ($4 ? 'store_name') then
            $4 = $4 || '{"store_name": []}';
        end if;
   		_query_sa := "global".form_attribute_table_filters_v3('store_attributes', 'store_code', $4);
   		raise notice 'query sa : %', _query_sa;
   		_query_combine := 'select * from ('||_query_combine || ') X JOIN (' || _query_sa || ') Y on X.psa_name = Y.store_code ';
   end if;
  
  	_query_combine := _query_combine || _query_meta_filters;
     open $1 for execute _query_combine;
	return _query_combine;
END
$function$;
