--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_save_event_final_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_save_event_final_products

DROP FUNCTION if exists price_promo.fn_save_event_final_products;
CREATE OR REPLACE FUNCTION price_promo.fn_save_event_final_products(_event_id integer, _user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 security definer
AS $function$
declare

	exclusion_type text;
	inclusion_type text;	
	products_query text;
	event_product_table_name text;
	hierarchy_table_name text;

begin

	event_product_table_name = format('event_product_%1$s', _event_id);
	hierarchy_table_name = format('event_product_hierarchy', _event_id);

	execute format('CREATE TABLE if not exists price_promo.%1$s PARTITION OF price_promo.event_product FOR VALUES IN (%2$s);', event_product_table_name, _event_id);
	execute format('delete from price_promo.%1$s', event_product_table_name);

	select product_inclusion_type, product_exclusion_type into inclusion_type, exclusion_type from price_promo.event_master where event_id = _event_id;
	raise notice '%', CURRENT_TIMESTAMP;
	raise notice ' inc - %     exc - %', inclusion_type, exclusion_type;
	
	if exclusion_type = 'product_group'  then 
		raise notice 'product group exclusion';

		if inclusion_type is null or inclusion_type = 'sitewide' or inclusion_type = '' then 
			raise notice 'Site wide inclusion';

			products_query = format('
				insert into price_promo.%3$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%4$L)
				where product_id not in (
						select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s)
					)
					and is_active = 1
			', _event_id, hierarchy_table_name, event_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif inclusion_type = 'product_group' then 
			raise notice 'Product group inclusion';

			products_query = format('
				insert into price_promo.%3$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%4$L)
				where
					product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s))
					and product_id in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_event_product_groups epg where event_id = %1$s))
					and is_active = 1
			', _event_id, hierarchy_table_name, event_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif inclusion_type = 'whole_category' then 
			raise notice 'Whole category inclusion';

			products_query = format('
				insert into price_promo.%3$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%4$L)
				where
					product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s))
					and product_id in (select product_id from price_promo.product_master where hierarchy_id in (select hierarchy_id from price_promo.%2$s where event_id = %1$s))
					and is_active = 1
			', _event_id, hierarchy_table_name, event_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif inclusion_type = 'specific_products' then 
			raise notice 'Specific products inclusion';

			products_query = format('
				insert into price_promo.%3$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%4$L)
				where
					product_id not in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.excluded_event_product_groups epg where event_id = %1$s))
					and product_id in (select product_id from price_promo.included_event_products where event_id = %1$s)
					and is_active = 1
			', _event_id, hierarchy_table_name, event_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		end if;

	else
		raise notice 'no exclusion';
			
		if inclusion_type is null or inclusion_type = 'sitewide' or inclusion_type = '' then 
			raise notice 'Site wide inclusion';

			products_query = format('
				insert into price_promo.%2$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%3$L)
				where is_active = 1
			', _event_id, event_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif inclusion_type = 'product_group' then 
			raise notice 'Product group inclusion';

			products_query = format('
				insert into price_promo.%2$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%3$L)
				where
					product_id in (select distinct product_id from pricesmart.tb_pg_product tpp where pg_id in (select product_group_id from price_promo.included_event_product_groups epg where event_id = %1$s))
					and is_active = 1
			', _event_id, event_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif inclusion_type = 'whole_category' then 
			raise notice 'Whole category inclusion';

			products_query = format('
				insert into price_promo.%2$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%4$L)
				where
					product_id in (select product_id from price_promo.product_master where hierarchy_id in (select hierarchy_id from price_promo.%3$s where event_id = %1$s))
					and is_active = 1
			', _event_id, event_product_table_name, hierarchy_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		elsif inclusion_type = 'specific_products' then 
			raise notice 'Specific products inclusion';

			products_query = format('
				insert into price_promo.%2$s (product_id, event_id)
				select distinct product_id, %1$s as event_id
				from price_promo.fn_get_user_restricted_products(%3$L)
				where
					product_id in (select product_id from price_promo.included_event_products where event_id = %1$s)
					and is_active = 1
			', _event_id, event_product_table_name, _user_id);

			raise notice 'products query  --- %', products_query;
			execute products_query;

		end if;

	end if;

	WITH products_count_cte AS (
	    SELECT 
	        COUNT(*) AS products_count,
	        COUNT(pm.*) FILTER (WHERE pm.kvi_indicator = 1) AS kvi_tagged_products_count,
	        event_id
	    FROM price_promo.event_product ep
	    LEFT JOIN price_promo.product_master pm ON ep.product_id = pm.product_id
	    WHERE ep.event_id = _event_id
	    GROUP BY event_id
	)
	UPDATE price_promo.event_master em
	SET 
	    products_count = COALESCE(pcc.products_count, 0),
	    kvi_tagged_products_count = COALESCE(pcc.kvi_tagged_products_count, 0)
	FROM products_count_cte pcc
	WHERE em.event_id = _event_id;
	
end
$function$
;
