--liquibase formatted sql
--changeset shrrayan.sheel@impactanalytics.co:fn_create_kit_offer_units_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_create_kit_offer_units_1

DROP FUNCTION if exists price_promo.fn_create_kit_offer_units;
CREATE OR REPLACE FUNCTION price_promo.fn_create_kit_offer_units(request_payload jsonb, p_kit_offer_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	created_kit_offer_units_id int;
	unit record;
begin

	FOR unit IN
        SELECT * FROM jsonb_array_elements(request_payload -> 'unit_selection')
    LOOP
        RAISE NOTICE 'Unit Data: %', unit;

		query = format('
	    INSERT INTO price_promo.tb_kit_offer_units
	    (unit_name, units_count, product_selection_type, kit_offer_id)
	    VALUES(%1$L, %2$s, %3$s, %4$s)
		returning kit_offer_units_id',
		    unit.value ->> 'unit_name', 
	        unit.value -> 'units_count',
			unit.value -> 'product_selection_type',
			p_kit_offer_id);
		
 		RAISE NOTICE 'create kit offer unit query  -- %', query;
		execute query into created_kit_offer_units_id;

		perform price_promo.fn_create_kit_offer_units_product_hierarchy(created_kit_offer_units_id, unit.value);

    END LOOP;


end
$function$
;
