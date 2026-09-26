--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_copy_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_copy_promo

DROP FUNCTION if exists price_promo.fn_copy_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_copy_promo(p_promo_id integer, p_event_id integer, p_new_promo_name text, p_new_start_date date, p_new_end_date date, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    old_scenario_id INT;
    new_scenario_id INT;
    _promo_id INTEGER;
    tier_row RECORD;
    prev_tier_row RECORD;
    new_tier_id INTEGER;
    old_tier_id INTEGER;
    temp_scenario_order_id INT;
BEGIN

     -- Create temporary tables
    drop table if exists temp_promo_copy;
    drop table if exists temp_tier_ids;
    drop table if exists prev_tier_ids;
    drop table if exists temp_scenario_tier_map;
    drop table if exists scenario_order_map;
    CREATE TEMP TABLE temp_promo_copy(promo_id INTEGER) ON COMMIT DROP;
    CREATE TEMP TABLE temp_tier_ids(new_tier_id INTEGER, old_tier_id INTEGER) ON COMMIT DROP;
    CREATE TEMP TABLE prev_tier_ids(tier_id INTEGER) ON COMMIT DROP;
    CREATE TEMP TABLE temp_scenario_tier_map(scenario_id INT, tier_id INT) ON COMMIT DROP;
    CREATE TEMP TABLE scenario_order_map(old_scenario_id INT, new_scenario_id INT, order_id INT) ON COMMIT DROP;

	INSERT INTO price_promo.promo_master 
        (
			event_id,
            name,
            step_count,
            start_date,
            end_date,
            promo_code,
            copied_from,
            future_sku_selection,
            status,
            products_count,
            stores_count,
            product_selection_type,
            exclusion_selection_type,
            store_selection_type,
            customer_type,
            offer_distribution_channel,
            created_by,
            created_at,
            copied_at,
			currency_id
        )
    SELECT 
		p_event_id,
        p_new_promo_name,
        step_count,
        p_new_start_date,
        p_new_end_date,
        promo_code,
        p_promo_id,
        future_sku_selection,
        0 AS status,
        products_count,
        stores_count,
        product_selection_type,
        exclusion_selection_type,
        store_selection_type,
        customer_type,
        offer_distribution_channel,
        p_user_id,
        NOW(),
        NOW(),
		currency_id
    FROM 
        price_promo.promo_master
    WHERE 
        promo_id =p_promo_id 
    RETURNING promo_id INTO _promo_id;

	raise notice 'inserted promo id: %', _promo_id;
        
    -- Insert into included_product_hierarchy using generated promo_id
    INSERT INTO price_promo.included_product_hierarchy
        (
            promo_id,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id,
            hierarchy_value_name
        )
    SELECT 
        _promo_id, 
        hierarchy_level_id,
        hierarchy_level_name,
        hierarchy_value_id,
        hierarchy_value_name
    FROM 
        price_promo.included_product_hierarchy
    WHERE 
        promo_id = p_promo_id;
        
    -- Insert new promo_id into temp table
    INSERT INTO temp_promo_copy (promo_id) VALUES (_promo_id);
        
     -- Insert into included_promo_pg_hierarchy using generated promo_id
    INSERT INTO price_promo.included_promo_pg_hierarchy
        (
            promo_id,
            product_group_id,
            product_group_name,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id,
            hierarchy_value_name
        )
    SELECT
        _promo_id,
        product_group_id,
        product_group_name,
        hierarchy_level_id,
        hierarchy_level_name,
        hierarchy_value_id,
        hierarchy_value_name
    FROM 
        price_promo.included_promo_pg_hierarchy
    WHERE
        promo_id = p_promo_id;
        
    -- Insert into included_promo_product_groups using generated promo_id
    INSERT
        INTO
        price_promo.included_promo_product_groups
        (
            promo_id,
            product_group_id,
            product_group_name
        )
    SELECT
        _promo_id,
        product_group_id,
        product_group_name
    FROM
        price_promo.included_promo_product_groups
    WHERE
        promo_id = p_promo_id;
    
	-- Insert into excluded_hierarchy_combination using generated promo_id
    INSERT INTO price_promo.excluded_hierarchy_combination
        (promo_id, hierarchy_level_id, hierarchy_cid, hierarchy_cuq, combination_identifier, hierarchy_id)
    SELECT 
        _promo_id, hierarchy_level_id, hierarchy_cid, hierarchy_cuq, combination_identifier, hierarchy_id
    FROM 
        price_promo.excluded_hierarchy_combination
    WHERE 
        promo_id = p_promo_id;
       
    -- Insert into excluded_product_groups using generated promo_id
    INSERT INTO price_promo.excluded_product_groups
        (promo_id, pg_id, pg_name)
    SELECT 
        _promo_id, pg_id, pg_name
    FROM 
    	price_promo.excluded_product_groups
    WHERE 
        promo_id = p_promo_id;
       
       
	-- Insert into promo_product_hierarchy using generated promo_id
    INSERT INTO price_promo.promo_product_hierarchy
        (promo_id, hierarchy_id)
    SELECT 
        _promo_id, hierarchy_id
    FROM 
    	price_promo.promo_product_hierarchy
    WHERE 
        promo_id = p_promo_id;
        
    -- Insert into tb_promo_store_groups using generated promo_id
    INSERT
        INTO
        price_promo.tb_promo_store_groups
        (
            promo_id,
            store_group_id,
            store_group_name
        )
    SELECT
        _promo_id,
        store_group_id,
        store_group_name
    FROM
        price_promo.tb_promo_store_groups
    WHERE
        promo_id = p_promo_id;
        

    -- Insert into promo_store_hierarchy using generated promo_id
    INSERT
        INTO
        price_promo.promo_store_hierarchy
        (
            promo_id,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id
        )
    SELECT
        _promo_id,
        hierarchy_level_id,
        hierarchy_level_name,
        hierarchy_value_id
    FROM
        price_promo.promo_store_hierarchy
    WHERE
        promo_id = p_promo_id;


    -- Insert into promo_store_sg_hierarchy using generated promo_id
    INSERT
        INTO
        price_promo.promo_store_sg_hierarchy
        (
            promo_id,
            store_group_id,
            store_group_name,
            hierarchy_level_id,
            hierarchy_level_name,
            hierarchy_value_id,
            hierarchy_value_name
        )
    SELECT
        _promo_id,
        store_group_id,
        store_group_name,
        hierarchy_level_id,
        hierarchy_level_name,
        hierarchy_value_id,
        hierarchy_value_name
    FROM
        price_promo.promo_store_sg_hierarchy
    WHERE
        promo_id = p_promo_id;

    -- Create a partition for promo_product if it doesn't exist
	raise notice 'promo id... : % ', _promo_id;
    PERFORM price_promo.fn_create_promo_product_partition_table(_promo_id);

    -- Insert into the partitioned promo_product table
   	EXECUTE format('INSERT INTO price_promo.included_products_%1$s
		(promo_id, product_id, product_name)
    SELECT 
        %1$s, product_id, product_name
    FROM 
    	price_promo.included_products
    WHERE 
        promo_id = %2$s', _promo_id, p_promo_id);
       
                  
     -- Insert into excluded_products using generated promo_id
    EXECUTE format('INSERT INTO price_promo.excluded_products_%1$s
        (promo_id, product_id, product_cid, product_name)
    SELECT 
        %1$s, product_id, product_cid, product_name
    FROM 
    	price_promo.excluded_products
    WHERE 
        promo_id = %2$s', _promo_id, p_promo_id);
       
       
	-- Insert into promo_product using generated promo_id
    EXECUTE format('INSERT INTO price_promo.promo_product_%1$s
        (promo_id, product_id)
    SELECT 
        %1$s, product_id
    FROM 
    	price_promo.promo_product
    WHERE 
        promo_id = %2$s', _promo_id, p_promo_id);

    -- Create a partition for promo_store if it doesn't exist
    PERFORM price_promo.fn_create_promo_store_partition_table(_promo_id);

    -- Insert into the partitioned promo_store table
    EXECUTE format('INSERT INTO %I.promo_store (promo_id, store_id, store_name)
                    SELECT %L, store_id, store_name
                    FROM %I.promo_store
                    WHERE promo_id = %L',
                   'price_promo', _promo_id, 'price_promo', p_promo_id);

	INSERT INTO price_promo.ps_rules 
        (
            promo_id,
            product_discount_level,
            store_discount_level,
            customer_discount_level,
            created_by,
            created_at,
            discount_level,
            discount_type,
            discount_type_id,
            vf_type,
            vf_fixed_amount,
            vf_per_unit,
            min_eff_percent,
            max_eff_percent,
            priority_number,
            min_upto_percent,
            max_upto_percent,
            products_on_max_upto_percent,
            min_discount,
            max_discount,
            discount_type_values,
            min_markdown_frequency,
            max_markdown_frequency,
            step_size,
            markdown_type,
            markdown_budget,
            gross_margin_target,
            gross_margin_lift,
            gross_margin_priority,
            revenue_target,
            revenue_lift,
            revenue_priority,
            units_target,
            units_lift,
            units_priority,
            gross_margin_percent_target,
            gross_margin_percent_lift,
            gross_margin_percent_priority,
            opt_discount_type_id,
            discount_segment,
            competitive_price,
            margin_below,
            maximization_parameter,
            baseline_revenue,
            baseline_margin,
            baseline_units,
            baseline_gm_percent,
            ly_revenue,
            ly_margin,
            ly_units,
            ly_gm_percent,
            targets_edited
        )
    SELECT 
        _promo_id,
        product_discount_level,
        store_discount_level,
        customer_discount_level,
        p_user_id,
        NOW(),
        discount_level,
        discount_type,
        discount_type_id,
        vf_type, 
        vf_fixed_amount, 
        vf_per_unit,
        min_eff_percent,
        max_eff_percent,
        priority_number,
        min_upto_percent,
        max_upto_percent,
        products_on_max_upto_percent,
        min_discount,
        max_discount,
        discount_type_values,
        min_markdown_frequency,
        max_markdown_frequency,
        step_size,
        markdown_type,
        markdown_budget,
        gross_margin_target,
        gross_margin_lift,
        gross_margin_priority,
        revenue_target,
        revenue_lift,
        revenue_priority,
        units_target,
        units_lift,
        units_priority,
        gross_margin_percent_target,
        gross_margin_percent_lift,
        gross_margin_percent_priority,
        opt_discount_type_id,
        discount_segment,
        competitive_price,
        margin_below,
        maximization_parameter,
        baseline_revenue,
        baseline_margin,
        baseline_units,
        baseline_gm_percent,
        ly_revenue,
        ly_margin,
        ly_units,
        ly_gm_percent,
        targets_edited
    FROM 
        price_promo.ps_rules
    WHERE 
        promo_id = p_promo_id;
        
    -- Populate prev_tier_ids
    FOR prev_tier_row IN
        SELECT tier_id
        FROM price_promo.tier_master 
        WHERE promo_id =p_promo_id 
    LOOP
        INSERT INTO prev_tier_ids (tier_id) VALUES (prev_tier_row.tier_id);
    END LOOP;
    
    -- Insert into tier_master and capture new_tier_id
    FOR tier_row IN
        SELECT tier_id FROM price_promo.tier_master WHERE promo_id =p_promo_id 
    LOOP
        INSERT INTO price_promo.tier_master
        (
            promo_id, 
            tier_name, 
            offer_type_id, 
            offer_type, 
            sub_tier_count
        )
        SELECT
            _promo_id,
            tier_name,
            offer_type_id,
            offer_type,
            sub_tier_count
        FROM price_promo.tier_master 
        WHERE tier_id = tier_row.tier_id
        RETURNING tier_id INTO new_tier_id;
        
        -- Track new tier IDs and old tier IDs
        INSERT INTO temp_tier_ids (new_tier_id, old_tier_id)
        VALUES (new_tier_id, tier_row.tier_id);
    END LOOP;
    
    -- Use captured tier_id to insert into tier_discount table
    INSERT INTO price_promo.tier_discounts
    (
        tier_id,
        offer_x_value,
        offer_x_type,
        offer_y_value,
        offer_y_type,
        offer_z_value,
        offer_z_type,
        display_name
    )
    SELECT
        t.new_tier_id,
        td.offer_x_value,
        td.offer_x_type,
        td.offer_y_value,
        td.offer_y_type,
        td.offer_z_value,
        td.offer_z_type,
        td.display_name
    FROM price_promo.tier_discounts td
    left join temp_tier_ids t on td.tier_id = t.old_tier_id
    WHERE td.tier_id IN (SELECT tier_id FROM prev_tier_ids);
    
    -- Insert into scenario_master and capture new_scenario_id and scenario_order_id
    FOR old_scenario_id IN
        SELECT scenario_id
        FROM price_promo.scenario_master
        WHERE promo_id =p_promo_id 
    LOOP
        INSERT INTO price_promo.scenario_master 
        (
            promo_id,
            scenario_name,
            discount_level,
            scenario_order_id,  -- Column from scenario_master table
            created_by,
            created_at,
            copied_scenario
        )
        SELECT  
            _promo_id,
            scenario_name,
            discount_level,
            scenario_order_id,  -- Copy from scenario_master
            p_user_id AS created_by,
            NOW(),
            1
        FROM price_promo.scenario_master
        WHERE scenario_id = old_scenario_id
        RETURNING scenario_id, scenario_order_id INTO new_scenario_id, temp_scenario_order_id;

        -- Map old scenario_id, new scenario_id, and scenario_order_id
        INSERT INTO scenario_order_map (old_scenario_id, new_scenario_id, order_id)
        VALUES (old_scenario_id, new_scenario_id, temp_scenario_order_id);

    END LOOP;

	drop table if exists tb_temp_promo_product_reco_details;
    create temp table tb_temp_promo_product_reco_details as
    SELECT
        product_level_id as old_product_level_id,
        nextval('price_promo.tb_promo_product_reco_details_product_level_id_seq'::regclass) as new_product_level_id,
        product_level_value
    from price_promo.tb_promo_product_reco_details
    where promo_id = p_promo_id;

	drop table if exists tb_temp_promo_store_reco_details;
    create temp table tb_temp_promo_store_reco_details as
    SELECT
        store_level_id as old_store_level_id,
        nextval('price_promo.tb_promo_store_reco_details_store_level_id_seq'::regclass) as new_store_level_id,
        store_level_value
    from price_promo.tb_promo_store_reco_details
    where promo_id = p_promo_id;

	drop table if exists tb_temp_promo_customer_reco_details;
    create temp table tb_temp_promo_customer_reco_details as
    SELECT
        customer_level_id as old_customer_level_id,
        nextval('price_promo.tb_promo_customer_reco_details_customer_level_id_seq'::regclass) as new_customer_level_id,
        customer_level_value
    from price_promo.tb_promo_customer_reco_details
    where promo_id = p_promo_id;

    insert into price_promo.tb_promo_product_reco_details
    (
        promo_id,
        product_level_id,
        product_level_value
    )
    select
        _promo_id,
        new_product_level_id,
        product_level_value
    from tb_temp_promo_product_reco_details;
    
    insert into price_promo.tb_discount_level_products
    (
        product_level_id,
        product_id
    )
    SELECT
        new_product_level_id,
        product_id
    from tb_temp_promo_product_reco_details ttpprd
    inner join price_promo.tb_discount_level_products tdlp 
    on ttpprd.old_product_level_id = tdlp.product_level_id;

    insert into price_promo.tb_promo_store_reco_details
    (
        promo_id,
        store_level_id,
        store_level_value
    )
    select
        _promo_id,
        new_store_level_id,
        store_level_value
    from tb_temp_promo_store_reco_details;

    insert into price_promo.tb_discount_level_stores
    (
        store_level_id,
        store_id
    )
    select  
        new_store_level_id,
        store_id
    from tb_temp_promo_store_reco_details ttpstrd
    inner join price_promo.tb_discount_level_stores tdlst
    on ttpstrd.old_store_level_id = tdlst.store_level_id;

    insert into price_promo.tb_promo_customer_reco_details
    (
        promo_id,
        customer_level_id,
        customer_level_value
    )
    select
        _promo_id,
        new_customer_level_id,
        customer_level_value
    from tb_temp_promo_customer_reco_details;
    

    -- Insert into ps_scenario_discounts with the correct tier_id mapped
    INSERT INTO price_promo.ps_scenario_discounts 
    (
        promo_id,
        product_level_id,
        store_level_id,
        customer_level_id,
        scenario_data
    )
    SELECT
        _promo_id,
        ttpprd.new_product_level_id,
        ttpstrd.new_store_level_id,
        ttpcr.new_customer_level_id,
        price_promo.fn_update_scenario_data_for_copied_promo(
            psd.scenario_data,
            p_old_promo_id => p_promo_id,
            p_new_promo_id => _promo_id
        )
    FROM 
        price_promo.ps_scenario_discounts psd
    left JOIN  tb_temp_promo_product_reco_details ttpprd ON ttpprd.old_product_level_id = psd.product_level_id
    left join tb_temp_promo_store_reco_details ttpstrd ON ttpstrd.old_store_level_id = psd.store_level_id
    left join tb_temp_promo_customer_reco_details ttpcr ON ttpcr.old_customer_level_id = psd.customer_level_id
    WHERE 
        psd.promo_id = p_promo_id;
    
    -- Refresh the materialized view holding product pg promo hierarchy information
    -- PERFORM global.fn_refresh_materialized_view('price_promo', 'mvw_wc_product_pg_promo_hierarchy');

    perform price_promo.fn_update_promo_stacked_offers_mapping_with_flag_updates(array[_promo_id]);
	call price_promo_opt.pc_refresh_promo_inventory(array[_promo_id]::int[]);
    perform price_promo.fn_save_workbench_ps_rules_objectives_metrics(_promo_id,true);
   

    -- Select the new promo_id from the temporary table
    return (SELECT promo_id FROM temp_promo_copy);
END;
$function$
;
