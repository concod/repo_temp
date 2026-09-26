--liquibase formatted sql
--changeset hareeshwar.c@impactanalytics.co:fn_get_promo_exclusion_details_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Fixed logic for exclusion type 3

DROP FUNCTION if exists price_promo.fn_get_promo_exclusion_details;

CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_exclusion_details(_promo_id integer)
 RETURNS SETOF record
 LANGUAGE plpgsql
AS $function$
declare
	return_record record;
	exclusion_type int;
	final_query text;
	cte_query text;
	exclusion_details text;
begin
	select exclusion_selection_type into exclusion_type from price_promo.promo_master where promo_id = _promo_id;
	raise notice ' Exclusion type = %', exclusion_type;

	if exclusion_type = 1 then   	-- hierarchy selection
		raise notice 'Hierarchy exclusion';
		cte_query = format('
			with exclusion_cte as (
				select
		            coalesce(jsonb_agg(exclusion_hierarchy), ''[]''::jsonb) as product_exclusion_details
		        from (
		            select
		                json_build_object(
		                    ''l0_ids'', COALESCE(jsonb_agg(CASE WHEN hierarchy_level_id = 0 THEN jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) END) FILTER (WHERE hierarchy_level_id = 0), ''[]''::jsonb),
		                    ''l1_ids'', COALESCE(jsonb_agg(CASE WHEN hierarchy_level_id = 1 THEN jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) END) FILTER (WHERE hierarchy_level_id = 1), ''[]''::jsonb),
		                    ''l2_ids'', COALESCE(jsonb_agg(CASE WHEN hierarchy_level_id = 2 THEN jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) END) FILTER (WHERE hierarchy_level_id = 2), ''[]''::jsonb),
		                    ''l3_ids'', COALESCE(jsonb_agg(CASE WHEN hierarchy_level_id = 3 THEN jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) END) FILTER (WHERE hierarchy_level_id = 3), ''[]''::jsonb),
		                    ''l4_ids'', COALESCE(jsonb_agg(CASE WHEN hierarchy_level_id = 4 THEN jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) END) FILTER (WHERE hierarchy_level_id = 4), ''[]''::jsonb),
		                    ''brand'', COALESCE(jsonb_agg(CASE WHEN hierarchy_level_id = -1 THEN jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) END) FILTER (WHERE hierarchy_level_id = -1), ''[]''::jsonb),
		                    ''lifecycle_indicator'', COALESCE(jsonb_agg(CASE WHEN hierarchy_level_id = -2 THEN jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) END) FILTER (WHERE hierarchy_level_id = -2), ''[]''::jsonb)
		                ) AS exclusion_hierarchy
		            from
		                price_promo.excluded_hierarchy_combination ehc
		            where
		                ehc.promo_id = %1$s
		        ) dd
			)
		', _promo_id);

		exclusion_details = '
				''product_hierarchy'', (SELECT product_exclusion_details FROM exclusion_cte),
	            ''upload_details'', ''{}''::jsonb,
	            ''product_ids'', ''{}''::jsonb,
	            ''product_groups'', ''{}''::jsonb';

	elsif exclusion_type = 2 then   	-- copy paste
		raise notice 'Copy paste exclusion';
		cte_query = format('
			with exclusion_cte as (
				select
		            coalesce(
		                jsonb_agg(
		                    jsonb_build_object(
		                        ''parent_id'', pm.l5_id,
		                        ''product_id'', pm.product_id,
		                        ''product_cuq'', pm.product_cuq,
		                        ''product_name'', pm.product_name,
								''l5_name'', pm.product_name,
		                        ''msrp'', ROUND(pm.msrp::numeric, 2),
		                        ''cost'', ROUND(pm.cost::numeric, 2),
		                        ''current_price'', ROUND(pm.current_price::numeric, 2),
		                        ''launch_price'', ROUND(pm.launch_price::numeric, 2),
		                        ''validity'', CASE WHEN pm.is_active = 0 THEN ''inactive'' ELSE ''valid'' END,
		                        ''oh_inventory'', tll.oh,
		                        ''it_inventory'', tll.it,
		                        ''oo_inventory'', tll.oo
		                    )
		                ),
		                ''[]''::jsonb
		            ) as product_exclusion_details
		        from
		            price_promo.excluded_products ep,
		            price_promo.product_master pm
		            LEFT JOIN global.tb_latest_inventory_agg AS tll ON pm.product_id = tll.product_id
		        where
		            ep.product_cid = pm.product_id
		            and ep.promo_id = %1$s
			)
		', _promo_id);

		exclusion_details = '
				''product_hierarchy'', ''{}''::jsonb,
	            ''upload_details'', ''{}''::jsonb,
	            ''product_ids'', (SELECT product_exclusion_details FROM exclusion_cte),
	            ''product_groups'', ''{}''::jsonb';


	elsif exclusion_type = 3 then   	-- product group
		raise notice 'Product Group exclusion';
		cte_query = format('
			with tb_product_hierarchy_combination_cte as (
				select
					l0_cid,
					l0_cuq,
					l1_cid,
					l1_cuq,
					l2_cid,
					l2_cuq
				from price_promo.tb_product_hierarchy_combination
				group by 1,2,3,4,5,6
			),
			exclusion_cte as (
				select
		            coalesce(
		            	jsonb_agg(
		            		jsonb_build_object(
		            			''product_group_id'', tpg.pg_id,
		            			''product_group_name'', tpg.pg_name,
		            			''product_group_description'', tpg.description,
		            			''product_group_type'', case when tpg.pg_grouping_type = 0 then ''Specific Products'' else ''Whole Category'' end ,
		            			''products_count'',tpg.products_count,
		            			''l0_name'', l0_names,
		            			''l1_name'', l1_names,
		            			''l2_name'', l2_names,
		            			''created_at'', tpg.created_at,
		            			''modified_at'', tpg.updated_at,
		            			''group_under_process'', tpg.is_under_processing,
		            			''created_by_user'', um1.name,
		            			''modified_by_user'', um2.name
		            		)
		            	),
		        		''[]''::jsonb
		        	) as product_exclusion_details
		        from
		            price_promo.excluded_product_groups epg,
		            global.tb_product_group tpg
		            left join global.user_master um1 on um1.user_code = tpg.created_by
		            left join global.user_master um2 on um2.user_code = tpg.updated_by
		            left join (
		            	select
		            		ph.pg_id,
		            		array_agg(distinct hc.l0_cuq) FILTER (WHERE ph.hierarchy_level = 0) AS l0_names,
		            		array_agg(distinct hc.l1_cuq) FILTER (WHERE ph.hierarchy_level = 1) AS l1_names,
		            		array_agg(distinct hc.l2_cuq) FILTER (WHERE ph.hierarchy_level = 2) AS l2_names
		            	from global.tb_pg_hierarchy ph
		            	left join tb_product_hierarchy_combination_cte hc on
		            		 CASE
						        WHEN ph.hierarchy_level = 0 THEN ph.hierarchy_value = hc.l0_cid
						        WHEN ph.hierarchy_level = 1 THEN ph.hierarchy_value = hc.l1_cid
						        WHEN ph.hierarchy_level = 2 THEN ph.hierarchy_value = hc.l2_cid
						        ELSE FALSE
		    				END
		            	where
		            		ph.pg_id in (select pg_id from price_promo.excluded_product_groups where promo_id = %1$s)
		            	group by ph.pg_id
		            )tph on tpg.pg_id = tph.pg_id
		        where
		            epg.pg_id = tpg.pg_id
		            and epg.promo_id = %1$s
			)
		', _promo_id);

		exclusion_details = '
			''product_hierarchy'', ''{}''::jsonb,
	        ''upload_details'', ''{}::jsonb'',
	        ''product_ids'', ''{}''::jsonb,
	        ''product_groups'', (SELECT product_exclusion_details FROM exclusion_cte)';

	elsif exclusion_type = 4 then   	-- upload excel
		raise notice 'Upload Excel exclusion';
		cte_query = format('
			with exclusion_cte as (
				select
		            coalesce(jsonb_agg(exclusion_data), ''[]''::jsonb) as product_exclusion_details
		        from (
		            select
		                jsonb_build_object(
						''l0_id'', COALESCE(string_agg(hierarchy_id::text, '','') FILTER (WHERE hierarchy_level_id = 0), null::text),
		                ''l0_cid'', COALESCE(string_agg(hierarchy_cid::text, '','') FILTER (WHERE hierarchy_level_id = 0), null::text)::int,
		                ''l0_cuq'', COALESCE(string_agg(hierarchy_cuq::text, '','') FILTER (WHERE hierarchy_level_id = 0), null::text),
						--
		                ''l1_id'', COALESCE(string_agg(hierarchy_id::text, '','') FILTER (WHERE hierarchy_level_id = 1), null::text),
		                ''l1_cid'', COALESCE(string_agg(hierarchy_cid::text, '','') FILTER (WHERE hierarchy_level_id = 1), null::text)::int,
		                ''l1_cuq'', COALESCE(string_agg(hierarchy_cuq::text, '','') FILTER (WHERE hierarchy_level_id = 1), null::text),
		                --
		                ''l2_id'', COALESCE(string_agg(hierarchy_id::text, '','') FILTER (WHERE hierarchy_level_id = 2), null::text),
		                ''l2_cid'', COALESCE(string_agg(hierarchy_cid::text, '','') FILTER (WHERE hierarchy_level_id = 2), null::text)::int,
		                ''l2_cuq'', COALESCE(string_agg(hierarchy_cuq::text, '','') FILTER (WHERE hierarchy_level_id = 2), null::text),
		                --
		                ''l3_id'', COALESCE(string_agg(hierarchy_id::text, '','') FILTER (WHERE hierarchy_level_id = 3), null::text),
		                ''l3_cid'', COALESCE(string_agg(hierarchy_cid::text, '','') FILTER (WHERE hierarchy_level_id = 3), null::text)::int,
		                ''l3_cuq'', COALESCE(string_agg(hierarchy_cuq::text, '','') FILTER (WHERE hierarchy_level_id = 3), null::text),
		                --
		                ''l4_id'', COALESCE(string_agg(hierarchy_id::text, '','') FILTER (WHERE hierarchy_level_id = 4), null::text),
		                ''l4_cid'', COALESCE(string_agg(hierarchy_cid::text, '','') FILTER (WHERE hierarchy_level_id = 4), null::text)::int,
		                ''l4_cuq'', COALESCE(string_agg(hierarchy_cuq::text, '','') FILTER (WHERE hierarchy_level_id = 4), null::text),
		                --
		                ''l5_id'', COALESCE(string_agg(hierarchy_id::text, '','') FILTER (WHERE hierarchy_level_id = 5), null::text),
		                ''l5_cid'',COALESCE(string_agg(hierarchy_cid::text, '','') FILTER (WHERE hierarchy_level_id = 5), null::text)::int,
		                ''l5_cuq'', COALESCE(string_agg(hierarchy_cuq::text, '','') FILTER (WHERE hierarchy_level_id = 5), null::text),
		                --
		                ''brand_cid'', COALESCE(string_agg(hierarchy_id::text, '','') FILTER (WHERE hierarchy_level_id = -1), null::text)::int,
		                ''mfg_no'', COALESCE(string_agg(hierarchy_cid::text, '','') FILTER (WHERE hierarchy_level_id = -1), null::text),
		                ''mfg_name'', COALESCE(string_agg(hierarchy_cuq::text, '','') FILTER (WHERE hierarchy_level_id = -1), null::text)
		            ) AS exclusion_data
		            from
		                price_promo.excluded_hierarchy_combination ehc
		            where
		                ehc.promo_id = %1$s
		            group by
		                ehc.combination_identifier
		            order by
		                combination_identifier
		        ) dd
			)
		', _promo_id);

		exclusion_details = '
			''product_hierarchy'', ''{}''::jsonb,
	        ''upload_details'', (SELECT product_exclusion_details FROM exclusion_cte),
	        ''product_ids'', ''{}::jsonb'',
	        ''product_groups'', ''{}::jsonb'' ';

	elsif exclusion_type is null then   	-- no exclusion
		raise notice 'No exclusion';
		cte_query = '';
		exclusion_details = '
			''product_hierarchy'', ''{}''::jsonb,
	        ''upload_details'', ''{}''::jsonb,
	        ''product_ids'', ''{}''::jsonb,
	        ''product_groups'', ''{}''::jsonb
		';

	end if;

	final_query = format('
		%2$s
	    select
	        pm.promo_id,
	        pm.exclusion_selection_type,
	        jsonb_build_object(%3$s) AS product_exclusions
	    from
	        price_promo.promo_master pm
	    where
	        promo_id = %1$s  ;
	', _promo_id, cte_query, exclusion_details);

	raise notice ' Final query -->  %', final_query;

	return query execute final_query;

end
$function$
;
