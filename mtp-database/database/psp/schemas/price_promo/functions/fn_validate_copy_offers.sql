--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_validate_copy_offers runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_validate_copy_offers

DROP FUNCTION if exists price_promo.fn_validate_copy_offers;
CREATE OR REPLACE FUNCTION price_promo.fn_validate_copy_offers(promo_event_json jsonb)
 RETURNS TABLE(promo_id integer, promo_product_count integer, promo_store_count integer, event_product_count integer, event_store_count integer, mismatched_product_count integer, mismatched_store_count integer, validation_message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    promo_store_ids integer[];
    promo_product_ids integer[];
    event_store_ids integer[];
    event_product_ids integer[];
    mismatched_product_ids integer[];
    mismatched_store_ids integer[];
    curr_promo_id integer;
    curr_event_id integer;
    _query text;
    _validation_message text;
    summary_message text := '';
    total_mismatch_count integer := 0;
    total_product_mismatches integer := 0;
    total_store_mismatches integer := 0;
BEGIN
    -- drop temp table if it exists
    drop table if exists counts_table;

    -- create temp table to store results
    create temp table counts_table (
        promo_id int,
        promo_product_count int,
        promo_store_count int,
        event_product_count int,
        event_store_count int,
        mismatched_product_count int,
        mismatched_store_count int,
        validation_message text
    );

    -- loop through each promo_id & event_id pair from jsonb input
    for curr_promo_id, curr_event_id in 
        select (elem->>'promo_id')::integer, (elem->>'event_id')::integer 
        from jsonb_array_elements(promo_event_json) elem
    loop
        -- fetch event's applicable stores and products
        select array_agg(distinct store_id) into event_store_ids 
        from price_promo.event_stores 
        where event_id = curr_event_id;

        select array_agg(distinct product_id) into event_product_ids 
        from price_promo.event_product
        where event_id = curr_event_id;

        -- fetch promo products and stores
        select array_agg(distinct pp.product_id) into promo_product_ids
        from price_promo.promo_product pp inner join price_promo.product_master pm on pp.product_id = pm.product_id
        where pp.promo_id = curr_promo_id and pm.is_active = 1;

        select array_agg(distinct pp.product_id) into mismatched_product_ids
        from price_promo.promo_product pp inner join price_promo.product_master pm on pp.product_id = pm.product_id
        where pp.promo_id = curr_promo_id and pm.is_active = 1
        and pp.product_id not in (select unnest(event_product_ids));

        select array_agg(distinct store_id) into promo_store_ids
        from price_promo.promo_store ps
        where ps.promo_id = curr_promo_id;

        select array_agg(distinct store_id) into mismatched_store_ids
        from price_promo.promo_store ps
        where ps.promo_id = curr_promo_id
        and store_id not in (select unnest(event_store_ids));

        -- determine validation message
        _validation_message := '';

        if coalesce(array_length(promo_product_ids, 1), 0) > 0 and (coalesce(array_length(mismatched_product_ids, 1), 0) = coalesce(array_length(promo_product_ids, 1), 0)) or
			coalesce(array_length(promo_store_ids, 1), 0) > 0 and (coalesce(array_length(mismatched_store_ids, 1), 0) = coalesce(array_length(promo_store_ids, 1), 0)) then

			total_mismatch_count = total_mismatch_count + 1;

			if coalesce(array_length(mismatched_product_ids, 1), 0) = coalesce(array_length(promo_product_ids, 1), 0) then
				total_product_mismatches = total_product_mismatches + 1;
	            _validation_message := 'No products in the copied promo are applicable to the event. Please review.';
				-- insert into temporary results table
		        insert into counts_table (
		            promo_id, promo_product_count, promo_store_count, event_product_count, event_store_count, 
		            mismatched_product_count, mismatched_store_count, validation_message
		        )
		        values (
		            curr_promo_id, 
		            coalesce(array_length(promo_product_ids, 1), 0), 
		            coalesce(array_length(promo_store_ids, 1), 0), 
		            coalesce(array_length(event_product_ids, 1), 0), 
		            coalesce(array_length(event_store_ids, 1), 0),
		            coalesce(array_length(mismatched_product_ids, 1), 0),
		            coalesce(array_length(mismatched_store_ids, 1), 0),
		            _validation_message
		        );
	        
			elsif coalesce(array_length(mismatched_store_ids, 1), 0) = coalesce(array_length(promo_store_ids, 1), 0) then
				total_store_mismatches = total_store_mismatches + 1;
				_validation_message := 'No products in the copied promo are applicable to the event. Please review.';
				-- insert into temporary results table
		        insert into counts_table (
		            promo_id, promo_product_count, promo_store_count, event_product_count, event_store_count, 
		            mismatched_product_count, mismatched_store_count, validation_message
		        )
		        values (
		            curr_promo_id, 
		            coalesce(array_length(promo_product_ids, 1), 0), 
		            coalesce(array_length(promo_store_ids, 1), 0), 
		            coalesce(array_length(event_product_ids, 1), 0), 
		            coalesce(array_length(event_store_ids, 1), 0),
		            coalesce(array_length(mismatched_product_ids, 1), 0),
		            coalesce(array_length(mismatched_store_ids, 1), 0),
		            _validation_message
		        );
			
			end if;

		elsif coalesce(array_length(mismatched_product_ids, 1), 0) > 0 or coalesce(array_length(mismatched_store_ids, 1), 0) > 0 then 

			total_mismatch_count = total_mismatch_count + 1;

			if coalesce(array_length(mismatched_product_ids, 1), 0) > 0 then
				total_product_mismatches = total_product_mismatches + 1;
	            _validation_message := 'Some products in the copied promo are not applicable to the event. Please review.';
				-- insert into temporary results table
		        insert into counts_table (
		            promo_id, promo_product_count, promo_store_count, event_product_count, event_store_count, 
		            mismatched_product_count, mismatched_store_count, validation_message
		        )
		        values (
		            curr_promo_id, 
		            coalesce(array_length(promo_product_ids, 1), 0), 
		            coalesce(array_length(promo_store_ids, 1), 0), 
		            coalesce(array_length(event_product_ids, 1), 0), 
		            coalesce(array_length(event_store_ids, 1), 0),
		            coalesce(array_length(mismatched_product_ids, 1), 0),
		            coalesce(array_length(mismatched_store_ids, 1), 0),
		            _validation_message
		        );
	        
			elsif coalesce(array_length(mismatched_store_ids, 1), 0) > 0 then 
				total_store_mismatches = total_store_mismatches + 1;
				_validation_message := 'Some products in the copied promo are not applicable to the event. Please review.';
				-- insert into temporary results table
		        insert into counts_table (
		            promo_id, promo_product_count, promo_store_count, event_product_count, event_store_count, 
		            mismatched_product_count, mismatched_store_count, validation_message
		        )
		        values (
		            curr_promo_id, 
		            coalesce(array_length(promo_product_ids, 1), 0), 
		            coalesce(array_length(promo_store_ids, 1), 0), 
		            coalesce(array_length(event_product_ids, 1), 0), 
		            coalesce(array_length(event_store_ids, 1), 0),
		            coalesce(array_length(mismatched_product_ids, 1), 0),
		            coalesce(array_length(mismatched_store_ids, 1), 0),
		            _validation_message
		        );
			end if;
		
		end if;

        
    end loop;

    -- construct final summary message
    if total_mismatch_count > 0 then
        summary_message := format(
            '%s copied promos have event applicability mismatches: %s related to products. Please review these promos.', 
            total_mismatch_count, total_product_mismatches
        );
    end if;

    -- insert final summary row
    insert into counts_table (
        promo_id, promo_product_count, promo_store_count, event_product_count, event_store_count, 
        mismatched_product_count, mismatched_store_count, validation_message
    ) values (
        null, null, null, null, null, null, null, summary_message
    );

    -- return the final results
    return query select * from counts_table;
END;
$function$
;
