--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.fn_update_product_group_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_update_product_group_3

DROP FUNCTION if exists pricesmart.fn_update_product_group;


CREATE OR REPLACE FUNCTION pricesmart.fn_update_product_group(edit_pg_id integer, product_group_name text, product_group_description text, user_id integer, pg_grouping_type integer, pg_hierarchy_selection jsonb DEFAULT NULL::jsonb, product_ids integer[] DEFAULT NULL::integer[], selected_strategies integer[] DEFAULT NULL::integer[], selected_promos integer[] DEFAULT NULL::integer[], client_timezone text DEFAULT 'US/Eastern'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	declare
    current_product_group pricesmart.tb_product_group%ROWTYPE;
    strategy_record price_markdown.tb_strategy_master%ROWTYPE;
	return_pg_id integer := edit_pg_id;
    new_pg_id integer;
    partition_query text;
    new_pg_name varchar := product_group_name;
    base_name varchar := product_group_name;
    version_suffix text;
    existing_version integer;
    updated_pg_name varchar;
    p_strategy_id integer;
    p_promo_id integer;
    strategy_pg_ids integer[] DEFAULT ARRAY[]::integer[];
    pg_updated_products integer[] DEFAULT ARRAY[]::integer[];
    _insert_pg_product_query text;
    _insert_pg_hierarchy_sub_query text;
    edit_strategy_result integer;
    existing_data jsonb;
    difference_check bool := false;
	start_time TIMESTAMP;
    end_time TIMESTAMP;
    _product_ids int[];
   	_store_ids int[];
	name_effected_strategies int[];
	pg_products_count int := 0;
    begin
	    if pg_grouping_type = 0 then
			raise notice 'specific pg type: products-diff';
			start_time := clock_timestamp();
        	

			drop table if exists tmp_product_ids_diff;
	        create temp table tmp_product_ids_diff on commit drop as (
                select
                    tpi.product_id as tpi_product_id,
                    tpp.product_id as tpp_product_id
                from (select unnest(product_ids) as product_id) tpi
                full outer join (
                    select
                        distinct product_id
                    from pricesmart.tb_pg_product tpp
                        where pg_id = edit_pg_id
                    ) tpp on
                    tpi.product_id = tpp.product_id
                where
                    tpi.product_id is null
                    or tpp.product_id is null
            );

			if exists (select 1 from tmp_product_ids_diff) then
	    		difference_check := true;
	    	end if;

			end_time := clock_timestamp();
	    	raise notice 'products-diff : %',difference_check;
			--raise notice 'time taken for pg products difference check: %',end_time - start_time;


        else
        	raise notice 'whole cat pg type: hierarchy-diff';
			SELECT 
				(not fn_is_actual_hierarchy_same) into difference_check
			from 
			pricesmart.fn_is_actual_hierarchy_same(
			    pg_hierarchy_selection::jsonb,
			    edit_pg_id
			);
		    raise notice 'hierarchy-diff : %', difference_check;
        end if;

        -- Current edit product group id details
        select * into current_product_group from pricesmart.tb_product_group where pg_id = edit_pg_id;

        if difference_check then
            -- Check if the product group ID is present in tb_strategy_product_groups
			if array_length(selected_strategies,1) > 0 or array_length(selected_promos,1) > 0
				or exists (select 1 from price_markdown.tb_strategy_product_groups where product_group_id = edit_pg_id)
				or exists (select 1 from price_promo.included_promo_product_groups where product_group_id = edit_pg_id)
				or exists (select 1 from price_promo.excluded_product_groups where pg_id = edit_pg_id) then
				start_time := clock_timestamp();
				if exists (select 1 from price_markdown.tb_strategy_product_groups where product_group_id = edit_pg_id and strategy_id not in (select unnest(selected_strategies)))
					or exists (select 1 from price_promo.included_promo_product_groups where product_group_id = edit_pg_id and promo_id not in (select unnest(selected_promos)))
                    or exists (select 1 from price_markdown.tb_strategy_master where strategy_id = any(selected_strategies) and status = 3)
					or exists (select 1 from price_promo.excluded_product_groups where pg_id = edit_pg_id and promo_id not in (select unnest(selected_promos))) then
					-- Create the Versioned Name
					raise notice 'product_group_name check: %',product_group_name;
					if product_group_name = current_product_group.pg_name then
						raise notice 'product_group_name and current pg name same: %',product_group_name;
						if product_group_name ~ '_old(\d+)$' then
							base_name := REGEXP_REPLACE(product_group_name, '_old(\d+)$', '');
						end if;
						select coalesce(max(substring(pg_name from '_old(\d+)$')::int), 0) into existing_version
						from pricesmart.tb_product_group
						where pg_name ~ ('^' || base_name || '_old(\d+)$')
						and is_deleted = 0;
						version_suffix := '_old' || (existing_version + 1);
						updated_pg_name := base_name || version_suffix;
						raise notice 'updated product_group_name: %',updated_pg_name;
						-- Update the current product group name to the versioned name
						update pricesmart.tb_product_group
						set pg_name = updated_pg_name, updated_by = user_id, updated_at = timezone(client_timezone, now())
						where pg_id = edit_pg_id;

						-- get name_effected_strategies
						select 
							array_agg(tspg.strategy_id) into name_effected_strategies
						from 
							price_markdown.tb_strategy_product_groups tspg  
						inner join 
							price_markdown.tb_strategy_master tsm using(strategy_id)
						where 
							tspg.product_group_id = edit_pg_id
							and tsm.product_recommendation_level = -100;

						-- update pg_name_effected strategies
						CALL pricesmart.pc_update_strategies_pg_name(
						    edit_pg_id,  
							updated_pg_name,                               
						    name_effected_strategies	
						);
					else
						update pricesmart.tb_product_group
						set updated_by = user_id, updated_at = timezone(client_timezone, now())
						where pg_id = edit_pg_id;
					end if;
				else
					update pricesmart.tb_product_group
						set is_deleted = 1, updated_by = user_id, updated_at = timezone(client_timezone, now())
						where pg_id = edit_pg_id;
				end if;


				if pg_grouping_type = 1 then
					select 
						fn_get_pg_products_by_filters into product_ids
					from 
						pricesmart.fn_get_pg_products_by_filters(pg_hierarchy_selection::jsonb);
				end if;
				pg_products_count := COALESCE(array_length(product_ids, 1), 0);
                -- Insert new Product Group basic Info with updated pg_name.
                insert into pricesmart.tb_product_group (pg_name, description, created_by, created_at, pg_grouping_type, products_count, updated_by, updated_at)
                values (new_pg_name, product_group_description, current_product_group.created_by, current_product_group.created_at, pg_grouping_type, pg_products_count, user_id, timezone(client_timezone, now())) returning pg_id into new_pg_id;
				raise notice 'New Product Group ID, strategy/promo use: %', new_pg_id;

				-- product ids insert query
			    CALL pricesmart.pc_insert_pg_products(_pg_id := new_pg_id,_products := product_ids);
			    
				-- Insert all product_hierarchy from products.
				CALL pricesmart.pc_insert_pg_products_hierarchy(
					new_pg_id, 
					product_ids::integer[]
				);
				-- Update actual user given product_hierarchy from all hierarchy, is_temporary = 0
				CALL pricesmart.pc_insert_actual_pg_hierarchy(
			    	new_pg_id,
			    	pg_hierarchy_selection::jsonb
				);

               	select array(select distinct product_id from pricesmart.tb_pg_product where pg_id = new_pg_id) into pg_updated_products;
                raise notice 'startegy/promo insert into product tables done for pg id : %', new_pg_id;
				return_pg_id := new_pg_id;
				end_time := clock_timestamp();
				raise notice 'time taken to create version pg: %',end_time - start_time;

				-- updating effected strategies
				call pricesmart.pc_update_pg_effected_strategies(
					selected_strategies, 
					new_pg_id,
					edit_pg_id, 
					user_id
				);


				-- updating effected promos
				perform price_promo.fn_update_product_group_promo(
					selected_promos,
					edit_pg_id,
					new_pg_id,
					new_pg_name,
					pg_updated_products,
					user_id
				);


                perform pricesmart.fn_update_markdown_pg_products_count(new_pg_id, pg_products_count);
				-- creating partition table and attaching to pricesmart.tb_pg_product
				start_time := clock_timestamp();
				call pricesmart.pc_create_partition_for_pgs_or_sgs('tb_pg_product', new_pg_id);
				raise notice 'pg partition table create done';

				execute 'INSERT INTO pricesmart.tb_pg_product_' || new_pg_id::text || ' SELECT * FROM pricesmart.tb_pg_product_default WHERE pg_id = ' || new_pg_id;
				raise notice 'insert into pg partition table done';

				delete from pricesmart.tb_pg_product_default where pg_id = new_pg_id;
				raise notice 'delete from tb_pg_product_default done';

				end_time := clock_timestamp();
				raise notice 'time taken to attach partition table and refresh materialized view: %',end_time - start_time;
            else
            	raise notice 'pg not used in any strategy/promo updating';
				if pg_grouping_type = 1 then
					select 
						fn_get_pg_products_by_filters into product_ids
					from 
						pricesmart.fn_get_pg_products_by_filters(pg_hierarchy_selection::jsonb);
				end if;
				pg_products_count := COALESCE(array_length(product_ids, 1), 0);
            	update pricesmart.tb_product_group set pg_name = new_pg_name, description = product_group_description, products_count = pg_products_count, updated_by = user_id, updated_at = timezone(client_timezone, now()) where pg_id = edit_pg_id;

                raise notice 'Product Group ID, pg not used in any strategy/promo: %', edit_pg_id;
				delete from pricesmart.tb_pg_hierarchy where pg_id = edit_pg_id;
				delete from pricesmart.tb_pg_hierarchy_agg_data where pg_id = edit_pg_id;
				delete from pricesmart.tb_pg_product where pg_id = edit_pg_id;
			    -- product ids insert query				
			    CALL pricesmart.pc_insert_pg_products(_pg_id := edit_pg_id,_products := product_ids);
			    
				-- Insert all product_hierarchy from products.
				CALL pricesmart.pc_insert_pg_products_hierarchy(
					edit_pg_id, 
					product_ids::integer[]
				);
				-- Update actual user given product_hierarchy from all hierarchy, is_temporary = 0
				CALL pricesmart.pc_insert_actual_pg_hierarchy(
			    	edit_pg_id,
			    	pg_hierarchy_selection::jsonb
				);

				perform pricesmart.fn_update_markdown_pg_products_count(edit_pg_id, pg_products_count);
            end if;
        else
        	-- in case of pg_name/description change
	        if current_product_group.pg_name != product_group_name
	        	or current_product_group.description != product_group_description then
	            update pricesmart.tb_product_group set pg_name = product_group_name,
	            		description = product_group_description, updated_by = user_id, updated_at = timezone(client_timezone, now())
	            where pg_id = edit_pg_id;
	            raise notice 'update product group name/description';
	        end if;
	    raise notice 'nothing changed';
        end if;
        return return_pg_id;
    end;
$function$
;
