--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_validate_copy_offers runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_validate_copy_offers

DROP FUNCTION if exists price_promo.fn_validate_copy_offers;
CREATE OR REPLACE FUNCTION price_promo.fn_validate_copy_offers(promo_event_json jsonb)
 RETURNS TABLE(
    promo_id integer,
    promo_product_count integer,
    promo_store_count integer,
    promo_customer_count integer,
    event_product_count integer,
    event_store_count integer,
    event_customer_count integer,
    mismatched_product_count integer,
    mismatched_store_count integer,
    mismatched_customer_count integer,
    validation_message text
)
 LANGUAGE plpgsql
AS $function$
DECLARE
    promo_store_ids integer[];
    promo_product_ids integer[];
    promo_customer_ids integer[];
    event_store_ids integer[];
    event_product_ids integer[];
    event_customer_ids integer[];
    mismatched_product_ids integer[];
    mismatched_store_ids integer[];
    mismatched_customer_ids integer[];
    curr_promo_id integer;
    curr_event_id integer;
    _query text;
    _validation_message text;
    summary_message text := '';
    total_mismatch_count integer := 0;
    total_product_mismatches integer := 0;
    total_store_mismatches integer := 0;
    total_customer_mismatches integer := 0;
    _mismatches text[];
BEGIN
    -- drop temp table if it exists
    drop table if exists counts_table;

    -- create temp table to store results
    create temp table counts_table (
        promo_id int,
        promo_product_count int,
        promo_store_count int,
        promo_customer_count int,
        event_product_count int,
        event_store_count int,
        event_customer_count int,
        mismatched_product_count int,
        mismatched_store_count int,
        mismatched_customer_count int,
        validation_message text
    );

    -- loop through each promo_id & event_id pair from jsonb input
    for curr_promo_id, curr_event_id in 
        select (elem->>'promo_id')::integer, (elem->>'event_id')::integer 
        from jsonb_array_elements(promo_event_json) elem
    loop
        _mismatches := array[]::text[];
        
        -- fetch event's applicable stores and products
        select array_agg(distinct store_id) into event_store_ids 
        from price_promo.event_stores 
        where event_id = curr_event_id;

        select array_agg(distinct product_id) into event_product_ids 
        from price_promo.event_product
        where event_id = curr_event_id;

        select array_agg(distinct customer_id) into event_customer_ids
        from price_promo.tb_event_customers
        where event_id = curr_event_id;

        -- fetch promo products and stores
        select array_agg(distinct product_id) into promo_product_ids
        from price_promo.promo_product pp
        where pp.promo_id = curr_promo_id;

        select array_agg(distinct product_id) into mismatched_product_ids
        from price_promo.promo_product pp
        where pp.promo_id = curr_promo_id
        and product_id not in (select unnest(event_product_ids));

        select array_agg(distinct store_id) into promo_store_ids
        from price_promo.promo_store ps
        where ps.promo_id = curr_promo_id;

        select array_agg(distinct store_id) into mismatched_store_ids
        from price_promo.promo_store ps
        where ps.promo_id = curr_promo_id
        and store_id not in (select unnest(event_store_ids));

        select array_agg(distinct customer_id) into promo_customer_ids
        from price_promo.tb_promo_customers pc
        where pc.promo_id = curr_promo_id;

        select array_agg(distinct customer_id) into mismatched_customer_ids
        from price_promo.tb_promo_customers pc
        where pc.promo_id = curr_promo_id
        and customer_id not in (select unnest(event_customer_ids));

        -- determine validation message
        _validation_message := '';

        if coalesce(array_length(promo_product_ids, 1), 0) > 0 and (coalesce(array_length(mismatched_product_ids, 1), 0) = coalesce(array_length(promo_product_ids, 1), 0)) or
			coalesce(array_length(promo_store_ids, 1), 0) > 0 and (coalesce(array_length(mismatched_store_ids, 1), 0) = coalesce(array_length(promo_store_ids, 1), 0)) or
			coalesce(array_length(promo_customer_ids, 1), 0) > 0 and (coalesce(array_length(mismatched_customer_ids, 1), 0) = coalesce(array_length(promo_customer_ids, 1), 0)) then

			total_mismatch_count = total_mismatch_count + 1;

			if coalesce(array_length(mismatched_product_ids, 1), 0) = coalesce(array_length(promo_product_ids, 1), 0) then
				total_product_mismatches = total_product_mismatches + 1;
                _mismatches := array_append(_mismatches, 'products');
            end if;

			if coalesce(array_length(mismatched_store_ids, 1), 0) = coalesce(array_length(promo_store_ids, 1), 0) then
				total_store_mismatches = total_store_mismatches + 1;
                _mismatches := array_append(_mismatches, 'stores');
            end if;
            
            if coalesce(array_length(mismatched_customer_ids, 1), 0) = coalesce(array_length(promo_customer_ids, 1), 0) then
				total_customer_mismatches = total_customer_mismatches + 1;
                _mismatches := array_append(_mismatches, 'customers');
			end if;


            _validation_message = format(
                'No %s in the copied deal are applicable to the promo. Please review.',
                array_to_string(_mismatches, ', ')
            );

            insert into counts_table (
                promo_id, promo_product_count, promo_store_count, promo_customer_count, 
                event_product_count, event_store_count, event_customer_count, 
                mismatched_product_count, mismatched_store_count, mismatched_customer_count, validation_message
            )
            values (
                curr_promo_id, 
                coalesce(array_length(promo_product_ids, 1), 0), 
                coalesce(array_length(promo_store_ids, 1), 0), 
                coalesce(array_length(promo_customer_ids, 1), 0),
                coalesce(array_length(event_product_ids, 1), 0), 
                coalesce(array_length(event_store_ids, 1), 0),
                coalesce(array_length(event_customer_ids, 1), 0),
                coalesce(array_length(mismatched_product_ids, 1), 0),
                coalesce(array_length(mismatched_store_ids, 1), 0),
                coalesce(array_length(mismatched_customer_ids, 1), 0),
                _validation_message
            );

		elsif (
            coalesce(array_length(mismatched_product_ids, 1), 0) > 0 
            or coalesce(array_length(mismatched_store_ids, 1), 0) > 0 
            or coalesce(array_length(mismatched_customer_ids, 1), 0) > 0
        ) then 

			total_mismatch_count = total_mismatch_count + 1;
            _validation_message := 'Some products, stores, or customers in the copied deal are not applicable to the promo. Please review.';

			if coalesce(array_length(mismatched_product_ids, 1), 0) > 0 then
				total_product_mismatches = total_product_mismatches + 1;
            end if;
	        
			if coalesce(array_length(mismatched_store_ids, 1), 0) > 0 then 
				total_store_mismatches = total_store_mismatches + 1;
			end if;

            if coalesce(array_length(mismatched_customer_ids, 1), 0) > 0 then
                total_customer_mismatches = total_customer_mismatches + 1;
            end if;

            insert into counts_table (
                promo_id, promo_product_count, promo_store_count, promo_customer_count, 
                event_product_count, event_store_count, event_customer_count, 
                mismatched_product_count, mismatched_store_count, mismatched_customer_count, validation_message
            )
            values (
                curr_promo_id, 
                coalesce(array_length(promo_product_ids, 1), 0), 
                coalesce(array_length(promo_store_ids, 1), 0), 
                coalesce(array_length(promo_customer_ids, 1), 0),
                coalesce(array_length(event_product_ids, 1), 0), 
                coalesce(array_length(event_store_ids, 1), 0),
                coalesce(array_length(event_customer_ids, 1), 0),
                coalesce(array_length(mismatched_product_ids, 1), 0),
                coalesce(array_length(mismatched_store_ids, 1), 0),
                coalesce(array_length(mismatched_customer_ids, 1), 0),
                _validation_message
            );
		
		end if;

        
    end loop;

    -- construct final summary message
    if total_mismatch_count > 0 then
        summary_message := format(
            '%s copied promos have event applicability mismatches: %s related to products, %s to stores, and %s to customers. please review these deals.', 
            total_mismatch_count, total_product_mismatches, total_store_mismatches, total_customer_mismatches
        );
    end if;

    -- insert final summary row
    insert into counts_table (
        promo_id, promo_product_count, promo_store_count, promo_customer_count, 
        event_product_count, event_store_count, event_customer_count, 
        mismatched_product_count, mismatched_store_count, mismatched_customer_count, 
        validation_message
    ) values (
        null, null, null, null, null, null, null, null, null, null, summary_message
    );

    -- return the final results
    return query select * from counts_table;
END;
$function$
;
