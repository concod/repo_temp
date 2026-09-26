--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:pc_refresh_2_promo_hierarchy_data_6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pc_refresh_2_promo_hierarchy_data_6

DROP PROCEDURE IF EXISTS global.pc_refresh_2_promo_hierarchy_data;


CREATE OR REPLACE PROCEDURE global.pc_refresh_2_promo_hierarchy_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.pc_refresh_2_promo_hierarchy_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_promo_id integer;
	_site_wide_promo_ids integer[];
	_whole_category_inc_promo_ids integer[];
	_changed_promo_ids integer[];
	_pg_promo_ids integer[];
	all_products_count integer;
	pg_ids integer[];
	new_products integer[];
	promo_product_hierarchy_record record;
	query text;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

	-- PRODUCT GROUP BASED INCLUSION CASES - START

		-- Get all whole category product_group selection promo_ids.
		select
			array_agg(promo_id) into _pg_promo_ids
		from
			price_promo.promo_master pm
		where
			pm.product_selection_type = (
                select id from price_promo.product_selection_type_config pstc where pstc.product_selection_type = 'product_group'
            )
			and pm.status <> 6
			and pm.end_date >= current_date;


		if array_length(_pg_promo_ids, 1) > 0 then
			foreach _promo_id in array _pg_promo_ids loop
				pg_ids = null::integer[];
				new_products = null::integer[];

				select
					array_agg(tppg.product_group_id) into pg_ids
				from
					price_promo.included_promo_product_groups tppg
				where
					tppg.promo_id = _promo_id;

				-- Get all pg's products.
				new_products = null::integer[];
				if array_length(pg_ids, 1) > 0 then
					select
						array_agg(distinct product_id) into new_products
					from
						pricesmart.tb_pg_product tpp
					where
						tpp.pg_id = any(pg_ids);
				end if;
				raise notice 'new_products: %', array_length(new_products, 1);
				perform global.fn_refresh_promo_products(_promo_id, new_products);
			end loop;
		end if;

	-- PRODUCT GROUP BASED INCLUSION CASES - END


	-- HIERARCHY INCLUSION AND HIERACHY BASED EXCLUSION CASES - START

		DROP TABLE IF EXISTS tb_promo_hierarchy_agg_data;
		CREATE TEMP TABLE tb_promo_hierarchy_agg_data (
		    promo_id integer,
		    l0_ids integer[],
		    l1_ids integer[],
		    l2_ids integer[],
		    l3_ids integer[],
		    l4_ids integer[],
            l5_ids integer[],
            l6_ids integer[],
            status_ids integer[],
            realism_ids integer[],
            size_ids integer[],
            light_type_ids integer[]
		);

		raise notice 'inc temp table created';
	   	WITH hierarchy_data AS (
			SELECT tph.promo_id,
			    CASE
			        WHEN tph.hierarchy_level_id = 0 THEN tph.hierarchy_value_id
			        ELSE NULL::integer
			    END AS l0_ids,
			    CASE
			        WHEN tph.hierarchy_level_id = 1 THEN tph.hierarchy_value_id
			        ELSE NULL::integer
			    END AS l1_ids,
			    CASE
			        WHEN tph.hierarchy_level_id = 2 THEN tph.hierarchy_value_id
			        ELSE NULL::integer
			    END AS l2_ids,
			    CASE
			        WHEN tph.hierarchy_level_id = 3 THEN tph.hierarchy_value_id
			        ELSE NULL::integer
			    END AS l3_ids,
			    CASE
			        WHEN tph.hierarchy_level_id = 4 THEN tph.hierarchy_value_id
			        ELSE NULL::integer
			    END AS l4_ids,
                case 
                    when tph.hierarchy_level_id = 5 then tph.hierarchy_value_id
                    else null::integer
                end as l5_ids,
                case 
                    when tph.hierarchy_level_id = 6 then tph.hierarchy_value_id
                    else null::integer
                end as l6_ids,
                case
                    when tph.hierarchy_level_id = -1 then tph.hierarchy_value_id
                    else null::integer
                end as realism_ids,
                case
                    when tph.hierarchy_level_id = -2 then tph.hierarchy_value_id
                    else null::integer
                end as size_ids,
                case
                    when tph.hierarchy_level_id = -3 then tph.hierarchy_value_id
                    else null::integer
                end as light_type_ids,
                case
                    when tph.hierarchy_level_id = -4 then tph.hierarchy_value_id
                    else null::integer
                end as status_ids
            FROM
				price_promo.included_product_hierarchy tph
			GROUP BY
				tph.promo_id, tph.hierarchy_level_id, tph.hierarchy_value_id
		),
		hierarchy_agg_data AS (
			SELECT hierarchy_data.promo_id,
			    array_agg(DISTINCT hierarchy_data.l0_ids) FILTER (WHERE hierarchy_data.l0_ids IS NOT NULL) AS l0_ids,
			    array_agg(DISTINCT hierarchy_data.l1_ids) FILTER (WHERE hierarchy_data.l1_ids IS NOT NULL) AS l1_ids,
			    array_agg(DISTINCT hierarchy_data.l2_ids) FILTER (WHERE hierarchy_data.l2_ids IS NOT NULL) AS l2_ids,
			    array_agg(DISTINCT hierarchy_data.l3_ids) FILTER (WHERE hierarchy_data.l3_ids IS NOT NULL) AS l3_ids,
			    array_agg(DISTINCT hierarchy_data.l4_ids) FILTER (WHERE hierarchy_data.l4_ids IS NOT NULL) AS l4_ids,
                array_agg(DISTINCT hierarchy_data.l5_ids) FILTER (WHERE hierarchy_data.l5_ids IS NOT NULL) AS l5_ids,
                array_agg(DISTINCT hierarchy_data.l6_ids) FILTER (WHERE hierarchy_data.l6_ids IS NOT NULL) AS l6_ids,
                array_agg(DISTINCT hierarchy_data.status_ids) FILTER (WHERE hierarchy_data.status_ids IS NOT NULL) AS status_ids,
                array_agg(DISTINCT hierarchy_data.realism_ids) FILTER (WHERE hierarchy_data.realism_ids IS NOT NULL) AS realism_ids,
                array_agg(DISTINCT hierarchy_data.size_ids) FILTER (WHERE hierarchy_data.size_ids IS NOT NULL) AS size_ids,
                array_agg(DISTINCT hierarchy_data.light_type_ids) FILTER (WHERE hierarchy_data.light_type_ids IS NOT NULL) AS light_type_ids
			FROM
				hierarchy_data
			GROUP BY
				hierarchy_data.promo_id
		)
		INSERT INTO tb_promo_hierarchy_agg_data (
            promo_id, l0_ids, l1_ids, l2_ids, l3_ids, l4_ids, l5_ids, l6_ids, status_ids, realism_ids, size_ids, light_type_ids
        )
		SELECT 
            hierarchy_agg_data.promo_id,
			hierarchy_agg_data.l0_ids,
		    hierarchy_agg_data.l1_ids,
		    hierarchy_agg_data.l2_ids,
		    hierarchy_agg_data.l3_ids,
		    hierarchy_agg_data.l4_ids,
		    hierarchy_agg_data.l5_ids,
		    hierarchy_agg_data.l6_ids,
		    hierarchy_agg_data.status_ids,
		    hierarchy_agg_data.realism_ids,
		    hierarchy_agg_data.size_ids,
		    hierarchy_agg_data.light_type_ids
		FROM hierarchy_agg_data;


		-- Get all hierarchy inclusion promo_ids
		select
			array_agg(promo_id) into _whole_category_inc_promo_ids
		from
			price_promo.promo_master pm
		where
			pm.product_selection_type = (
                select id from price_promo.product_selection_type_config pstc where pstc.product_selection_type = 'whole_category'
            )
			and pm.status <> 6
			and pm.end_date >= current_date;


		-- updating inclusion product data
		if array_length(_whole_category_inc_promo_ids, 1) > 0 then
			foreach _promo_id in array _whole_category_inc_promo_ids loop
				SELECT
			        promo_id, l0_ids, l1_ids, l2_ids, l3_ids, l4_ids, l5_ids, l6_ids, status_ids, realism_ids, size_ids, light_type_ids
			    INTO
			   		promo_product_hierarchy_record
			    FROM
			        tb_promo_hierarchy_agg_data
			    WHERE
			        promo_id = _promo_id;

			    new_products = null::integer[];
				new_products = global.fn_fetch_product_ids_by_hierarchy(
                    promo_product_hierarchy_record.l0_ids,
                    promo_product_hierarchy_record.l1_ids,
                    promo_product_hierarchy_record.l2_ids,
                    promo_product_hierarchy_record.l3_ids,
                    promo_product_hierarchy_record.l4_ids,
                    promo_product_hierarchy_record.l5_ids,
                    promo_product_hierarchy_record.l6_ids,
                    promo_product_hierarchy_record.status_ids,
                    promo_product_hierarchy_record.realism_ids,
                    promo_product_hierarchy_record.size_ids,
                    promo_product_hierarchy_record.light_type_ids
                );
				perform global.fn_refresh_promo_products(_promo_id, new_products);
			end loop;
		end if;


	-- HIERARCHY INCLUSION AND HIERACHY BASED EXCLUSION CASES - END



	-- updating final hierarchy and final product set
	select
		array_agg(promo_id) into _changed_promo_ids
	from
		price_promo.promo_master pm
	where
		(
			pm.exclusion_selection_type in (1,3)  -- hierarchy exclusion
			or
			pm.product_selection_type in (
                select id 
                from price_promo.product_selection_type_config pstc 
                where pstc.product_selection_type in ('whole_category', 'product_group', 'sitewide')
            )
		)
		and pm.status <> 6
		and pm.end_date >= current_date;

	if array_length(_changed_promo_ids, 1) > 0 then
		foreach _promo_id in array _changed_promo_ids loop
			perform price_promo.fn_save_promo_final_hierarchy(_promo_id);
			perform price_promo.fn_save_promo_final_products(_promo_id);
		end loop;

		execute format('
			with count_cte as (
				select promo_id, count(product_id) as product_count from price_promo.promo_product
				where promo_id in (%1$s)
				group by promo_id
			)
			update price_promo.promo_master A set products_count = B.product_count from count_cte B where A.promo_id = B.promo_id;',
			array_to_string(_changed_promo_ids, ',')
		);


	end if;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
