--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_update_bxgy_offer_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_update_bxgy_offer_1

DROP FUNCTION if exists price_promo.fn_update_bxgy_offer;

CREATE OR REPLACE FUNCTION price_promo.fn_update_bxgy_offer(request_payload jsonb, _user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	payload_bxgy_offer_id int;
	unit record;
	delete_rec RECORD;
begin

	payload_bxgy_offer_id = request_payload->'bxgy_offer_id';

	query = format('
    	UPDATE price_promo.tb_bxgy_offer
	    SET
	        bxgy_offer_name = %1$L,
	        total_number_of_units = %2$s,
	        promo_id = %3$s,
	        discount_value = %4$s,
	        bxgy_offer_type_id = %5$s,
	        updated_by = %6$s,
	        updated_at = NOW()
	    WHERE bxgy_offer_id = %7$s
	   ',
	    request_payload->>'bxgy_offer_name', 
	    request_payload->'total_number_of_units',
	    request_payload->'promo_id',
	    request_payload->'discount_value',
	    request_payload->'bxgy_offer_type_id',
	    _user_id,
	    payload_bxgy_offer_id
	);

	raise notice ' create bxgy offer query  -- %', query;
	execute query;
	
	IF (request_payload->>'only_basic_details_updated')::boolean THEN
        RETURN payload_bxgy_offer_id;
    END IF;

	delete from price_promo.tb_bxgy_offer_units tkou where tkou.bxgy_offer_id = payload_bxgy_offer_id;
	--Create bxgy offer units entries	
	perform price_promo.fn_create_bxgy_offer_units(request_payload, payload_bxgy_offer_id);

	return payload_bxgy_offer_id;
end
$function$
;