--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_copy_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_copy_promo

DROP FUNCTION if exists price_promo.fn_copy_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_copy_promo(
    p_promo_id integer,
    p_event_id integer,
    p_new_promo_name text,
    p_new_start_date date,
    p_new_end_date date,
    p_user_id integer,
    p_review_status integer DEFAULT NULL::integer,
    p_parent_vendor_promo_id integer DEFAULT NULL::integer,
    p_status integer DEFAULT 0,
    p_update_review_status_timestamp boolean DEFAULT false,
    p_is_vendor_created_promo boolean DEFAULT NULL,
    p_vendor_created_by integer DEFAULT NULL
)
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

    -- For dynamic SQL
    table_name TEXT;
    columns_data TEXT;
    columns_full TEXT;
    select_stmt TEXT;
    sql_stmt TEXT;
    _columns TEXT;
    _values TEXT;
    _sql TEXT;

    -- All simple tables to be copied
    promo_table_list TEXT[] := ARRAY[
        'included_product_hierarchy',
        'included_promo_pg_hierarchy',
        'included_promo_product_groups',
        'excluded_hierarchy_combination',
        'excluded_product_groups',
        'promo_product_hierarchy',
        'tb_promo_store_groups',
        'promo_store_hierarchy',
        'promo_store_sg_hierarchy',
        'tb_promo_customer_hierarchy',
        'tb_promo_customers'
    ];

    -- All partitioned tables to be created/copied
    partitioned_tablenames TEXT[] := ARRAY[
        'included_products',
        'excluded_products',
        'promo_product',
        'promo_store'
    ];

BEGIN
    -- Separate DROP TABLE IF EXISTS statements for each temp table
    DROP TABLE IF EXISTS temp_promo_copy;
    DROP TABLE IF EXISTS temp_tier_ids;
    DROP TABLE IF EXISTS prev_tier_ids;
    DROP TABLE IF EXISTS temp_scenario_tier_map;
    DROP TABLE IF EXISTS scenario_order_map;

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
            review_status,
            products_count,
            kvi_tagged_products_count,
            stores_count,
            product_selection_type,
            exclusion_selection_type,
            store_selection_type,
            customer_type,
            offer_distribution_channel,
            created_by,
            created_at,
            copied_at,
			currency_id,
            parent_vendor_promo_id,
            is_vendor_created_promo,
            vendor_created_by,
            review_status_updated_at
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
        CASE WHEN pm.status = -1 THEN -1 ELSE p_status END AS status,
        p_review_status AS review_status,
        products_count,
        kvi_tagged_products_count,
        stores_count,
        product_selection_type,
        exclusion_selection_type,
        store_selection_type,
        customer_type,
        offer_distribution_channel,
        p_user_id,
        NOW(),
        NOW(),
		currency_id,
        COALESCE(p_parent_vendor_promo_id, pm.parent_vendor_promo_id) AS parent_vendor_promo_id,
        COALESCE(p_is_vendor_created_promo, pm.is_vendor_created_promo) AS is_vendor_created_promo,
        CASE 
            WHEN COALESCE(p_is_vendor_created_promo, pm.is_vendor_created_promo) = TRUE
            THEN COALESCE(p_vendor_created_by, p_user_id) 
            ELSE p_vendor_created_by
        END AS vendor_created_by,
        CASE 
            WHEN p_update_review_status_timestamp IS true THEN now()
            ELSE NULL
        END
    FROM 
        price_promo.promo_master pm
    WHERE 
        promo_id =p_promo_id 
    RETURNING promo_id INTO _promo_id;

	raise notice 'inserted promo id: %', _promo_id;

    -- Insert into ps_rules (dynamic column mapping)
    SELECT price_promo.fn_get_table_columns(
      'price_promo',
      'ps_rules',
      ARRAY['rule_id']
    ) INTO _columns;
    
    _values := price_promo.fn_replace_values(
      _columns,
      jsonb_build_object(
        'promo_id',    _promo_id::text,
        'created_by',  p_user_id::text,
        'created_at',  'NOW() AS created_at'
      )
    );
    
    _sql := format($fmt$
     INSERT INTO price_promo.ps_rules (%1$s)
     SELECT %2$s
       FROM price_promo.ps_rules
      WHERE promo_id = %3$L
    $fmt$,
      _columns,
      _values,
      p_promo_id
    );

    EXECUTE _sql;

    INSERT INTO temp_promo_copy (promo_id) VALUES (_promo_id);

    -- Copy all simple tables in a loop
    FOREACH table_name IN ARRAY promo_table_list LOOP
        SELECT price_promo.fn_get_table_columns('price_promo', table_name, NULL)
        INTO columns_data;

        columns_full := columns_data;
        select_stmt := regexp_replace(columns_data, 'promo_id', format('%1$L AS promo_id', _promo_id), '');

        sql_stmt := format(
            'INSERT INTO price_promo.%1$I (%2$s) SELECT %3$s FROM price_promo.%1$I WHERE promo_id = %4$L',
            table_name, columns_full, select_stmt, p_promo_id
        );
        RAISE NOTICE '%', sql_stmt;
        EXECUTE sql_stmt;
    END LOOP;

    -- Partitioned tables: create all first, then insert
    FOREACH table_name IN ARRAY partitioned_tablenames LOOP
        _sql := format(
            'CREATE TABLE IF NOT EXISTS price_promo.%1$I_%2$s PARTITION OF price_promo.%1$I FOR VALUES IN (%2$s)',
            table_name, _promo_id
        );
        RAISE NOTICE 'Creating partition: %', _sql;
        EXECUTE _sql;
    END LOOP;

    FOREACH table_name IN ARRAY partitioned_tablenames LOOP
        SELECT price_promo.fn_get_table_columns(
            'price_promo', table_name || '_' || p_promo_id, ARRAY['promo_id']
        ) INTO columns_data;

        IF to_regclass(format('price_promo.%1$I_%2$s', table_name, p_promo_id)) IS NOT NULL THEN
            sql_stmt := format(
                'INSERT INTO price_promo.%1$I_%2$s (promo_id, %3$s)
                 SELECT %2$s, %3$s
                   FROM price_promo.%1$I_%4$s
                  WHERE promo_id = %4$s',
                table_name, _promo_id, columns_data, p_promo_id
            );
            RAISE NOTICE 'Inserting into partition: %', sql_stmt;
            EXECUTE sql_stmt;
        END IF;
    END LOOP;

    -- --- Tier mapping ---
    INSERT INTO prev_tier_ids(tier_id)
    SELECT tier_id
    FROM price_promo.tier_master
    WHERE promo_id = p_promo_id;

    FOR tier_row IN
        SELECT * FROM price_promo.tier_master WHERE promo_id = p_promo_id
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

        INSERT INTO temp_tier_ids (new_tier_id, old_tier_id)
        VALUES (new_tier_id, tier_row.tier_id);
    END LOOP;

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
    LEFT JOIN temp_tier_ids t ON td.tier_id = t.old_tier_id
    WHERE td.tier_id IN (SELECT tier_id FROM prev_tier_ids);

    -- --- Scenario mapping ---
    FOR old_scenario_id IN
        SELECT scenario_id FROM price_promo.scenario_master WHERE promo_id = p_promo_id
    LOOP
        INSERT INTO price_promo.scenario_master
        (
            promo_id,
            scenario_name,
            discount_level,
            scenario_order_id,
            created_by,
            created_at,
            copied_scenario
        )
        SELECT
            _promo_id,
            scenario_name,
            discount_level,
            scenario_order_id,
            p_user_id AS created_by,
            NOW(),
            1
        FROM price_promo.scenario_master
        WHERE scenario_id = old_scenario_id
        RETURNING scenario_id, scenario_order_id INTO new_scenario_id, temp_scenario_order_id;

        INSERT INTO scenario_order_map (old_scenario_id, new_scenario_id, order_id)
        VALUES (old_scenario_id, new_scenario_id, temp_scenario_order_id);
    END LOOP;

    -- Product/store/customer reco and discounts
    DROP TABLE IF EXISTS tb_temp_promo_product_reco_details;
    CREATE TEMP TABLE tb_temp_promo_product_reco_details AS
    SELECT
        product_level_id AS old_product_level_id,
        nextval('price_promo.tb_promo_product_reco_details_product_level_id_seq'::regclass) AS new_product_level_id,
        product_level_value
    FROM price_promo.tb_promo_product_reco_details
    WHERE promo_id = p_promo_id;

    DROP TABLE IF EXISTS tb_temp_promo_store_reco_details;
    CREATE TEMP TABLE tb_temp_promo_store_reco_details AS
    SELECT
        store_level_id AS old_store_level_id,
        nextval('price_promo.tb_promo_store_reco_details_store_level_id_seq'::regclass) AS new_store_level_id,
        store_level_value
    FROM price_promo.tb_promo_store_reco_details
    WHERE promo_id = p_promo_id;

    DROP TABLE IF EXISTS tb_temp_promo_customer_reco_details;
    CREATE TEMP TABLE tb_temp_promo_customer_reco_details AS
    SELECT
        customer_level_id AS old_customer_level_id,
        nextval('price_promo.tb_promo_customer_reco_details_customer_level_id_seq'::regclass) AS new_customer_level_id,
        customer_level_value
    FROM price_promo.tb_promo_customer_reco_details
    WHERE promo_id = p_promo_id;

    INSERT INTO price_promo.tb_promo_product_reco_details
    (
        promo_id,
        product_level_id,
        product_level_value
    )
    SELECT
        _promo_id,
        new_product_level_id,
        product_level_value
    FROM tb_temp_promo_product_reco_details;

    INSERT INTO price_promo.tb_discount_level_products
    (
        product_level_id,
        product_id
    )
    SELECT
        new_product_level_id,
        product_id
    FROM tb_temp_promo_product_reco_details ttpprd
    INNER JOIN price_promo.tb_discount_level_products tdlp
        ON ttpprd.old_product_level_id = tdlp.product_level_id;

    INSERT INTO price_promo.tb_promo_store_reco_details
    (
        promo_id,
        store_level_id,
        store_level_value
    )
    SELECT
        _promo_id,
        new_store_level_id,
        store_level_value
    FROM tb_temp_promo_store_reco_details;

    INSERT INTO price_promo.tb_discount_level_stores
    (
        store_level_id,
        store_id
    )
    SELECT
        new_store_level_id,
        store_id
    FROM tb_temp_promo_store_reco_details ttpstrd
    INNER JOIN price_promo.tb_discount_level_stores tdlst
        ON ttpstrd.old_store_level_id = tdlst.store_level_id;

    INSERT INTO price_promo.tb_promo_customer_reco_details
    (
        promo_id,
        customer_level_id,
        customer_level_value
    )
    SELECT
        _promo_id,
        new_customer_level_id,
        customer_level_value
    FROM tb_temp_promo_customer_reco_details;

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
    FROM price_promo.ps_scenario_discounts psd
    LEFT JOIN tb_temp_promo_product_reco_details  ttpprd
        ON ttpprd.old_product_level_id   = psd.product_level_id
    LEFT JOIN tb_temp_promo_store_reco_details    ttpstrd
        ON ttpstrd.old_store_level_id     = psd.store_level_id
    LEFT JOIN tb_temp_promo_customer_reco_details ttpcr
        ON ttpcr.old_customer_level_id     = psd.customer_level_id
    WHERE psd.promo_id = p_promo_id;

       --Add new exclusion pg_id from the new event_id
    INSERT INTO price_promo.excluded_product_groups
        (promo_id, pg_id, pg_name)
    SELECT 
        _promo_id, pg_id, tpg.pg_name as pg_name
    FROM 
    	price_promo.excluded_event_product_groups eepg
        inner join pricesmart.tb_product_group tpg
        on tpg.pg_id = eepg.product_group_id
    WHERE 
        event_id = p_event_id
        AND NOT EXISTS (
            SELECT 1 
            FROM price_promo.excluded_product_groups epg
            WHERE epg.promo_id = _promo_id 
            AND epg.pg_id = eepg.product_group_id
        );

    perform price_promo.fn_save_promo_final_hierarchy(_promo_id, p_user_id);
	perform price_promo.fn_save_promo_final_products(_promo_id, p_user_id);

    perform price_promo.fn_refresh_promo_scenario_data(_promo_id);
    PERFORM price_promo.fn_update_promo_stacked_offers_mapping_with_flag_updates(array[_promo_id]);
    CALL price_promo_opt.pc_refresh_promo_inventory(array[_promo_id]::int[]);
    PERFORM price_promo.fn_save_workbench_ps_rules_objectives_metrics(_promo_id, true);

    -- Return the new promo_id
    RETURN (SELECT promo_id FROM temp_promo_copy);

END;
$function$;

