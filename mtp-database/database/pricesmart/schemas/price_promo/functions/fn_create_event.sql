--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_create_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_create_event

DROP FUNCTION if exists price_promo.fn_create_event;
CREATE OR REPLACE FUNCTION price_promo.fn_create_event(p_event price_promo.event_model)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	query text;
	temp_query text;
	v_event_id int4;
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

begin

	--Create basic event
	query := format('insert into price_promo.event_master (
            name, start_date, end_date, 
            submit_by, ad_type, event_type, 
            marketing_notes, objective, discounting_level, 
            product_inclusion_type, has_locked_product_selection, store_selection_type, 
            has_locked_store_selection, product_exclusion_type, created_by, created_at
        ) values (
            %1$L, %2$L, %3$L, 
            %4$L, %5$L, %6$L, 
            %7$L, %8$L, %9$L, 
            %10$L, %11$L, %12$L, 
            %13$L, %14$L, %15$L, NOW()
        ) returning event_id',
        p_event.name, p_event.start_date, p_event.end_date,
        p_event.submit_offers_by, p_event.event_ad_type::text, p_event.event_type,
        p_event.marketing_notes, p_event.event_objective, 'NULL',
        (p_event).product_restriction.product_restriction_level, (p_event).product_restriction.lock , (p_event).store_restriction.store_restriction_level,
        (p_event).store_restriction.lock, (p_event).product_exclusion.product_exclusion_level, p_event.created_by
    );
	
	raise notice 'query 1 : %', query;
	execute query into v_event_id;

	RAISE NOTICE 'date_restriction: %', (p_event).date_restriction;

	--Date Restriction
--	if (p_event).date_restriction is not null then
	query := format('
		INSERT INTO price_promo.event_date_restrictions (	
			event_id, min_promo_duration, max_promo_duration, promo_start_date, 
			promo_end_date, use_same_as_event
		) VALUES (
			%s, %L, %L, %L, %L, %L
		)',
		v_event_id, (p_event).date_restriction.min_promotion_days, (p_event).date_restriction.max_promotion_days, 
		(p_event).date_restriction.promotion_start_day, (p_event).date_restriction.promotion_end_day, (p_event).date_restriction.same_as_event
	);

	raise notice 'query 2 : %', query;
	execute query;
--	end if;

	--Product Restriction
	if (p_event).product_restriction is not null then
		raise notice 'inside product restrictions';
		query := format('select 
							* 
						from 
							price_promo.fn_create_event_product_restrictions(%1$L, ROW(
			                %2$L, 
				            %3$L::bool, 
				            %4$L, 
				            %5$L, 
				            %6$L, 
				            %7$L::jsonb
				        )::price_promo.product_restriction)',
				        v_event_id, 
				        (p_event).product_restriction.product_restriction_level, 
				        (p_event).product_restriction."lock", 
				        (p_event).product_restriction.specific_product_type, 
				        (p_event).product_restriction.products, 
				        (p_event).product_restriction.product_groups, 
				        (p_event).product_restriction.hierarchy_data
				    );
		raise notice 'query 3 : %', query;
		execute query;
	end if;

	--Store Restriction
	if (p_event).store_restriction is not null then
		raise notice 'inside store restrictions';
		query := format('select 
							* 
						from 
							price_promo.fn_create_event_store_restrictions(%1$L, ROW(
				            %2$L, 
				            %3$L::bool, 
				            %4$L, 
				            %5$L
				        )::price_promo.store_restriction)',
				        v_event_id, 
				        (p_event).store_restriction.store_restriction_level, 
				        (p_event).store_restriction."lock", 
				        (p_event).store_restriction.stores, 
				        (p_event).store_restriction.store_groups
				    );
		raise notice 'query 4 : %', query;
		execute query;
	end if;

	--Product Exclusion
	if (p_event).product_exclusion is not null then
		--Case 1 - Product Group
		if (p_event).product_exclusion.product_exclusion_level = 'product_group' then
			foreach pg_id in array (p_event).product_exclusion.product_groups loop
				insert into price_promo.excluded_event_product_groups (event_id, product_group_id)
				values (v_event_id, pg_id);
			end loop;
		end if;
	end if;


	--call functions to populate the consolidated tables
	query := format('select * from price_promo.fn_save_event_final_products(%1$L)', v_event_id);
	execute query;

	query := format('select * from price_promo.fn_save_event_final_hierarchy(%1$L)', v_event_id);
	execute query;

	query := format('select * from price_promo.fn_save_event_final_store_hierarchy(%1$L)', v_event_id);
	execute query;

	query := format('select * from price_promo.fn_save_event_final_stores(%1$L)', v_event_id);
	execute query;

end;
$function$
;
