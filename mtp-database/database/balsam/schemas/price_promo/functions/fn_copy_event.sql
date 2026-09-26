--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_copy_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_copy_event

DROP FUNCTION if exists price_promo.fn_copy_event;

CREATE OR REPLACE FUNCTION price_promo.fn_copy_event(p_event_id integer, p_new_event_name text, p_new_start_date date, p_new_end_date date, p_submit_offers_by_date date, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 security definer
AS $function$
DECLARE
    _event_id INTEGER;
	_query text;
BEGIN

    -- Insert into event_master and get the new event_id
    INSERT INTO price_promo.event_master 
        (
            name,
            start_date,
			end_date,
			submit_by,
			ad_type,
			event_type,
			marketing_notes,
			objective,
			discounting_level,
			product_inclusion_type,
			has_locked_product_selection,
			store_selection_type,
			has_locked_store_selection,
			product_exclusion_type,
			created_by,
			created_at
        )
    SELECT 
		p_new_event_name,
        p_new_start_date,
        p_new_end_date,
		p_submit_offers_by_date,
		ad_type,
		event_type,
		marketing_notes,
		objective,
		discounting_level,
		product_inclusion_type,
		has_locked_product_selection,
		store_selection_type,
		has_locked_store_selection,
		product_exclusion_type,
		p_user_id,
		NOW()
    FROM 
        price_promo.event_master
    WHERE 
        event_id =p_event_id 
    RETURNING event_id INTO _event_id;

	raise notice 'inserted event id: %', _event_id;

	--Insert into event attribute mapping table for the new event_id
	INSERT INTO price_promo.event_attribute_mapping
		(
			event_id,
			attribute_id,
			attribute_value
		)
	SELECT
		_event_id,
		attribute_id,
		attribute_value
	FROM
		price_promo.event_attribute_mapping
	WHERE
		event_id = p_event_id;

	INSERT INTO price_promo.event_date_restrictions
		(
			event_id,
			min_promo_duration,
			max_promo_duration,
			promo_start_date,
			promo_end_date,
			use_same_as_event
		)
	SELECT
		_event_id,
		null,
		null,
		null,
		null,
		use_same_as_event
	FROM
		price_promo.event_date_restrictions
	WHERE
		event_id = p_event_id;
        
    -- Insert into included_product_hierarchy using generated event_id
    INSERT INTO price_promo.included_event_product_hierarchy
        (
            event_id,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id,
            hierarchy_value_name
        )
    SELECT 
        _event_id, 
        hierarchy_level_id,
        hierarchy_level_name,
        hierarchy_value_id,
        hierarchy_value_name
    FROM 
        price_promo.included_event_product_hierarchy
    WHERE 
        event_id = p_event_id;
        
    -- Insert into included_event_product_groups using generated event_id
    INSERT
        INTO
        price_promo.included_event_product_groups
        (
            event_id,
            product_group_id
        )
    SELECT
        _event_id,
        product_group_id
    FROM
        price_promo.included_event_product_groups
    WHERE
        event_id = p_event_id;

       
    -- Insert into excluded_event_product_groups using generated event_id
    INSERT INTO price_promo.excluded_event_product_groups
        (event_id, product_group_id)
    SELECT 
        _event_id, product_group_id
    FROM 
    	price_promo.excluded_event_product_groups
    WHERE 
        event_id = p_event_id;
       
       
	-- Insert into event_product_hierarchy using generated event_id
    INSERT INTO price_promo.event_product_hierarchy
        (event_id, hierarchy_id)
    SELECT 
        _event_id, hierarchy_id
    FROM 
    	price_promo.event_product_hierarchy
    WHERE 
        event_id = p_event_id;
        

    -- Insert into event_store_hierarchy using generated event_id
    INSERT
        INTO
        price_promo.included_event_store_hierarchy
        (
            event_id,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id,
			hierarchy_value_name
        )
    SELECT
        _event_id,
        hierarchy_level_id,
        hierarchy_level_name,
        hierarchy_value_id,
		hierarchy_value_name
    FROM
        price_promo.included_event_store_hierarchy
    WHERE
        event_id = p_event_id;


	--Insert into event store hierarchy
	INSERT INTO price_promo.event_store_hierarchy
		(
			event_id,
			hierarchy_id
		)
	SELECT
		_event_id,
		hierarchy_id
	FROM 
		price_promo.event_store_hierarchy
	WHERE
		event_id = p_event_id;

	_query := format('create table if not exists price_promo.included_event_stores_%1$s 
                        partition of price_promo.included_event_stores for values in (%1$s)', 
                    _event_id);
    raise notice 'partition create query for stores: %', _query;
    execute _query;


	--Insert into included_event_store_groups for the new event_id
	INSERT INTO price_promo.included_event_store_groups
		(
			event_id,
			store_group_id
		)
	SELECT
		_event_id,
		store_group_id
	FROM
		price_promo.included_event_store_groups
	WHERE
		event_id = p_event_id;
		

	--Insert into included_event_stores for the new event_id
	INSERT INTO price_promo.included_event_stores
		(
			event_id,
			store_id
		)
	SELECT
		_event_id,
		store_id
	FROM
		price_promo.included_event_stores
	WHERE
		event_id = p_event_id;
	

    -- Insert into event_store_sg_hierarchy using generated event_id
    INSERT
        INTO
        price_promo.event_store_sg_hierarchy
        (
            event_id,
            store_group_id,
            store_group_name,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id,
            hierarchy_value_name
        )
    SELECT
        _event_id,
        store_group_id,
        store_group_name,
        hierarchy_level_id,
        hierarchy_level_name,
        hierarchy_value_id,
        hierarchy_value_name
    FROM
        price_promo.event_store_sg_hierarchy
    WHERE
        event_id = p_event_id;

    -- Create a partition for event_product if it doesn't exist
	raise notice 'event id... : % ', _event_id;
    _query := format('CREATE TABLE IF NOT EXISTS price_promo.included_event_products_%1$s 
                        PARTITION OF price_promo.included_event_products FOR VALUES IN (%1$s)', 
                    _event_id);
    raise notice 'partition create query : %', _query;
    EXECUTE _query;

    -- Insert into the partitioned event_product table
   	EXECUTE format('INSERT INTO price_promo.included_event_products_%1$s
		(event_id, product_id)
    SELECT 
        %1$s, product_id
    FROM 
    	price_promo.included_event_products_%2$s
    ', _event_id, p_event_id);
       

	execute format('CREATE TABLE if not exists price_promo.event_product_%1$s PARTITION OF price_promo.event_product FOR VALUES IN (%1$s);', _event_id); 
       
	-- Insert into event_product using generated promo_id
    EXECUTE format('INSERT INTO price_promo.event_product_%1$s
        (event_id, product_id)
    SELECT 
        %1$s, product_id
    FROM 
    	price_promo.event_product
    WHERE 
        event_id = %2$s', _event_id, p_event_id);

    -- Create a partition for promo_store if it doesn't exist
    execute format('CREATE TABLE if not exists price_promo.event_stores_%1$s PARTITION OF price_promo.event_stores FOR VALUES IN (%1$s);', _event_id); 

    -- Insert into the partitioned promo_store table
    EXECUTE format('INSERT INTO price_promo.event_stores (event_id, store_id)
                    SELECT %L, store_id
                    FROM price_promo.event_stores
                    WHERE event_id = %L',
                   _event_id, p_event_id);
   

    -- Select the new event_id from the temporary table
    return _event_id;
END;
$function$
;