--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_event_new_flow runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_get_event_new_flow

DROP FUNCTION if exists price_promo.fn_get_event_new_flow;

CREATE OR REPLACE FUNCTION price_promo.fn_get_event_new_flow(_event_id integer)
 RETURNS TABLE(final_response jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	vl_test_query text;
	p_inclusion_type text;
	s_inclusion_type text;
	p_exclusion_type text;
	p_exclusion_type_temp text;
	c_inclusion_type text;
	final_pg_ids integer[];
	final_sg_ids integer[];
	final_excluded_pg_ids integer[];
	excluded_table_exists boolean := false;
	tables_mapping jsonb := '{
						"product_group": "product_group_inclusion_table",
						"whole_category": "hierarchy_inclusion_table",
						"specific_products": "products_inclusion_table",
						"specific_stores": "store_inclusion_table",
						"store_group": "store_group_inclusion_table",
						"product_group_exclusion": "product_group_exclusion_table",
						"customer_segment": "customer_hierarchy_table"
					}'::jsonb;
	inclusion_table TEXT = 'temp_table';
    exclusion_table TEXT = 'temp_table';
    store_table TEXT = 'temp_table';
	customer_table TEXT = 'temp_table';
	_product_inclusion_key text = 'data';
	_store_inclusion_key text = 'data';
	_customer_inclusion_key text = 'data';
	hierarchy_data_key text := '.hierarchy_data';
	
	crosstab_query_order text;
	crosstab_query_order_json_str text;
	_product_hierarchies_config jsonb;
	_store_hierarchies_config jsonb;
	_customer_hierarchies_config jsonb;
    select_condition text := '';
	select_condition_store text := '';
    jsonb_to_record_condition text := '';
    select_included_event_product_hierarchy_condition text := '';
    where_condition text := '';
	hierarchy_key TEXT;
    cfg JSONB;
	client_product_id text;

begin
	
	select config_value::jsonb into _product_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'product' and config_name = 'hierarchy_filters';

	select config_value::jsonb into _store_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'store' and config_name = 'hierarchy_filters';

	select config_value::jsonb into _customer_hierarchies_config 
	from price_promo.tb_tool_configurations
	where module = 'customer' and config_name = 'hierarchy_filters';

	select product_inclusion_type, store_selection_type, product_exclusion_type, customer_selection_type into p_inclusion_type, s_inclusion_type, p_exclusion_type_temp, c_inclusion_type from price_promo.event_master where event_id = _event_id;
	raise notice '%', CURRENT_TIMESTAMP;
	p_exclusion_type := format('%1$s_exclusion', p_exclusion_type_temp);
	raise notice ' p_inc - %   s_inc - %    p_exc - %', p_inclusion_type, s_inclusion_type, p_exclusion_type;

	final_pg_ids = array(select iepg.product_group_id from price_promo.included_event_product_groups iepg where event_id = _event_id);
	final_sg_ids = array(select iesg.store_group_id from price_promo.included_event_store_groups iesg where event_id = _event_id);
	final_excluded_pg_ids = array(select eepg.product_group_id from price_promo.excluded_event_product_groups eepg where event_id = _event_id);
	raise notice 'final_excluded_pg_ids - %', final_excluded_pg_ids;

	vl_test_query := 'drop table if exists temp_table';
	execute vl_test_query;

	vl_test_query := 'create temp table temp_table (event_id integer, hierarchy_data jsonb);';
	raise notice 'query - %', vl_test_query;
	execute vl_test_query;


	--Product Restriction
	if p_inclusion_type = 'product_group' then
		raise notice ' product_group inclusion';
		_product_inclusion_key := 'product_groups';

		vl_test_query := 'drop table if exists product_group_inclusion_table';
		execute vl_test_query;

		vl_test_query := format('
			create temp table product_group_inclusion_table as
				with pg_data_cte as(
				    select
				        tpg.pg_id as product_group_id,
				        tpg.pg_name as product_group_name,
				        tpg.description as product_group_description,
						case
							when tpg.pg_grouping_type = 1 then ''Whole Category''
							else ''Specific Products''
						end as product_group_type,
				        usr.name as created_by_user,
				        tpg.created_at,
				        user_updated_by_table.name as modified_by_user,
				        case
				            when tpg.created_at <> tpg.updated_at then tpg.updated_at
				            else null
				        end as modified_at,
				        tpg.products_count,
						tpg.is_under_processing as group_under_process
				    from
				        pricesmart.tb_product_group tpg
				    left join global.user_master usr on
				        usr.user_code = tpg.created_by
				    left join global.user_master user_updated_by_table on
				        user_updated_by_table.user_code = tpg.updated_by
				    where
						tpg.pg_id in (%1$s)
				        and tpg.is_deleted = 0
				),
				pg_hierarchy_data as(
					select
						pdc.product_group_id,
						tph.hierarchy_level,
						thcm.hierarchy_name
					from
						pg_data_cte pdc
					inner join
						pricesmart.tb_pg_hierarchy tph on pdc.product_group_id = tph.pg_id
					left join
					 	pricesmart.tb_hierarchy_cid_mapping thcm on tph.hierarchy_level = thcm.hierarchy_level and  tph.hierarchy_value = thcm.hierarchy_value
					where
						tph.hierarchy_level in (0, 1, 2)
						and tph.is_temporary = 0
					group by
						pdc.product_group_id,
						tph.hierarchy_level,
						thcm.hierarchy_name
				),
				pg_promo_map_cte as(
				    select
				        pdc.product_group_id,
				        count(tppg.promo_id) as promos
				    from
				        pg_data_cte pdc
				    left join
	                    (
	                        select pg_id as product_group_id,promo_id from price_promo.excluded_product_groups
							inner join price_promo.promo_master pm using(promo_id)
	                        where pg_id in (select product_group_id from pg_data_cte)
							and pm.status not in(6)
	                        union 
	                        select product_group_id,promo_id from price_promo.included_promo_product_groups 
							inner join price_promo.promo_master pm using(promo_id)
	                        where product_group_id in (select product_group_id from pg_data_cte)
							and pm.status not in(6)
	                    ) tppg on pdc.product_group_id = tppg.product_group_id
				    group by
				        pdc.product_group_id
				) 
				select
					%2$s as event_id,
					''{}''::jsonb as hierarchy_data,
	                sdc.product_group_id,
	                sdc.product_group_name::varchar,
	                sdc.product_group_description,
	                sdc.product_group_type,
	                sdc.created_by_user,
	                sdc.created_at,
	                sdc.modified_by_user,
	                sdc.group_under_process,
	                sdc.modified_at,
	                sdc.products_count,
	                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 0 and phd.product_group_id = sdc.product_group_id) as l0_name,
	                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 1 and phd.product_group_id = sdc.product_group_id) as l1_name,
	                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 2 and phd.product_group_id = sdc.product_group_id) as l2_name,
	                spmc.promos as promos_count
	            from
				    pg_data_cte sdc
				inner join
				    pg_promo_map_cte spmc using(product_group_id)', array_to_string(coalesce(final_pg_ids, array[-1]), ','), _event_id);

		raise notice 'product_group query - %', vl_test_query;
		execute vl_test_query;

	elsif p_inclusion_type = 'whole_category' then
		raise notice ' whole_category inclusion';
		_product_inclusion_key := 'product_hierarchy';

		vl_test_query := 'drop table if exists hierarchy_inclusion_table';
		execute vl_test_query;

		FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_product_hierarchies_config)
		LOOP
			IF NOT ((cfg->>'is_linked_to_event')::boolean = true) THEN
				CONTINUE;
			END IF;
			
			select_condition := select_condition || format(
				'when eh.hierarchy_level_id = %1$s then ''%2$s'' ',
				cfg->>'id',
				hierarchy_key
			);
			
		END LOOP;

		vl_test_query := format('
					create temp table hierarchy_inclusion_table as 
					    with hierarchy_inclusion as (
					        select 
					            case %2$s end as hierarchy_level,
					            eh.hierarchy_value_name as label,
					            eh.hierarchy_value_id as value
					        from 
					            price_promo.included_event_product_hierarchy eh
					        where 
					            eh.event_id = %1$s
					    )
					    select 
					        jsonb_object_agg(
					            hierarchy_level, 
					            coalesce(
					                (select jsonb_agg(
					                    jsonb_build_object(
					                        ''label'', label,
					                        ''value'', value
					                    )
					                ) from hierarchy_inclusion where hierarchy_level = subquery.hierarchy_level), 
					                ''[]''::jsonb
					            )
					        ) as hierarchy_data
					    from (select distinct hierarchy_level from hierarchy_inclusion) subquery;
				', _event_id, select_condition);
				
				raise notice 'whole_category query - %', vl_test_query;
				execute vl_test_query;


	elsif p_inclusion_type = 'specific_products' then
		raise notice ' specific_product inclusion';
		_product_inclusion_key := 'products';
		vl_test_query := 'drop table if exists products_inclusion_table';
		execute vl_test_query;

		select config_value into client_product_id from price_promo.tb_tool_configurations where config_name = 'client_product_id_key';

		vl_test_query := format('
				create temp table products_inclusion_table as
					WITH lifecycle_indicator_id_cte AS (
					    SELECT id 
					    FROM pricesmart.tb_lifecycle_indicator_config
					)
					SELECT
						''{}''::jsonb as hierarchy_data,
						pm.*,
						pm.%2$s as client_product_id,
					    CASE 
					        WHEN pm.total_inventory IS NULL THEN 0
					        ELSE pm.total_inventory 
					    END AS inventory,
                        pm.oh as oh_inventory,
                        pm.it as it_inventory,
                        pm.oo as oo_inventory
					FROM
					    price_promo.product_master pm
					LEFT JOIN (
					    SELECT 
					        product_id,
					        ARRAY_AGG(lifecycle_indicator_id) AS lifecycle_indicator 
					    FROM pricesmart.tb_parent_lifecycle_mapping 
					    GROUP BY product_id
					) tplm 
					ON pm.product_id = tplm.product_id
					WHERE
					    is_active in (0,1)
					    AND pm.product_id IN (
					        SELECT 
					            product_id 
					        FROM price_promo.included_event_products 
					        WHERE event_id = %1$s
					    )', _event_id, client_product_id);
		raise notice 'specific_product query - %', vl_test_query;
		execute vl_test_query;
	
	end if;

	--Store Restriction
	if s_inclusion_type = 'specific_stores' then
		raise notice ' specific_stores inclusion';
		_store_inclusion_key := 'stores';
		vl_test_query := 'drop table if exists store_inclusion_table';
		execute vl_test_query;

		FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_store_hierarchies_config)
		LOOP
			IF NOT (cfg->>'id' is not NULL) THEN
				CONTINUE;
			END IF;
			
			select_condition_store := select_condition_store || format(
				'%1$s, ',
				cfg->>'value_column'
			);
			
		END LOOP;

		select_condition_store := rtrim(select_condition_store, ', ');

		vl_test_query := format('
			create temp table store_inclusion_table as 
				select
			        store_id,
			        %2$s
			    from
			        pricesmart.tb_store_master
			    where
			        store_id in (select store_id from price_promo.included_event_stores where event_id = %1$L)', _event_id, select_condition_store);
		raise notice 'specific_stores query - %', vl_test_query;
		execute vl_test_query;

	elsif s_inclusion_type = 'store_group' then
		raise notice ' store_group inclusion';
		_store_inclusion_key := 'store_groups';

		vl_test_query := 'drop table if exists store_group_inclusion_table';
		execute vl_test_query;

		vl_test_query := format('
					create temp table store_group_inclusion_table as 
						with sg_data_cte as(
					        select
					            tsg.sg_id as store_group_id,
					            tsg.sg_name as store_group_name,
					            tsg.description as store_group_description,
					            um.name as created_by_user,
					            tsg.created_at,
					            uum.name as modified_by_user,
					            case
					                when tsg.created_at <> tsg.updated_at then tsg.updated_at
					                else null
					            end modified_at,
					            tsg.stores_count,
					            array_agg(distinct sm.s0_name) as  s0_name,
					            array_agg(distinct sm.s1_name) as  s1_name,
					            array_agg(distinct sm.s2_name) as  s2_name,
					            tsg.is_under_processing as group_under_process
					        from
					            pricesmart.tb_store_group tsg
					        inner join 
					            pricesmart.tb_sg_store tss on tss.sg_id = tsg.sg_id
					        inner join 
					            pricesmart.tb_store_master sm on sm.store_id = tss.store_id
					        left join global.user_master um on
					            um.user_code = tsg.created_by
					        left join global.user_master uum on
					            uum.user_code = tsg.updated_by
					        where
								tsg.sg_id in (%1$s)
					            and tsg.is_deleted <> 1
					        group by
					            store_group_id,
					            store_group_name,
					            store_group_description,
					            created_by_user,
					            tsg.created_at,
					            modified_by_user,
					            modified_at
					    ),
					    sg_promo_map_cte as(
					        select 
					            sdc.store_group_id,
					            count(tpsg.promo_id) as promos
					        from 
					            sg_data_cte sdc
					        left join 
					            price_promo.tb_promo_store_groups tpsg on sdc.store_group_id = tpsg.store_group_id 
					        group by 
					            sdc.store_group_id
					    )
					    select 
					        sdc.*,
					        spmc.promos as promos_count
					    from 
					        sg_data_cte sdc
					    inner join 
					        sg_promo_map_cte spmc using(store_group_id)
					', array_to_string(coalesce(final_sg_ids, array[-1]), ','), _event_id);
		raise notice 'store_group query - %', vl_test_query;
		execute vl_test_query;

	end if;

	raise notice 'p_exclusion_type - %', p_exclusion_type;	
	--Product Exclusion
	if p_exclusion_type = 'product_group_exclusion' and (array_length(final_excluded_pg_ids, 1) > 0) then
		raise notice ' product_group exclusion';

		excluded_table_exists := true;

		vl_test_query := 'drop table if exists product_group_exclusion_table';
		execute vl_test_query;
	
		vl_test_query := format('
			create temp table product_group_exclusion_table as 
				with pg_data_cte as(
				    select
				        tpg.pg_id as product_group_id,
				        tpg.pg_name as product_group_name,
				        tpg.description as product_group_description,
						case
							when tpg.pg_grouping_type = 1 then ''Whole Category''
							else ''Specific Products''
						end as product_group_type,
				        usr.name as created_by_user,
				        tpg.created_at,
				        user_updated_by_table.name as modified_by_user,
				        case
				            when tpg.created_at <> tpg.updated_at then tpg.updated_at
				            else null
				        end as modified_at,
				        tpg.products_count,
						tpg.is_under_processing as group_under_process
				    from
				        pricesmart.tb_product_group tpg
				    left join global.user_master usr on
				        usr.user_code = tpg.created_by
				    left join global.user_master user_updated_by_table on
				        user_updated_by_table.user_code = tpg.updated_by
				    where
					    tpg.pg_id in (%1$s)
				        and tpg.is_deleted = 0
				),
				pg_hierarchy_data as(
					select
						pdc.product_group_id,
						tph.hierarchy_level,
						thcm.hierarchy_name
					from
						pg_data_cte pdc
					inner join
						pricesmart.tb_pg_hierarchy tph on pdc.product_group_id = tph.pg_id
					left join
					 	pricesmart.tb_hierarchy_cid_mapping thcm on tph.hierarchy_level = thcm.hierarchy_level and  tph.hierarchy_value = thcm.hierarchy_value
					where
						tph.hierarchy_level in (0, 1, 2)
						and tph.is_temporary = 0
					group by
						pdc.product_group_id,
						tph.hierarchy_level,
						thcm.hierarchy_name
				),
				pg_promo_map_cte as(
				    select
				        pdc.product_group_id,
				        count(tppg.promo_id) as promos
				    from
				        pg_data_cte pdc
				    left join
	                    (
	                        select pg_id as product_group_id,promo_id from price_promo.excluded_product_groups
							inner join price_promo.promo_master pm using(promo_id)
	                        where pg_id in (select product_group_id from pg_data_cte)
							and pm.status not in(6)
	                        union 
	                        select product_group_id,promo_id from price_promo.included_promo_product_groups 
							inner join price_promo.promo_master pm using(promo_id)
	                        where product_group_id in (select product_group_id from pg_data_cte)
							and pm.status not in(6)
	                    ) tppg on pdc.product_group_id = tppg.product_group_id
				    group by
				        pdc.product_group_id
				)
				select
	                sdc.product_group_id,
	                sdc.product_group_name::varchar,
	                sdc.product_group_description,
	                sdc.product_group_type,
	                sdc.created_by_user,
	                sdc.created_at,
	                sdc.modified_by_user,
	                sdc.group_under_process,
	                sdc.modified_at,
	                sdc.products_count,
	                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 0 and phd.product_group_id = sdc.product_group_id) as l0_name,
	                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 1 and phd.product_group_id = sdc.product_group_id) as l1_name,
	                (select array_agg(distinct phd.hierarchy_name) from pg_hierarchy_data phd where phd.hierarchy_level = 2 and phd.product_group_id = sdc.product_group_id) as l2_name,
	                spmc.promos as promos_count
	            from
				    pg_data_cte sdc
				inner join
				    pg_promo_map_cte spmc using(product_group_id)', array_to_string(coalesce(final_excluded_pg_ids, array[-1]), ','), _event_id);
		raise notice 'product_group query - %', vl_test_query;
		execute vl_test_query;

	end if;

	if c_inclusion_type = 'customer_segment' then
		raise notice ' customer_segment inclusion';
		_customer_inclusion_key := 'customer_hierarchy';

		vl_test_query := 'drop table if exists customer_hierarchy_table';
		execute vl_test_query;

		select_condition := '';
		FOR hierarchy_key, cfg IN SELECT * FROM jsonb_each(_customer_hierarchies_config)
		LOOP
			IF NOT ((cfg->>'is_linked_to_event')::boolean = true) THEN
				CONTINUE;
			END IF;
			
			select_condition := select_condition || format(
				'when eh.hierarchy_level_id = %1$s then ''%2$s'' ',
				cfg->>'id',
				hierarchy_key
			);
			
		END LOOP;

		vl_test_query := format('
					create temp table customer_hierarchy_table as 
						with hierarchy_inclusion as (
							select 
								case %2$s end as hierarchy_level,
								eh.hierarchy_value_name as label,
								eh.hierarchy_value_id as value
							from 
								price_promo.tb_event_customer_hierarchy eh
							where 
								eh.event_id = %1$s
						)
					    select 
					        jsonb_object_agg(
					            hierarchy_level, 
					            coalesce(
					                (select jsonb_agg(
					                    jsonb_build_object(
					                        ''label'', label,
					                        ''value'', value
					                    )
					                ) from hierarchy_inclusion where hierarchy_level = subquery.hierarchy_level), 
					                ''[]''::jsonb
					            )
					        ) as hierarchy_data
					    from (select distinct hierarchy_level from hierarchy_inclusion) subquery;
				', _event_id, select_condition);
				
				raise notice 'customer_segment query - %', vl_test_query;
				execute vl_test_query;
	end if;


	RAISE NOTICE 'tables_mapping: %', tables_mapping;

	if tables_mapping ->> p_inclusion_type is not null then
		inclusion_table := tables_mapping ->> p_inclusion_type;
	end if;

	if tables_mapping ->> c_inclusion_type is not null then
		customer_table := tables_mapping ->> c_inclusion_type;
	end if;

	if excluded_table_exists and tables_mapping ->> p_exclusion_type is not null then
		exclusion_table := tables_mapping ->> p_exclusion_type;
	end if;

	if tables_mapping ->> s_inclusion_type is not null then
		store_table := tables_mapping ->> s_inclusion_type;
	end if;
--	inclusion_table := coalesce(inclusion_table, tables_mapping ->> p_inclusion_type);
--    exclusion_table := coalesce(exclusion_table, tables_mapping ->> p_exclusion_type);
--    store_table := coalesce(store_table, tables_mapping ->> s_inclusion_type);

	RAISE NOTICE 'inclusion_table: %, exclusion_table: %, store_table: %, customer_table %', inclusion_table, exclusion_table, store_table, customer_table;

	SELECT 
	    string_agg(
			format('%1$s %2$s', be_identifier, be_value_type),
	        ', '
	    ) as crosstab_output_str,
		 string_agg(
		      format(' ''%1$s'', ea.%2$s,', fe_identifier, be_identifier),
				' '
		  ) as crosstab_output_json_str
	into crosstab_query_order, crosstab_query_order_json_str
	FROM (
	    SELECT DISTINCT be_identifier, attribute_master.be_value_type, fe_identifier
	    FROM price_promo.attribute_master
	    WHERE is_active = true and be_is_master_attr is false
	    ORDER BY be_identifier
	) subquery;    
	

	raise notice ' ccccc   -   %', crosstab_query_order;


	vl_test_query := format('
					with event_attrs_cte as (
						SELECT * FROM 
						crosstab(
						    ''SELECT 
						        A.event_id, 
						        B.be_identifier, 
						        A.attribute_value 
						    FROM 
						        price_promo.event_attribute_mapping A
						        INNER JOIN price_promo.attribute_master B ON A.attribute_id = B.id 
						    WHERE 
						        B.is_active = true
						    ORDER BY 
						        A.event_id, B.be_identifier'',  -- Order is important for crosstab
						    $$SELECT 
						        DISTINCT be_identifier 
						    FROM 
						        price_promo.attribute_master 
						    WHERE 
						        is_active = true and be_is_master_attr is false
						    ORDER BY 
						        be_identifier$$
						) AS ct (
						    event_id int,
						    %11$s
						)
					)
					select jsonb_build_object(
				        ''name'', em.name,
				        ''status_id'', em.status,
				        ''start_date'', em.start_date,
				        ''end_date'', em.end_date,
				        ''submit_offers_by'', em.submit_by,
						''is_locked'', em.is_locked,
						%12$s
				        ''created_by'', (select name from global.user_master where user_code = em.created_by),
				        ''product_exclusion'', jsonb_build_object(
				            ''product_exclusion_level'', em.product_exclusion_type,
				            ''product_groups'', case 
										when %6$L then
											(select coalesce(jsonb_agg(es), ''[]'') 
						                    from %3$s es )
										else
											''[]''::jsonb
										end
											
				        ),
				        ''date_restriction'', jsonb_build_object(
				            ''sameAsEvent'', case when dr.use_same_as_event then ''yes'' else ''no'' end,
				            ''minPromotionDays'', dr.min_promo_duration,
				            ''maxPromotionDays'', dr.max_promo_duration,
				            ''promotionStartDay'', dr.promo_start_date,
				            ''promotionEndDay'', dr.promo_end_date
				        ),
				        ''product_restriction'', jsonb_build_object(
				            ''product_restriction_level'', em.product_inclusion_type,
				            ''lock'', em.has_locked_product_selection,
				            ''%7$s'', case 
										when em.product_inclusion_type in (''site_wide'') then
											''[]''::jsonb
										when em.product_inclusion_type in (''whole_category'') then
											(select es%10$s
						                    from %2$s es )
										else
											(select coalesce(jsonb_agg(es), ''[]'') 
						                    from %2$s es )
										end
				        ),
						''customer_restriction'', jsonb_build_object(
				            ''customer_restriction_level'', em.customer_selection_type,
				            ''lock'', em.has_locked_customer_selection,
				            ''%9$s'', case 
										when em.customer_selection_type in (''customer_segment'') then
											(select es%10$s
						                    from %5$s es )
										else
											(select coalesce(jsonb_agg(es%10$s), ''[]'') 
						                    from %5$s es )
										end
				        ),
				        ''store_restriction'', jsonb_build_object(
				            ''store_restriction_level'', em.store_selection_type,
				            ''lock'', em.has_locked_store_selection,
				            ''%8$s'', case 
										when em.store_selection_type in (''all_stores'', ''bnm_stores'', ''ecom_stores'') then
											''[]''::jsonb
										else
											(select coalesce(jsonb_agg(es), ''[]'')
						                    from %4$s es )
										end
				        )
				    ) as event_details
				    from 
				        price_promo.event_master em
				    left join 
				        price_promo.event_date_restrictions dr on em.event_id = dr.event_id
					left join 
						(select * from event_attrs_cte) ea on ea.event_id = em.event_id
				    where 
				        em.event_id = %1$s;
			',
			_event_id,
			inclusion_table,
			exclusion_table,
			store_table,
			customer_table,
			excluded_table_exists,
			_product_inclusion_key,
			_store_inclusion_key,
			_customer_inclusion_key,
			hierarchy_data_key,
			crosstab_query_order,
			crosstab_query_order_json_str
		);

		raise notice 'final query - %', vl_test_query;
		return query  execute vl_test_query;

end;
$function$
;
