--liquibase formatted sql   
--changeset harsh.singh@impactanalytics.co:fn_create_event_new_flow_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_create_event_new_flow_1

DROP FUNCTION if exists price_promo.fn_create_event_new_flow;
CREATE OR REPLACE FUNCTION price_promo.fn_create_event_new_flow(p_event price_promo.event_model_new_flow)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
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

	addi_attr_ins_str text;

begin
	
	raise notice '1';
	--Create basic event

	query := format('
            insert into price_promo.event_master (
                name, start_date, end_date, submit_by,  
                discounting_level, 
                product_inclusion_type, has_locked_product_selection, store_selection_type, 
                has_locked_store_selection, product_exclusion_type, has_locked_customer_selection, customer_selection_type, created_by, created_at,
	      status
            ) 
            values (
                %L, %L, %L, %L, 
                %L, 
                %L, %L, %L, 
                %L, %L, %L, %L, %L, NOW(),
	      %L
            ) returning event_id',
            p_event.name, 
            p_event.start_date, 
            p_event.end_date, 
            p_event.submit_offers_by, 
            'NULL',
            (p_event).product_restriction.product_restriction_level, 
            (p_event).product_restriction.lock, 
            (p_event).store_restriction.store_restriction_level,
            (p_event).store_restriction.lock, 
            (p_event).product_exclusion.product_exclusion_level, 
			(p_event).customer_restriction.lock, 
			(p_event).customer_restriction.customer_restriction_level,
            p_event.created_by,
	  COALESCE(p_event.status, 1)
    );
	raise notice 'query 1 : %', query;
	execute query into v_event_id;



--	getting dynamic event attrs
	query := format('
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
	    v_event_id,
	    p_event.additional_attributes
	);
	
	raise notice 'q - %', query;
	execute query into addi_attr_ins_str;

	query := format('INSERT INTO price_promo.event_attribute_mapping (event_id, attribute_id, attribute_value) VALUES %1$s', addi_attr_ins_str);

	raise notice 'additional attr ins query ----- %', query;
	
	execute query;

	


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
				        )::price_promo.product_restriction,
						%8$L)',
				        v_event_id, 
				        (p_event).product_restriction.product_restriction_level, 
				        (p_event).product_restriction."lock", 
				        (p_event).product_restriction.specific_product_type, 
				        (p_event).product_restriction.products, 
				        (p_event).product_restriction.product_groups, 
				        (p_event).product_restriction.hierarchy_data,
				        p_event.created_by
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
				        )::price_promo.store_restriction, %6$L)',
				        v_event_id, 
				        (p_event).store_restriction.store_restriction_level, 
				        (p_event).store_restriction."lock", 
				        (p_event).store_restriction.stores, 
				        (p_event).store_restriction.store_groups,
				        p_event.created_by
				    );
		raise notice 'query 4 : %', query;
		execute query;
	end if;

	--Customer Restriction
	if (p_event).customer_restriction is not null then
		raise notice 'inside customer restrictions';
		query := format('select 
							* 
						from 
							price_promo.fn_create_event_customer_restrictions(%1$L, ROW(
			                %2$L, 
				            %3$L::bool, 
				            %4$L::jsonb
				        )::price_promo.customer_restriction)',
				        v_event_id, 
				        (p_event).customer_restriction.customer_restriction_level, 
				        (p_event).customer_restriction."lock", 
				        (p_event).customer_restriction.hierarchy_data
				    );
		raise notice 'query 5 : %', query;
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
	query := format('select * from price_promo.fn_save_event_final_hierarchy(%1$L, %2$L)', v_event_id, p_event.created_by);
	execute query;

	query := format('select * from price_promo.fn_save_event_final_products(%1$L, %2$L)', v_event_id, p_event.created_by);
	execute query;

	query := format('select * from price_promo.fn_save_event_final_store_hierarchy(%1$L, %2$L)', v_event_id, p_event.created_by);
	execute query;

	query := format('select * from price_promo.fn_save_event_final_stores(%1$L, %2$L)', v_event_id, p_event.created_by);
	execute query;

end;
$function$
;
