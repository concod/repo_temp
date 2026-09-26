--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_populate_scenario_discounts_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_populate_scenario_discounts_table

DROP FUNCTION if exists price_promo.fn_populate_scenario_discounts_table;
CREATE OR REPLACE FUNCTION price_promo.fn_populate_scenario_discounts_table(p_promo_id integer, p_user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _product_discounting_level text;
    _product_discounting_level_names text;
    _product_discounting_level_columns text;
    _store_discounting_level text;
    _store_discounting_level_names text;
    _store_discounting_level_columns text;
    _customer_discounting_level text;
    _selected_product_levels int[];
    _selected_store_levels int[];
    _query text;
    _scenario_id int;
    _join_mode text;
    _eligibility_config jsonb;
    _product_eligibility_columns text[];
    _store_eligibility_columns text[];
    _eligibility_join_condition text;
    _additional_join_clause text;
	_step_start timestamptz;
    _partition_name text;
    _discount_type_id int;
    _discount_type varchar(100);
    _scenario_data jsonb;
    _product_work_table text;
    _store_work_table text;
BEGIN
	set local synchronous_commit = off;

    delete from price_promo.ps_scenario_discounts where promo_id = p_promo_id;
    delete from price_promo.scenario_master where promo_id = p_promo_id;
    delete from price_promo.tb_promo_product_reco_details where promo_id = p_promo_id;
    delete from price_promo.tb_promo_store_reco_details where promo_id = p_promo_id;
    delete from price_promo.tb_promo_customer_reco_details where promo_id = p_promo_id;


    if exists(
        select 1 from price_promo.promo_master 
        where 
            promo_id = p_promo_id 
            and (
                products_count = 0 or stores_count = 0
            )
        )
    then
        raise notice 'promo has no products or stores so skipping the scenario discounts table population';
        return;
    end if;
	
	_product_work_table := 'tb_psd_prod_reco_' || p_promo_id::text;
    _store_work_table := 'tb_psd_store_reco_' || p_promo_id::text;

    select product_discount_level into _selected_product_levels from price_promo.ps_rules where promo_id = p_promo_id;
    select store_discount_level into _selected_store_levels from price_promo.ps_rules where promo_id = p_promo_id;

    if _selected_product_levels != array[-100] then
        SELECT  
            array_to_string(
                array_agg(
                    format(
                        '
                        ''%1$s'',pm.%1$s,
                        ''%2$s'',pm.%2$s
                        ',
                        dlc.id_key,
                        dlc.value_key
                    )
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('pm.%s', dlc.value_key)
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('pm.%s,pm.%s', dlc.id_key, dlc.value_key)
                ),
                ','
            )
        from price_promo.discount_level_config dlc
        where 
            dlc.discount_level_id in (select unnest(product_discount_level) from price_promo.ps_rules where promo_id = p_promo_id)
            and dlc.category = 'product'
            and dlc.discount_level_id != -200
        into _product_discounting_level, _product_discounting_level_names, _product_discounting_level_columns;
    end if;

    if _selected_store_levels != array[-100] then
        select 
            array_to_string(
                array_agg(
                    format(
                        '
                        ''%1$s'',sm.%1$s,
                        ''%2$s'',sm.%2$s
                        ',
                        dlc.id_key,
                        dlc.value_key
                    )
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('sm.%s', dlc.value_key)
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('sm.%s,sm.%s', dlc.id_key, dlc.value_key)
                ),
                ','
            )
        from price_promo.discount_level_config dlc
        where 
            dlc.discount_level_id in (select unnest(store_discount_level) from price_promo.ps_rules where promo_id = p_promo_id)
            and dlc.category = 'store'
            and dlc.discount_level_id != -200
         into _store_discounting_level, _store_discounting_level_names, _store_discounting_level_columns;
    end if;

    raise notice 'store discounting level: %1$s', _store_discounting_level;

    select 
        array_to_string(
            array_agg(
                format(
                    '
                    ''%1$s'',%1$s,
                    ''%2$s'',%2$s
                    ',
                    dlc.id_key,
                    dlc.value_key
                )
            ),
            ','
        ) into _customer_discounting_level
    from price_promo.discount_level_config dlc
    where 
        dlc.discount_level_id in (select unnest(customer_discount_level) from price_promo.ps_rules where promo_id = p_promo_id)
        and dlc.category = 'customer'
        and dlc.discount_level_id != -200
    ;

    raise notice 'product discounting level: %1$s', _product_discounting_level;
    raise notice 'product discounting level names: %1$s', _product_discounting_level_names;
    raise notice 'product discounting level columns: %1$s', _product_discounting_level_columns;
    raise notice 'store discounting level: %1$s', _store_discounting_level;
    raise notice 'customer discounting level: %1$s', _customer_discounting_level;

    -- Read join mode configuration
    _join_mode = price_promo.fn_get_configuration_value('promo', 'product_store_join_mode');
    
    if _join_mode is null then
        _join_mode := 'cross_join'; -- default to cross join
    end if;

    raise notice 'join mode: %1$s', _join_mode;

    -- Read eligibility join configuration
    if _join_mode = 'eligibility_join' then
        _eligibility_config = price_promo.fn_get_configuration_value('promo', 'product_store_eligibility_join_config')::jsonb;
        
        if _eligibility_config is not null then
            select array_agg(value::text) into _product_eligibility_columns
            from jsonb_array_elements_text(_eligibility_config->'product_hierarchy_columns');
            
            select array_agg(value::text) into _store_eligibility_columns
            from jsonb_array_elements_text(_eligibility_config->'store_hierarchy_columns');
            
            raise notice 'product eligibility columns: %1$s', _product_eligibility_columns;
            raise notice 'store eligibility columns: %1$s', _store_eligibility_columns;
        end if;
    end if;

    if _product_discounting_level != '' then
        _query = format(
            '
            create unlogged table price_promo.%5$I as 
            select
                sub.promo_id,
                sub.product_level_value,
                sub.product_ids,
                nextval(''price_promo.tb_promo_product_reco_details_product_level_id_seq''::regclass) as product_level_id
            from (
                select 
                    %1$s as promo_id,
                    jsonb_build_object(
                        %2$s
                    ) as product_level_value,
                    array_agg(product_id) as product_ids
                from 
                    price_promo.product_master pm
                where product_id in (
                    select product_id from price_promo.promo_product
                    where promo_id = %1$s
                )
                or (
                    exists(select 1 from price_promo.promo_master where promo_id = %1$s and product_selection_type = 1)
                    and is_active = 1
                )
                group by %4$s
            ) sub;
			create index idx_%5$I_product_level_id on price_promo.%5$I(product_level_id);
            ',
            p_promo_id,
            _product_discounting_level,
            _product_discounting_level_names,
            _product_discounting_level_columns,
			_product_work_table
        );
        raise notice 'product discounting level insertion query: %1$s', _query;

        execute _query;

        
    elsif _selected_product_levels = array[-100] then

        execute format(
            $p$
            create unlogged table price_promo.%1$I as
            select
                sub.promo_id,
                sub.product_level_value,
                sub.product_ids,
                nextval('price_promo.tb_promo_product_reco_details_product_level_id_seq'::regclass) as product_level_id
            from (
                select 
                    %2$s as promo_id,
                    jsonb_build_object(
                        'pg_name',tpg.pg_name,
                        'pg_id',tpg.pg_id
                    ) as product_level_value,
                    array_agg(tpp.product_id) as product_ids
                from 
                    price_promo.included_promo_product_groups ippg
                inner join
                    pricesmart.tb_product_group tpg
                on ippg.product_group_id = tpg.pg_id
                inner join pricesmart.tb_pg_product tpp
                on tpg.pg_id = tpp.pg_id
                inner join price_promo.product_master pm
                on tpp.product_id = pm.product_id
                where ippg.promo_id = %2$s
                and tpp.product_id in (
                    select product_id from price_promo.promo_product
                    where promo_id = %2$s
                )
                group by tpg.pg_id, tpg.pg_name
            ) sub
            $p$,
            _product_work_table,
            p_promo_id
        );

    else 
        execute format(
            $p$
            create unlogged table price_promo.%1$I as 
            select
                %2$s as promo_id,
                null::jsonb as product_level_value,
                array[]::int[] as product_ids,
                nextval('price_promo.tb_promo_product_reco_details_product_level_id_seq'::regclass) as product_level_id
            $p$,
            _product_work_table,
            p_promo_id
        );

    end if;
    
    execute format(
        $p$
        insert into price_promo.tb_promo_product_reco_details
        (product_level_id, promo_id, product_level_value)
        select 
            product_level_id,
            promo_id,
            product_level_value
        from price_promo.%I
        $p$,
        _product_work_table
    );
    

    if _store_discounting_level != '' then
        _query = format(
            '
            create unlogged table price_promo.%5$I as 
            select
                sub.promo_id,
                sub.store_level_value,
                sub.store_ids,
                nextval(''price_promo.tb_promo_store_reco_details_store_level_id_seq''::regclass) as store_level_id
            from (
                select 
                    %1$s as promo_id,
                    jsonb_build_object(
                        %2$s
                    ) as store_level_value,
                    array_agg(store_id) as store_ids
                from global.tb_store_master sm
                where store_id in (
                    select store_id from price_promo.promo_store
                    where promo_id = %1$s
                )
                or (
                    exists(select 1 from price_promo.promo_master where promo_id = %1$s and store_selection_type = 1)
                    and is_active = 1
                )
                group by %4$s
            ) sub;
            create index idx_%5$I_store_level_id on price_promo.%5$I(store_level_id);
            ',
            p_promo_id,
            _store_discounting_level,
            _store_discounting_level_names,
            _store_discounting_level_columns,
			_store_work_table
        );
        raise notice 'store discounting level insertion query: %1$s', _query;

        execute _query;

        
    elsif _selected_store_levels = array[-100] then

        execute format(
            $s$
            create unlogged table price_promo.%1$I as
            select
                sub.promo_id,
                sub.store_level_value,
                sub.store_ids,
                nextval('price_promo.tb_promo_store_reco_details_store_level_id_seq'::regclass) as store_level_id
            from (
                select 
                    %2$s as promo_id,
                    jsonb_build_object(
                        'sg_name',tsg.sg_name,
                        'sg_id',tsg.sg_id
                    ) as store_level_value,
                    array_agg(tss.store_id) as store_ids
                from 
                price_promo.tb_promo_store_groups tpsg
                inner join
                    pricesmart.tb_store_group tsg
                on tpsg.store_group_id = tsg.sg_id
                inner join pricesmart.tb_sg_store tss
                on tsg.sg_id = tss.sg_id
                where tpsg.promo_id = %2$s
                and tss.store_id in (
                    select store_id from price_promo.promo_store
                    where promo_id = %2$s
                )
                group by tsg.sg_id, tsg.sg_name
            ) sub
            $s$,
            _store_work_table,
            p_promo_id
        );
        
    else 
        execute format(
            $s$
            drop table if exists price_promo.%1$I;
            create unlogged table price_promo.%1$I as
            select
                %2$s as promo_id,
                null::jsonb as store_level_value,
                array[]::int[] as store_ids,
                nextval('price_promo.tb_promo_store_reco_details_store_level_id_seq'::regclass) as store_level_id
            $s$,
            _store_work_table,
            p_promo_id
        );
    end if;
    
    execute format(
        $s$
        insert into price_promo.tb_promo_store_reco_details
        (store_level_id, promo_id, store_level_value)
        select 
            store_level_id,
            promo_id,
            store_level_value
        from price_promo.%I
        $s$,
        _store_work_table
    );

    insert into price_promo.scenario_master
    (promo_id,scenario_name,scenario_order_id,created_by)
    VALUES
    (p_promo_id,'Scenario 1',1,p_user_id)
    RETURNING scenario_id into _scenario_id;

    -- IDs are already generated above using the actual sequences
    -- Now we can use product_level_id and store_level_id for faster joins
    
    -- Build dynamic join condition and create filtered temp table for Mode B and C
    _eligibility_join_condition := '';
    _additional_join_clause := '';
    
    -- Create expanded temp tables for Mode B and C (common for both eligibility and inventory joins)
    if _join_mode in ('eligibility_join', 'inventory_join') then
        
        

		_query := format('
		    drop table if exists temp_product_level_expanded;
		    create temp table temp_product_level_expanded as
		    select
		        tpprd.product_level_id,
		        unnest(tpprd.product_ids) as product_id
		    from price_promo.%I tpprd;
		    create index idx_temp_ple_product on temp_product_level_expanded(product_id);
		    
		    drop table if exists temp_store_level_expanded;
		    create temp table temp_store_level_expanded as
		    select
		        tpstrd.store_level_id,
		        unnest(tpstrd.store_ids) as store_id
		    from price_promo.%I tpstrd;
		    create index idx_temp_sle_store on temp_store_level_expanded(store_id);
		', _product_work_table, _store_work_table);
		
		execute _query;

    end if;
    
    -- For Mode B and C, create a temp table with valid product-store combinations to avoid Cartesian product
    if _join_mode = 'eligibility_join' and _product_eligibility_columns is not null and _store_eligibility_columns is not null 
       and array_length(_product_eligibility_columns, 1) > 0 and array_length(_store_eligibility_columns, 1) > 0 then
        -- Mode B: Build eligibility join condition
        if array_length(_product_eligibility_columns, 1) > 0 then
            _eligibility_join_condition := (
                select string_agg(
                    format('pse.%1$s = pm.%1$s', col),
                    ' AND '
                )
                from unnest(_product_eligibility_columns) col
            );
        end if;
        
        if array_length(_store_eligibility_columns, 1) > 0 then
            if _eligibility_join_condition != '' then
                _eligibility_join_condition := _eligibility_join_condition || ' AND ';
            end if;
            _eligibility_join_condition := _eligibility_join_condition || (
                select string_agg(
                    format('pse.%1$s = sm.%1$s', col),
                    ' AND '
                )
                from unnest(_store_eligibility_columns) col
            );
        end if;
        
        -- Create temp table with valid product_level_id and store_level_id combinations from eligibility table
        -- Join order optimized: eligibility -> product_master -> temp_product -> store_master -> temp_store
        -- This avoids Cartesian product by filtering early with eligibility table
        -- Store level IDs directly for efficient joins later
        _query := format(
            '
            drop table if exists temp_valid_product_store_combinations;
            create temp table temp_valid_product_store_combinations as
            select distinct
                tple.product_level_id,
                tsle.store_level_id
            from
                pricesmart.product_store_eligibility pse
            inner join
                price_promo.product_master pm
                on (%1$s)
            inner join
                temp_product_level_expanded tple
                on tple.product_id = pm.product_id
            inner join
                pricesmart.tb_store_master sm
                on (%2$s)
            inner join
                temp_store_level_expanded tsle
                on tsle.store_id = sm.store_id;
            create index idx_temp_valid_ps_combo on temp_valid_product_store_combinations(product_level_id, store_level_id);
            ',
            (
                select string_agg(
                    format('pse.%1$s = pm.%1$s', col),
                    ' AND '
                )
                from unnest(_product_eligibility_columns) col
            ),
            (
                select string_agg(
                    format('pse.%1$s = sm.%1$s', col),
                    ' AND '
                )
                from unnest(_store_eligibility_columns) col
            )
        );
        execute _query;
        
        -- Use the filtered temp table for efficient direct joins using level IDs
        _additional_join_clause := '
            inner join
            temp_valid_product_store_combinations tvpsc
            on tvpsc.product_level_id = tpprd_temp.product_level_id
            and tvpsc.store_level_id = tpstrd_temp.store_level_id';
            
    elsif _join_mode = 'inventory_join' then
        -- Mode C: Create temp table with valid product_level_id and store_level_id combinations from inventory table
        -- Join order optimized: product -> inventory -> store (avoids Cartesian product)
        -- Store level IDs directly for efficient joins later
        _query := '
            drop table if exists temp_valid_product_store_combinations;
            create temp table temp_valid_product_store_combinations as
            select distinct
                tple.product_level_id,
                tsle.store_level_id
            from
                temp_product_level_expanded tple
            inner join
                pricesmart.tb_latest_inventory inv
                on inv.product_id = tple.product_id
            inner join
                temp_store_level_expanded tsle
                on tsle.store_id = inv.store_id;
            create index idx_temp_valid_ps_combo on temp_valid_product_store_combinations(product_level_id, store_level_id);
        ';
        execute _query;
        
        -- Use the filtered temp table for efficient direct joins using level IDs
        _additional_join_clause := '
            inner join
            temp_valid_product_store_combinations tvpsc
            on tvpsc.product_level_id = tpprd_temp.product_level_id
            and tvpsc.store_level_id = tpstrd_temp.store_level_id';
    else
        -- Mode A: No additional join (cross join via "on true")
        _additional_join_clause := '';
    end if;
    
    -- Single unified insert query with dynamic join
	select pr.discount_type_id, pr.discount_type
    into _discount_type_id, _discount_type
    from price_promo.ps_rules pr
    where pr.promo_id = p_promo_id;
	
	_scenario_data := jsonb_build_object(
        '1',
		jsonb_build_object(
		'scenario_id', _scenario_id,
            'scenario_name', 'Scenario 1',
            'created_at', now(),
            'created_by', p_user_id,
            'scenario_type', 'resimulation',
            'scenario_order_id', 1,
            'offer_type_id', _discount_type_id,
            'offer_type', _discount_type,
            'offer_x_value', null
        )
    );

    _partition_name := 'ps_scenario_discounts_' || p_promo_id::text;

	_step_start := clock_timestamp();
    _query := format(
        $ins$
        INSERT INTO price_promo.%I
        (promo_id,scenario_data,product_level_id,store_level_id,customer_level_id)
        SELECT
            $1,
            $2,
            tpprd.product_level_id,
            tpstrd.store_level_id,
            null
        FROM
            price_promo.%I tpprd
            cross join
            price_promo.%I tpstrd
        $ins$,
        _partition_name,
        _product_work_table,
        _store_work_table
    );
	
	raise notice 'fn_populate_scenario_discounts_table promo_id=% ps_scenario_discounts partition insert query: %',
        p_promo_id,
        _query;
    EXECUTE format('ALTER TABLE price_promo.%I SET UNLOGGED', _partition_name);
    EXECUTE _query USING p_promo_id, _scenario_data;
	raise notice 'fn_populate_scenario_discounts_table promo_id=% ps_scenario_discounts insert: % ms',
        p_promo_id,
        round((extract(epoch from (clock_timestamp() - _step_start)) * 1000)::numeric, 3);

    _query := format(
        '
        insert into price_promo.ps_scenario_discounts
        (promo_id,scenario_data,product_level_id,store_level_id,customer_level_id)
        SELECT%1$s
            %2$s,
            jsonb_build_object(
                ''1'',jsonb_build_object(
                    ''scenario_id'',%3$s,
                    ''scenario_name'',''Scenario 1'',
                    ''created_at'', now(),
                    ''created_by'',%4$s,
                    ''scenario_type'',''resimulation'',
                    ''scenario_order_id'',1,
                    ''offer_type_id'', pr.discount_type_id,
                    ''offer_type'', pr.discount_type,
                    ''offer_value'', null,
                    ''offer_x_type'',null,
                    ''offer_x_value'',null,
                    ''offer_y_type'',null,
                    ''offer_y_value'',null,
                    ''offer_z_type'',null,
                    ''offer_z_value'',null,
                    ''tier_id'',null,
                    ''scan_back_allowance_amount'', 0,
                    ''off_invoice_allowance_amount'', 0,
                    ''marketing_support'', 1,
                    ''promotional_theme'', null,
                    ''loyality_points'', null
                )
            ),
            tpprd.product_level_id,
            tpstrd.store_level_id,
            tpcsrd.customer_level_id
        FROM
            price_promo.promo_master pm
            inner JOIN
            price_promo.ps_rules pr
            on pm.promo_id = pr.promo_id
            left join 
            (select * from price_promo.tb_promo_product_reco_details where promo_id = %2$s) tpprd
            on true
            left join
            temp_product_product_reco_details tpprd_temp
            on tpprd_temp.product_level_id = tpprd.product_level_id
            left join
            (select * from price_promo.tb_promo_store_reco_details where promo_id = %2$s) tpstrd
            on true
            left join
            temp_store_store_reco_details tpstrd_temp
            on tpstrd_temp.store_level_id = tpstrd.store_level_id
            left join
            (select * from price_promo.tb_promo_customer_reco_details where promo_id = %2$s) tpcsrd
            on true
            %5$s
        WHERE
            pm.promo_id = %2$s
        order by tpprd.product_level_id, tpstrd.store_level_id, tpcsrd.customer_level_id;
        ',
        case when _join_mode in ('eligibility_join', 'inventory_join') then ' DISTINCT' else '' end,
        p_promo_id,
        _scenario_id,
        p_user_id,
        _additional_join_clause
    );
    
    raise notice 'ps_scenario_discounts insert query: %1$s', _query;
    -- execute _query; uncomment later if required

    -- insert product_level_id and its products into price_promo.tb_discount_level_products table
    _step_start := clock_timestamp();
    execute format(
        $p$
        insert into price_promo.tb_discount_level_products 
        (product_level_id,product_id)
        select 
            t.product_level_id,
            u.product_id
        from price_promo.%I t
        cross join lateral unnest(t.product_ids) as u(product_id)
        $p$,
        _product_work_table
    );
	
	raise notice 'fn_populate_scenario_discounts_table promo_id=% tb_discount_level_products insert: % ms',
        p_promo_id,
        round((extract(epoch from (clock_timestamp() - _step_start)) * 1000)::numeric, 3);

    _step_start := clock_timestamp();
    execute format(
        $s$
        insert into price_promo.tb_discount_level_stores
        (store_level_id,store_id)
		select
         	t.store_level_id,
            u.store_id
        from price_promo.%I t
        cross join lateral unnest(t.store_ids) as u(store_id)
        $s$,
        _store_work_table
    );
    raise notice 'fn_populate_scenario_discounts_table promo_id=% tb_discount_level_stores insert: % ms',
        p_promo_id,
        round((extract(epoch from (clock_timestamp() - _step_start)) * 1000)::numeric, 3);
	
	execute format('drop table if exists price_promo.%I', _product_work_table);
    execute format('drop table if exists price_promo.%I', _store_work_table);

    END;
$function$
;
