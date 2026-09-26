--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_create_bxgy_offer_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_create_bxgy_offer function created

DROP FUNCTION if exists price_promo.fn_create_bxgy_offer;

CREATE OR REPLACE FUNCTION price_promo.fn_create_bxgy_offer(request_payload jsonb, _user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	created_bxgy_offer_id int;
	unit record;
begin
	query = format('
    INSERT INTO price_promo.tb_bxgy_offer
    (bxgy_offer_name, total_number_of_units, promo_id, discount_value, bxgy_offer_type_id, created_by, created_at)
    VALUES(%1$L, %2$s, %3$s, %4$s, %5$s, %6$s, NOW())
	returning bxgy_offer_id',
	    request_payload->>'bxgy_offer_name', 
        request_payload->'total_number_of_units',
        request_payload->'promo_id',
        request_payload->'discount_value',
        request_payload->'bxgy_offer_type_id',
        _user_id);

	raise notice ' create bxgy offer query  -- %', query;
	execute query into created_bxgy_offer_id;

	--Create bxgy offer units entries	
	perform price_promo.fn_create_bxgy_offer_units(request_payload, created_bxgy_offer_id);


	return created_bxgy_offer_id;
end
$function$
;