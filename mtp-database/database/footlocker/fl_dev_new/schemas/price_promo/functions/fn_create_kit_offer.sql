--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_create_kit_offer_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_create_kit_offer function created

DROP FUNCTION if exists price_promo.fn_create_kit_offer;
CREATE OR REPLACE FUNCTION price_promo.fn_create_kit_offer(request_payload jsonb, _user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	created_kit_offer_id int;
	unit record;
begin
	query = format('
    INSERT INTO price_promo.tb_kit_offer
    (kit_offer_name, total_number_of_units, promo_id, discount_value, kit_offer_type_id, created_by, created_at)
    VALUES(%1$L, %2$s, %3$s, %4$s, %5$s, %6$s, NOW())
	returning kit_offer_id',
	    request_payload->>'kit_offer_name', 
        request_payload->'total_number_of_units',
        request_payload->'promo_id',
        request_payload->'discount_value',
        request_payload->'kit_offer_type_id',
        _user_id);

	raise notice ' create kit offer query  -- %', query;
	execute query into created_kit_offer_id;

	--Create kit offer units entries	
	perform price_promo.fn_create_kit_offer_units(request_payload, created_kit_offer_id);


	return created_kit_offer_id;
end
$function$
;
