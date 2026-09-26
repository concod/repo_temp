--liquibase formatted sql
--changeset hareeshwar.c@impactanalytics.co:fn_get_promo_exclusion_details_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Fixed logic for exclusion type 3

DROP FUNCTION if exists price_promo.fn_get_promo_exclusion_details;

CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_exclusion_details(_promo_id integer)
 RETURNS TABLE (
	promo_id integer,
	exclusion_selection_type smallint,
	product_exclusions jsonb
 )
 LANGUAGE plpgsql
AS $function$
declare
	exclusion_type int;
	final_query text;
	cte_query text;
	exclusion_details text;
    _product_hierarchies_config jsonb;
    _dynamic_hierarchy_string_array text[];
    _hierarchy_key text;
    _hierarchy_value jsonb;
    _exclusion_hierarchy_upload_config jsonb;
begin
	select pm.exclusion_selection_type into exclusion_type from price_promo.promo_master pm where pm.promo_id = _promo_id;
	raise notice ' Exclusion type = %', exclusion_type;


    select config_value::jsonb into _product_hierarchies_config
    from price_promo.tb_tool_configurations
    where module = 'product' and config_name = 'hierarchy_filters';

	if exclusion_type = 1 then   	-- hierarchy selection
        _dynamic_hierarchy_string_array = array[]::text[];

        for _hierarchy_key, _hierarchy_value in select key, value from jsonb_each(_product_hierarchies_config) loop
            if _hierarchy_value->>'id_column' = 'product_id' then
                continue;
            end if;
            _dynamic_hierarchy_string_array = array_append(
                _dynamic_hierarchy_string_array,
                format(
                    '
                        ''%1$s'',coalesce(jsonb_agg(case when hierarchy_level_id = %2$s then jsonb_build_object(''label'', hierarchy_cuq, ''value'', hierarchy_cid) end) filter (where hierarchy_level_id = %2$s), ''[]''::jsonb)
                    ',
                    _hierarchy_key,
                    _hierarchy_value->>'id'
                )

            );
        end loop;

		raise notice 'Hierarchy exclusion';
		cte_query = format('
			with exclusion_cte as (
				select
		            coalesce(jsonb_agg(exclusion_hierarchy), ''[]''::jsonb) as product_exclusion_details
		        from (
		            select
		                json_build_object(
                            %2$s
		                ) AS exclusion_hierarchy
		            from
		                price_promo.excluded_hierarchy_combination ehc
		            where
		                ehc.promo_id = %1$s
		        ) dd
			)
            ',
            _promo_id,
            array_to_string(_dynamic_hierarchy_string_array, ',')
        );
        raise notice 'CTE query --> %', cte_query;

		exclusion_details = '
				''product_hierarchy'', (SELECT product_exclusion_details FROM exclusion_cte),
	            ''upload_details'', ''{}''::jsonb,
	            ''product_ids'', ''{}''::jsonb,
	            ''product_groups'', ''{}''::jsonb';

	elsif exclusion_type in (2,4) then   	-- copy paste or upload excel
		raise notice 'Copy paste exclusion';
		cte_query = format('
			with exclusion_cte as (
				select
		            coalesce(
		                jsonb_agg(
		                    jsonb_build_object(
		                        ''oh_inventory'', pm.oh,
		                        ''it_inventory'', pm.it,
		                        ''oo_inventory'', pm.oo
		                    )
                            ||
                            to_jsonb(pm.*)
		                ),
		                ''[]''::jsonb
		            ) as product_exclusion_details
		        from
		            price_promo.excluded_products ep,
		            price_promo.product_master pm
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
			with product_master_cte as (
				select
					l0_cid,
					l0_cuq,
					l1_cid,
					l1_cuq,
					l2_cid,
					l2_cuq
				from price_promo.product_master
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
		            pricesmart.tb_product_group tpg
		            left join global.user_master um1 on um1.user_code = tpg.created_by
		            left join global.user_master um2 on um2.user_code = tpg.updated_by
		            left join (
		            	select
		            		ph.pg_id,
		            		array_agg(distinct hc.l0_cuq) FILTER (WHERE ph.hierarchy_level = 0) AS l0_names,
		            		array_agg(distinct hc.l1_cuq) FILTER (WHERE ph.hierarchy_level = 1) AS l1_names,
		            		array_agg(distinct hc.l2_cuq) FILTER (WHERE ph.hierarchy_level = 2) AS l2_names
		            	from pricesmart.tb_pg_hierarchy ph
		            	left join product_master_cte hc on
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
	        ''upload_details'', ''{}''::jsonb,
	        ''product_ids'', ''{}''::jsonb,
	        ''product_groups'', (SELECT product_exclusion_details FROM exclusion_cte)';


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
