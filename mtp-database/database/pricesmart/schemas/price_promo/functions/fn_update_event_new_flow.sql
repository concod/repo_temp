--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_update_event_new_flow runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_update_event_new_flow

DROP FUNCTION if exists price_promo.fn_update_event_new_flow;
CREATE OR REPLACE FUNCTION price_promo.fn_update_event_new_flow(p_event_id integer, p_event price_promo.event_model_new_flow, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
	temp_query text;
	hierarchy_l_id int;
    product_ids int[];
	specific_product_id int;
	pg_id int;
	store_id int;
	store_ids int[];
	store_group_ids integer[];
	store_group_id int;
	hierarchy_field text;
	debug_rec RECORD;
	product_detail record;
	store_details record;
    _start_time timestamp;

	addi_attr_ins_str text;

begin

	drop table if exists tb_temp_event_edit_effected_promos;
	create temp table tb_temp_event_edit_effected_promos as 
	select 
		p_event_id as event_id,
		*	
	from price_promo.fn_get_event_effected_offers_new_flow(p_event_id, p_event);

	raise notice 'tb_temp_event_edit_effected_promos created';

	--Create basic event
	_query := format('update price_promo.event_master set 
            name = %1$L,
            start_date = %2$L,
            end_date = %3$L,
            submit_by = %4$L,
            discounting_level = %5$L,
            product_inclusion_type = %6$L,
            has_locked_product_selection = %7$L,
            store_selection_type = %8$L,
            has_locked_store_selection = %9$L,
            product_exclusion_type = %10$L,
            updated_by = %11$L,
            updated_at = NOW()
        where event_id = %12$L
        returning event_id',
        p_event.name, p_event.start_date, p_event.end_date,
        p_event.submit_offers_by, 
		'NULL',
        (p_event).product_restriction.product_restriction_level, (p_event).product_restriction.lock , (p_event).store_restriction.store_restriction_level,
        (p_event).store_restriction.lock, (p_event).product_exclusion.product_exclusion_level,p_user_id,
        p_event_id
    );
	
	raise notice 'query 1 : %', _query;
	execute _query;
	
	delete from price_promo.event_attribute_mapping where event_id = p_event_id;
    delete from price_promo.event_date_restrictions where event_id = p_event_id;
    delete from price_promo.included_event_products where event_id = p_event_id;
    delete from price_promo.included_event_product_hierarchy where event_id = p_event_id;
    delete from price_promo.included_event_product_groups where event_id = p_event_id;
    delete from price_promo.included_event_stores where event_id = p_event_id;
    delete from price_promo.included_event_store_hierarchy where event_id = p_event_id;
    delete from price_promo.included_event_store_groups where event_id= p_event_id;
    delete from price_promo.excluded_event_product_groups where event_id = p_event_id;


	--	getting dynamic event attrs
	_query := format('
	    WITH json_data AS (
	        SELECT 
	            key as json_key, 
	            value as json_value
	        FROM jsonb_each_text(%2$L)
	    )
	    SELECT string_agg(
	        format(''(%%s, %%s, %%L)'', %1$s, am.id, jd.json_value), 
	        '', ''
	    )
	    FROM json_data jd
	    JOIN price_promo.attribute_master am ON (
	        jd.json_key = am.fe_identifier
	        AND am.is_active = true 
	        AND am.be_is_master_attr = false
	    )',
	    p_event_id,
	    p_event.additional_attributes
	);
	
	raise notice 'q - %', _query;
	execute _query into addi_attr_ins_str;

	_query := format('INSERT INTO price_promo.event_attribute_mapping (event_id, attribute_id, attribute_value) VALUES %1$s', addi_attr_ins_str);

	raise notice 'additional attr ins query ----- %', _query;
	execute _query;


	--Date Restriction
	_query := format('
		INSERT INTO price_promo.event_date_restrictions (
			event_id,
			min_promo_duration,
			max_promo_duration, 
			promo_start_date,
			promo_end_date,
			use_same_as_event
		) VALUES (
			%6$s,
			%1$L,
			%2$L,
			%3$L,
			%4$L,
			%5$L
		)',
		(p_event).date_restriction.min_promotion_days,
		(p_event).date_restriction.max_promotion_days,
		(p_event).date_restriction.promotion_start_day,
		(p_event).date_restriction.promotion_end_day,
		(p_event).date_restriction.same_as_event,
		p_event_id
	);

	raise notice 'query 2 : %', _query;
	execute _query;

    raise notice 'product_restriction: %', (p_event).product_restriction;
	execute price_promo.fn_create_event_product_restrictions(p_event_id, (p_event).product_restriction);

    raise notice 'store_restriction: %', (p_event).store_restriction;
	execute price_promo.fn_create_event_store_restrictions(p_event_id, (p_event).store_restriction);

	--Product Exclusion
	raise notice 'product_exclusion: %', (p_event).product_exclusion;
		--Case 1 - Product Group
	raise notice 'product_exclusion_level: %', (p_event).product_exclusion.product_exclusion_level;
	if (p_event).product_exclusion.product_exclusion_level = 'product_group' then
		foreach pg_id in array (p_event).product_exclusion.product_groups loop
			insert into price_promo.excluded_event_product_groups (event_id, product_group_id)
			values (p_event_id, pg_id);
		end loop;
	end if;


	--call functions to populate the consolidated tables
	_start_time := clock_timestamp();
	_query := format('select * from price_promo.fn_save_event_final_hierarchy(%1$L)', p_event_id);
    raise notice 'save event final hierarchy : %', _query;
	execute _query;
    raise notice 'took % seconds to save event final hierarchy', extract(epoch from clock_timestamp() - _start_time);

    _start_time := clock_timestamp();
	_query := format('select * from price_promo.fn_save_event_final_products(%1$L)', p_event_id);
    raise notice 'save event final products : %', _query;
	execute _query;
    raise notice 'took % seconds to save event final products', extract(epoch from clock_timestamp() - _start_time);

    _start_time := clock_timestamp();
	_query := format('select * from price_promo.fn_save_event_final_store_hierarchy(%1$L)', p_event_id);
    raise notice 'save event final store hierarchy : %', _query;
	execute _query;
    raise notice 'took % seconds to save event final store hierarchy', extract(epoch from clock_timestamp() - _start_time);

    _start_time := clock_timestamp();
	_query := format('select * from price_promo.fn_save_event_final_stores(%1$L)', p_event_id);
    raise notice 'save event final stores : %', _query;
	execute _query;
    raise notice 'took % seconds to save event final stores', extract(epoch from clock_timestamp() - _start_time);

	perform price_promo.fn_update_event_edit_effected_promos();

    return p_event_id;

end;
$function$
;
