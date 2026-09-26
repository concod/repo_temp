--liquibase formatted sql
--changeset gururaj.patil@impactanalytics.co:new_store_store_groups ambiguity_resolved version stripComments:false splitStatements:false runOnChange:true context:resolved ambiguity in new_store_store_groups SP:MTP-134104
--comment resolved ambiguity in inventory_smart.new_store_store_group generic SP

DROP FUNCTION IF EXISTS inventory_smart.new_store_store_groups(refcursor, _text, int4);
DROP FUNCTION IF EXISTS inventory_smart.new_store_store_groups(refcursor, jsonb, jsonb, int4);
DROP FUNCTION IF EXISTS inventory_smart.new_store_store_groups(refcursor, jsonb, jsonb, _text, int4);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_store_groups(input refcursor, application_code integer, product_attributes jsonb DEFAULT NULL::jsonb, store_attributes jsonb DEFAULT NULL::jsonb, store_codes text[] default NULL::text[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query text := '';
    _channel varchar[] := '{}';
   	_channel_query text := 'TRUE';
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    IF product_attributes IS NOT NULL AND store_attributes IS NOT NULL THEN
        SELECT array_agg(value->0->'values'->>i)
        INTO _channel
        FROM jsonb_each(store_attributes) as t(key, value), 
        generate_series(0, jsonb_array_length(value->0->'values') - 1) as i
        WHERE key = 'store_code';

        IF quote_literal(array_to_string(_channel, ',')) != '' THEN
        _channel_query := $$sgm.store_code in ($$ || quote_literal(array_to_string(_channel, ',')) || $$) $$;
        END IF;
        _query := $$
        WITH store_groups AS (
            SELECT
                distinct sg_code,
                name
            FROM (
                SELECT
                    channel,
                    sg_code,
                    name,
                    store_code
                FROM
                    global.store_groups sg
                JOIN global.store_groups_mapping sgm
                    USING (sg_code)
                WHERE $$ || _channel_query || $$
                AND sg.application_code = $$ || application_code || $$
                AND sg.is_deleted = false 
            ) x
            GROUP BY 1,2
        )
        SELECT * FROM store_groups;
        $$;
		OPEN input FOR EXECUTE _query;
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.new_store_store_groups', 'Before returning function value',_query,jsonb_build_object('product_attributes',product_attributes,'store_attributes',store_attributes,'application_code',application_code)) ;
    	RETURN input;
    ELSIF store_codes IS NOT NULL THEN
        -- Else for new store setup V2 flow
        _query := '
            with mapped_store_groups as (
                select distinct sg_code
                from global.store_groups sg
                join global.store_groups_mapping using (sg_code)
                where store_code::varchar = ANY($1)
                  and sg.application_code = $2
                  and sg.is_deleted = false
            )
            , store_groups_detail as (
                select sg_code, sg.name as sg_name, count(*) as store_count
                from global.store_groups sg
                join global.store_groups_mapping using (sg_code)
                join global.store_attributes_filter saf
				using(store_code)
                join mapped_store_groups using (sg_code)
				WHERE saf.active
                group by sg_code, sg_name
            )
            select * from store_groups_detail;
        ';
		OPEN input FOR EXECUTE _query USING store_codes, application_code;
		RETURN input;
    ELSE
        -- Handle the case when neither product_attributes nor store_codes are provided
        RAISE EXCEPTION 'Either product_attributes, store_attributes or store_codes must be provided';
    END IF;

END;
$function$
;
