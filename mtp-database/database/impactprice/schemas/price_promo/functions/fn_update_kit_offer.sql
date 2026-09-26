--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_update_kit_offer_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_update_kit_offer_1

DROP FUNCTION if exists price_promo.fn_update_kit_offer;
CREATE OR REPLACE FUNCTION price_promo.fn_update_kit_offer(request_payload jsonb, _user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	payload_kit_offer_id int;
	unit record;
	delete_rec RECORD;
begin

	payload_kit_offer_id = request_payload->'kit_offer_id';

	query = format('
    	UPDATE price_promo.tb_kit_offer
	    SET
	        kit_offer_name = %1$L,
	        total_number_of_units = %2$s,
	        promo_id = %3$s,
	        discount_value = %4$s,
	        kit_offer_type_id = %5$s,
	        updated_by = %6$s,
	        updated_at = NOW()
	    WHERE kit_offer_id = %7$s
	   ',
	    request_payload->>'kit_offer_name', 
	    request_payload->'total_number_of_units',
	    request_payload->'promo_id',
	    request_payload->'discount_value',
	    request_payload->'kit_offer_type_id',
	    _user_id,
	    payload_kit_offer_id
	);

	raise notice ' create kit offer query  -- %', query;
	execute query;
	
	IF (request_payload->>'only_basic_details_updated')::boolean THEN
        RETURN payload_kit_offer_id;
    END IF;

	delete from price_promo.tb_kit_offer_units tkou where tkou.kit_offer_id = payload_kit_offer_id;
	--Create kit offer units entries	
	perform price_promo.fn_create_kit_offer_units(request_payload, payload_kit_offer_id);

	return payload_kit_offer_id;
end
$function$
;

