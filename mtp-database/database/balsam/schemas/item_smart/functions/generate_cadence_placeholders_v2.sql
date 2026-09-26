--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_new_skus stripComments:false runOnChange:true splitStatements:false context:query_updated labels:generate_cadence_placeholders_v2
--comment: initial changeset for generate_cadence_placeholders_v2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.generate_cadence_placeholders_v2(p_placeholder_ids text[], p_channels text[]);
CREATE OR REPLACE FUNCTION item_smart.generate_cadence_placeholders_v2(p_placeholder_ids text[], p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE

    v_total_insert_count INT := 0; -- Variable to keep track of total inserted records
    i INT; -- Loop variable
   
	rows_updated_for_cadence INT := 0;
	generate_cadence_ph_text text;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    -- Loop through each placeholder_id and mapped_product_code
    FOR i IN 1 .. array_length(p_placeholder_ids, 1) LOOP
       	
		generate_cadence_ph_text := format(

			'SELECT item_smart.placeholder_cadence_generation(%L, %L)',
			 p_placeholder_ids[i], p_channels
			);
		RAISE NOTICE 'Called placeholder cadence generation for %',p_placeholder_ids[i];
		EXECUTE generate_cadence_ph_text INTO rows_updated_for_cadence;
       
       
        UPDATE item_smart.placeholders_info
        SET is_cadence_generated = TRUE,updated_at=now()
        WHERE product_code = p_placeholder_ids[i] ;
    END LOOP;
    
    --perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.generate_cadence_placeholders_v2', 'before returning v_total_insert_count', generate_cadence_ph_text, jsonb_build_object('p_placeholder_ids',$1, 'p_channels',$2));

    -- Return the total count of inserted records
    RETURN v_total_insert_count;
END;
$function$
;
