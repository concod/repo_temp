--liquibase formatted sql
--changeset pradeep.nayak@impactanalytics.co:persist_rcl_create_pmps_version_2_sb_itinerary runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-126587
--comment: Added itinerary_id support for Starboard - includes itinerary_id in INSERT into main table
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.persist_rcl_create_pmps_version_2(_temp_tbl_name text);
CREATE OR REPLACE FUNCTION global.persist_rcl_create_pmps_version_2(_temp_tbl_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare 
    _item text;
    _rule_code_update_sql text;
    _insert_master text;
    _rcl_code int;
    _level varchar[];
    _priority int;
    _cb text;
    _validity datemultirange;
    drop_query text;
    _use_itinerary boolean := false;
    _itinerary_insert_col text := '';
    _itinerary_select_col text := '';
    /*
    Updated for Starboard: includes itinerary_id in INSERT into main table when enabled.
    select * from global.persist_rcl_create_pmps_version_2('rule_creation_unique_id');
    */
begin
    -- Check if itinerary mapping is enabled for this tenant
    BEGIN
        SELECT COALESCE((attribute_value->>'use_itinerary')::boolean, false)
        INTO _use_itinerary
        FROM global.tenant_attribute_master
        WHERE name = 'psm_itinerary_config';
    EXCEPTION WHEN OTHERS THEN
        _use_itinerary := false;
    END;

    IF _use_itinerary THEN
        _itinerary_insert_col := ', itinerary_id';
        _itinerary_select_col := ', itinerary_id';
    END IF;

--  insert into rule table
  	_insert_master := 'insert into global.rcl_product_mapping_product_store_rule(rcl_code, rule_code, rcl_dimension) select distinct rcl_code, rule_code, rcl_dimension from global.' || _temp_tbl_name || ' ON CONFLICT DO NOTHING;';
   raise notice 'insert rule: %', _insert_master;
   execute _insert_master;
  --  insert into BASE table
  	_insert_master := 'insert into global.rcl_product_mapping_product_store(rcl_code, rule_code, psa_code, psa_name, validity, created_at, created_by' || _itinerary_insert_col || ') select rcl_code, rule_code, psa_code, psa_name, validity::datemultirange, created_at, created_by' || _itinerary_select_col || ' from global.' || _temp_tbl_name || ' s where  exists (select 1 from global.rcl_product_mapping_product_store_rule d where d.rule_code = s.rule_code);;';
    raise notice 'insert base: %', _insert_master;
	execute _insert_master;

	drop_query = 'drop table if exists global.' || _temp_tbl_name;
	raise notice 'drop_query: %', drop_query;
	execute drop_query;
end;
$function$
;
