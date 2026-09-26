--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:generate_cadence_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:generate_cadence_v2 
--comment: generate_cadence_v2 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.generate_cadence_new_skus_v2(_text, _text);

CREATE OR REPLACE FUNCTION item_smart.generate_cadence_new_skus_v2(p_new_sku_ids text[], p_channels text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE

    v_total_insert_count INT := 0; -- Variable to keep track of total inserted records
    i INT; -- Loop variable
   
	rows_updated_for_cadence INT := 0;
	generate_cadence_new_sku_text text;
BEGIN
    -- Loop through each placeholder_id and mapped_product_code
    FOR i IN 1 .. array_length(p_new_sku_ids, 1) LOOP
       	
		generate_cadence_new_sku_text := format(

			'SELECT item_smart.new_sku_cadence_generation(%L, %L)',
			 p_new_sku_ids[i], p_channels
			);
		RAISE NOTICE 'Called new skus cadence generation for %',p_new_sku_ids[i];
		EXECUTE generate_cadence_new_sku_text INTO rows_updated_for_cadence;
       
       
        UPDATE item_smart.new_skus
        SET is_cadence_generated = TRUE,updated_at=now()
        WHERE product_code = p_new_sku_ids[i] ;
    END LOOP;

    -- Return the total count of inserted records
    RETURN v_total_insert_count;
END;
$function$
;
