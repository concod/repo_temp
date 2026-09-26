--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:pc_refresh_2_promo_hierarchy_data_5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: added exclusion refresh as well

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
    _date_buffer_x int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_x')::int;
    _date_buffer_y int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_y')::int;
	_eligible_promo_status_for_promo_refresh jsonb := price_promo.fn_get_configuration_value('promo','eligible_promo_status_for_promo_refresh')::jsonb;
    _user_id integer;
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
			and pm.end_date >= current_date
            and status in (
                select jsonb_array_elements_text(_eligible_promo_status_for_promo_refresh)::int
            )
            and start_date > (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_x)
            and start_date < (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_y)
        ;


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
						global.tb_pg_product tpp
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
            manufacturer_ids integer[],
            merchandiser_ids integer[],
            brand_ids integer[],
            vendor_ids integer[],
            price_bucket_ids integer[],
            size_bucket_ids integer[],
            uom_ids integer[]
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
                case 
                    when tph.hierarchy_level_id = -1 then tph.hierarchy_value_id
                    else null::integer
                end as manufacturer_ids,
                case 
                    when tph.hierarchy_level_id = -2 then tph.hierarchy_value_id
                    else null::integer
                end as merchandiser_ids,
                case
                    when tph.hierarchy_level_id = -3 then tph.hierarchy_value_id
                    else null::integer
                end as brand_ids,
                case
                    when tph.hierarchy_level_id = -4 then tph.hierarchy_value_id
                    else null::integer
                end as vendor_ids,
                case
                    when tph.hierarchy_level_id = -5 then tph.hierarchy_value_id
                    else null::integer
                end as price_bucket_ids,
                case
                    when tph.hierarchy_level_id = -6 then tph.hierarchy_value_id
                    else null::integer
                end as size_bucket_ids,
                case
                    when tph.hierarchy_level_id = -7 then tph.hierarchy_value_id
                    else null::integer
                end as uom_ids
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
                array_agg(DISTINCT hierarchy_data.manufacturer_ids) FILTER (WHERE hierarchy_data.manufacturer_ids IS NOT NULL) AS manufacturer_ids,
                array_agg(DISTINCT hierarchy_data.merchandiser_ids) FILTER (WHERE hierarchy_data.merchandiser_ids IS NOT NULL) AS merchandiser_ids,
                array_agg(DISTINCT hierarchy_data.brand_ids) FILTER (WHERE hierarchy_data.brand_ids IS NOT NULL) AS brand_ids,
                array_agg(DISTINCT hierarchy_data.vendor_ids) FILTER (WHERE hierarchy_data.vendor_ids IS NOT NULL) AS vendor_ids,
                array_agg(DISTINCT hierarchy_data.price_bucket_ids) FILTER (WHERE hierarchy_data.price_bucket_ids IS NOT NULL) AS price_bucket_ids,
                array_agg(DISTINCT hierarchy_data.size_bucket_ids) FILTER (WHERE hierarchy_data.size_bucket_ids IS NOT NULL) AS size_bucket_ids,
                array_agg(DISTINCT hierarchy_data.uom_ids) FILTER (WHERE hierarchy_data.uom_ids IS NOT NULL) AS uom_ids
			FROM
				hierarchy_data
			GROUP BY
				hierarchy_data.promo_id
		)
		INSERT INTO tb_promo_hierarchy_agg_data (
            promo_id, l0_ids, l1_ids, l2_ids, l3_ids, manufacturer_ids, merchandiser_ids, brand_ids, vendor_ids, price_bucket_ids, size_bucket_ids, uom_ids
        )
		SELECT 
            hierarchy_agg_data.promo_id,
			hierarchy_agg_data.l0_ids,
		    hierarchy_agg_data.l1_ids,
		    hierarchy_agg_data.l2_ids,
		    hierarchy_agg_data.l3_ids,
		    hierarchy_agg_data.manufacturer_ids,
		    hierarchy_agg_data.merchandiser_ids,
		    hierarchy_agg_data.brand_ids,
		    hierarchy_agg_data.vendor_ids,
		    hierarchy_agg_data.price_bucket_ids,
		    hierarchy_agg_data.size_bucket_ids,
		    hierarchy_agg_data.uom_ids
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
			and pm.end_date >= current_date
            and status in (
                select jsonb_array_elements_text(_eligible_promo_status_for_promo_refresh)::int
            )
            and start_date > (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_x)
            and start_date < (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_y)
        ;


		-- updating inclusion product data
		if array_length(_whole_category_inc_promo_ids, 1) > 0 then
			foreach _promo_id in array _whole_category_inc_promo_ids loop
				SELECT
			        promo_id,
                    l0_ids,
                    l1_ids,
                    l2_ids,
                    l3_ids,
                    manufacturer_ids,
                    merchandiser_ids,
                    brand_ids,
                    vendor_ids,
                    price_bucket_ids,
                    size_bucket_ids,
                    uom_ids
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
                    promo_product_hierarchy_record.manufacturer_ids,
                    promo_product_hierarchy_record.merchandiser_ids,
                    promo_product_hierarchy_record.brand_ids,
                    promo_product_hierarchy_record.vendor_ids,
                    promo_product_hierarchy_record.price_bucket_ids,
                    promo_product_hierarchy_record.size_bucket_ids,
                    promo_product_hierarchy_record.uom_ids
                );
				perform global.fn_refresh_promo_products(
                    _promo_id,
                    new_products
                );
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
		and pm.end_date >= current_date
		and status in (
            select jsonb_array_elements_text(_eligible_promo_status_for_promo_refresh)::int
        )
        and start_date > (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_x)
        and start_date < (date(timezone((select remarks from metaschema.tb_app_sub_master where name = 'client_timezone'), now())) + _date_buffer_y);

	if array_length(_changed_promo_ids, 1) > 0 then
		foreach _promo_id in array _changed_promo_ids loop
            _user_id = (select created_by from price_promo.promo_master where promo_id = _promo_id);
			perform price_promo.fn_save_promo_final_hierarchy(_promo_id, _user_id);
			perform price_promo.fn_save_promo_final_products(_promo_id, _user_id);
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

        perform price_promo.fn_refresh_promos_scenario_data(_changed_promo_ids);


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
