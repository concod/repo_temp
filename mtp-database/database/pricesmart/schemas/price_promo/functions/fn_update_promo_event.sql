--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_update_promo_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_update_promo_event

DROP FUNCTION if exists price_promo.fn_update_promo_event;
CREATE OR REPLACE FUNCTION price_promo.fn_update_promo_event(_promo_id integer, _event_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    event_store_ids integer[];
    event_product_ids integer[];
	promo_store_ids integer[];
	promo_product_ids integer[];
	mismatched_product_ids integer[];
	mismatched_store_ids integer[];
	_query text;
	v_has_locked_product_selection boolean;
	v_has_locked_store_selection boolean;
	promo_product_selection text;
	promo_store_selection text;
	event_product_selection text;
	event_store_selection text;
	promo_products_table text := 'included_products';
	event_products_table text := 'included_event_products';
	product_key_name text := 'product_id';
	hierarchy_l_id integer = 0;
	promo_hierarchy_ids integer[];
	event_hierarchy_ids integer[];

BEGIN
	--Promo selections
	select 
		pstc.product_selection_type, 
		sstc.store_selection_type 
	into 
		promo_product_selection, 
		promo_store_selection
	from 
		price_promo.promo_master pm 
	join 
		price_promo.product_selection_type_config pstc
		on pstc.id = pm.product_selection_type
	join 
		price_promo.store_selection_type_config sstc
		on sstc.id = pm.store_selection_type 
	where 
		pm.promo_id = _promo_id;

	raise notice 'promo_prod - % , promo-store - %', promo_product_selection, promo_store_selection;

	--Event Selections
	select 
		product_inclusion_type, 
		store_selection_type 
	into 
		event_product_selection, 
		event_store_selection
	from 
		price_promo.event_master
	where 
		event_id = _event_id;

	raise notice 'event_prod - % , event_store - %', event_product_selection, event_store_selection;
	
	--if there is a product selection type mismatch, then clear the data
	if((promo_product_selection is null) or promo_product_selection != event_product_selection) then
		call price_promo.pc_clear_promo_product_data(_promo_id);
	--if selection types are same
	else
		if(event_product_selection = 'whole_category') then
			FOR hierarchy_l_id IN
			    SELECT unnest(ARRAY[0, 1, 2, 3, 4, -1, -2])
			LOOP
			    _query := format('
						select
			            	array_agg(hierarchy_value_id) as hierarchy_value_id
				        FROM price_promo.included_event_product_hierarchy pm
				        WHERE 
				            event_id = %1$s and hierarchy_level_id = %2$s
				    ', _event_id, hierarchy_l_id);
				raise notice 'event hierarchy query: %', _query;
				execute _query into event_hierarchy_ids;
			
				 _query := format('
						select
			            	array_agg(hierarchy_value_id) as hierarchy_value_id
				        FROM price_promo.included_product_hierarchy pm
				        WHERE 
				            promo_id = %1$s and hierarchy_level_id = %2$s
				    ', _promo_id, hierarchy_l_id);	
				 raise notice 'promo hierarchy query: %', _query;
				 execute _query into promo_hierarchy_ids;
				 
				 if promo_hierarchy_ids is not null 
			       and event_hierarchy_ids is not null
			       and exists (
			            select 1 
			            from unnest(promo_hierarchy_ids) AS promo_id
			            where promo_id not in (select unnest(event_hierarchy_ids))
			       ) 
				    then
						call price_promo.pc_clear_promo_product_data(_promo_id);
				        exit;
			    end if;
			END LOOP;
	
		else
			if(promo_product_selection = 'product_group') then
				promo_products_table := 'included_promo_product_groups';
				event_products_table := 'included_event_product_groups';
				product_key_name := 'product_group_id';
			end if;
		
			--has locked product selection
			select has_locked_product_selection into v_has_locked_product_selection from price_promo.event_master where event_id = _event_id;
	
			_query := format('select array_agg(distinct %3$s)
		    	from price_promo.%2$s where event_id = %1$s', _event_id, event_products_table, product_key_name) ;
		    raise notice 'query 2: %', _query;
			execute _query into event_product_ids;
	
			_query := format('select array_agg(distinct %3$s)
		    	from price_promo.%2$s where promo_id = %1$s', _promo_id, promo_products_table, product_key_name) ;
		    raise notice 'query 4: %', _query;
			execute _query into promo_product_ids;
	
			_query := format('select array_agg(distinct %3$s)
		    	from price_promo.%2$s where promo_id = %1$s
				and %3$s NOT IN (select unnest($1))', _promo_id, promo_products_table, product_key_name) ;
		    raise notice 'query 6: %', _query;
			execute _query into mismatched_product_ids using event_product_ids;
	
			if(((coalesce(array_length(mismatched_product_ids, 1), 0)) > 0) 
			or (v_has_locked_product_selection AND (coalesce(array_length(event_product_ids, 1), 0)) IS DISTINCT FROM (coalesce(array_length(promo_product_ids, 1), 0))))
			then
				call price_promo.pc_clear_promo_product_data(_promo_id);
			end if;
		end if;	
	end if;

	--if there is a store selection type mismatch, then clear the data
	if((promo_store_selection is null) or promo_store_selection != event_store_selection) then
		call price_promo.pc_clear_promo_store_data(_promo_id);
	--if there is no selection type mismatch
	else

		_query := format('select array_agg(distinct store_id)
	    	from price_promo.included_event_stores_%1$s', _event_id) ;
	    raise notice 'query 1: %', _query;
		execute _query into event_store_ids;
	
	    _query := format('select array_agg(distinct store_id)
	    	from price_promo.promo_store_%1$s', _event_id) ;
	    raise notice 'query 3: %', _query;
		execute _query into promo_store_ids;
	
	    _query := format('select array_agg(distinct store_id)
	    	from price_promo.promo_store_%1$s
			where store_id not in (select unnest($1))', _event_id);
	    raise notice 'query 5: %', _query;
		execute _query into mismatched_store_ids using event_store_ids;

		if(((coalesce(array_length(mismatched_store_ids, 1), 0)) > 0) 
		or (v_has_locked_store_selection AND (coalesce(array_length(event_store_ids, 1), 0)) IS DISTINCT FROM (coalesce(array_length(promo_store_ids, 1), 0))))
		then
			call price_promo.pc_clear_promo_store_data(_promo_id);
		end if;	
		
	end if;
		
END;
$function$
;
