--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_fetch_approval_dashboard_table_data-5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Rounded of columns for filtering
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_approval_dashboard_table_data;

CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_approval_dashboard_table_data(
 _strategy_id integer[],
 product_h1 integer[],
 product_h2 integer[],
 product_h3 integer[],
 product_h4 integer[],
 product_h5 integer[],
 brand integer[],
 _s0_ids integer[],
 _s1_ids integer[],
 _start_date date,
 _end_date date,
 in_user_id integer,
 in_approval_filter character varying DEFAULT NULL::character varying,
 in_sort_key character varying DEFAULT NULL::character varying,
 in_sort_order character varying DEFAULT 'asc'::character varying,
 in_page_number integer DEFAULT 1,
 status_condition text DEFAULT NULL::text,
 action_status_condition text DEFAULT NULL::text, pcds integer[] DEFAULT NULL::integer[],
 is_dd_filters boolean DEFAULT false,
 in_record_per_page integer DEFAULT 100,
 in_number_of_pages integer DEFAULT 1,
 in_record_offset integer DEFAULT NULL::integer)
 RETURNS TABLE(final_response jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    vl_test_query text :=  '';
   	dummy_data_query text:=    'select null::jsonb';
	filtered_strategy_ids integer[];
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
	store_hierarchy_level integer;
	store_hierarchy_values integer[];
	strategy_where_arr text[];
	start_time TIMESTAMP;
    end_time TIMESTAMP;
	vl_data_offset int;
	vl_output_limit int;
	total_count int := 0;
	final_count int := 0;
	where_condition text := '';
	strategy_fetching_array integer[];
	curr_timezone text := '';
begin
	if in_record_offset is null then
		vl_data_offset :=(in_page_number-1)*in_record_per_page;
	else
		vl_data_offset := in_record_offset;
	end if;
	vl_output_limit := in_record_per_page * in_number_of_pages;
	RAISE NOTICE 'vl_data_offset: %', vl_data_offset;
	RAISE NOTICE 'vl_output_limit: %', vl_output_limit;

	vl_test_query := 'select remarks from metaschema.tb_app_sub_master where name = ''client_timezone''';
	execute vl_test_query into curr_timezone;

	if is_dd_filters is true then
		vl_test_query := format('select array(select distinct am.strategy_id from
									price_markdown.tb_approval_metrics am
								where
									pcd_id = any(%1$L) %2$s %3$s)',
									pcds, status_condition, action_status_condition);
	RAISE NOTICE 'query 1: %', vl_test_query;
		execute vl_test_query into strategy_fetching_array;
		where_condition := format('pcd_id = any(array[%1$s]) and pcd_start_date > date(timezone(''%4$s'', now())) %2$s %3$s',array_to_string(pcds, ',') , status_condition, action_status_condition, curr_timezone);
	else

		if array_length(_strategy_id, 1) > 0 then
			filtered_strategy_ids := _strategy_id;
		else
			if array_length(product_h5, 1) > 0 then
				product_hierarchy_level := 4;
				product_hierarchy_values := product_h4;
			elsif array_length(product_h4, 1) > 0 then
				product_hierarchy_level := 3;
				product_hierarchy_values := product_h4;
			elsif array_length(product_h3, 1) > 0 then
				product_hierarchy_level := 2;
				product_hierarchy_values := product_h3;
			elsif array_length(product_h2, 1) > 0 then
				product_hierarchy_level := 1;
				product_hierarchy_values := product_h2;
			elsif array_length(product_h1, 1) > 0 then
				product_hierarchy_level := 0;
				product_hierarchy_values := product_h1;
			else
				product_hierarchy_level := -1;
			end if;

			if product_hierarchy_level <> -1 then
				strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
					    SELECT
				            strategy_id
				        FROM
				            price_markdown.tb_strategy_hierarchy
				        WHERE is_product_hierarchy = 1
					    AND hierarchy_level = %1$s::integer
					    AND hierarchy_value = ANY(array[%2$s])
			    	)', product_hierarchy_level, array_to_string(product_hierarchy_values, ','))) ;
			end if;

			strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
                select
                    strategy_id
                from price_markdown.tb_strategy_store_hierarchies tsh
                where
                    s0_ids && array[%1$s]::bigint[]
                    and s1_ids && array[%2$s]::bigint[]
            )',
            array_to_string(_s0_ids,','),
            array_to_string(_s1_ids,',')
            )
        );

			if array_length(brand, 1) > 0 then
					strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
						    SELECT
					            strategy_id
					        FROM
					            price_markdown.tb_strategy_hierarchy
					        WHERE is_product_hierarchy = 1
						    AND hierarchy_level = 0
						    AND hierarchy_value = ANY(array[%1$s])
				    	)', array_to_string(brand, ','))) ;
			end if;

			vl_test_query := format('select
									array_agg(sm.strategy_id)
								from
									price_markdown.tb_strategy_master sm
								where
									sm.status = 2
									and sm.start_date <= ''%2$s''::date
									and sm.end_date >= ''%1$s''::date
									%3$s', _start_date, _end_date, array_to_string(strategy_where_arr, ' ')
								);
			--raise notice ' strategy filter query ----- %', query_;
			execute vl_test_query into filtered_strategy_ids;
		end if;
		where_condition := format('am.strategy_id = any(array[%1$s]) and pcd_start_date > date(timezone(''%2$s'', now()))', array_to_string(filtered_strategy_ids, ','), curr_timezone);
		strategy_fetching_array := filtered_strategy_ids;
	end if;

	if ((array_length(filtered_strategy_ids, 1) > 0) or (array_length(pcds, 1) > 0)) then

	  vl_test_query :=  'drop table if exists tb_tmp_final_metrics;';
	  execute vl_test_query;

	  vl_test_query:= format('create temp table tb_tmp_final_metrics as
			(
			select
			strategy_id,
			sm.strategy_name,
			pcd_id,
			pcd_start_date,
			pcd_end_date,
			level_mapping.product_level_value,
			am.product_level_id,
			channel_info,
			stores_with_inventory,
			am.status,
			am.action_status,
			pcd_number,
			dept,
			class,
			brand,
			mfg,
			base_price,
			age,
			updated_at,
			-- fin
			round(fin_units) as fin_sales_units,
			round(fin_revenue::numeric) as fin_revenue_$,
			round(fin_margin::numeric) as fin_gm_$,
			round(fin_gm_percent::numeric) as fin_gm_percent,
			round(fin_aum::numeric) as fin_aum_$,
			round(fin_sellthrough::numeric) as fin_st_percent,
			round(fin_markdown_spend) as fin_markdown_$,
			round(fin_inventory) as fin_inventory,
			fin_discount,
			round(fin_incremental_discount) as fin_incremental_discount,
			fin_previous_discount,
			round(fin_pcd_price::numeric,2) as fin_pcd_price,
			round(fin_previous_pcd_price::numeric,2) as fin_previous_pcd_price,
			fin_markdown_type,
			fin_previous_markdown_type,
			fin_inventory_cost,
			-- IA
			round(ia_units) as ia_sales_units,
			round(ia_revenue::numeric) as ia_revenue_$,
			round(ia_margin::numeric) as ia_gm_$,
			round(ia_gm_percent::numeric) as ia_gm_percent,
			round(ia_aum::numeric) as ia_aum_$,
			round(ia_sellthrough::numeric) as ia_st_percent,
			round(ia_markdown_spend) as ia_markdown_$,
			round(ia_inventory) as ia_inventory,
			ia_discount,
			round(ia_incremental_discount) as ia_incremental_discount,
			ia_previous_discount,
			round(ia_pcd_price::numeric,2) as ia_pcd_price,
			round(ia_previous_pcd_price::numeric,2) as ia_previous_pcd_price,
			ia_markdown_type,
			ia_previous_markdown_type,
			ia_inventory_cost
			from price_markdown.tb_approval_metrics am
			inner join
			(select strategy_id, strategy_name from price_markdown.tb_strategy_master) sm
			using (strategy_id)
			inner join (
					select product_level_id, min(product_level_value) as product_level_value
					from price_markdown.tb_strategy_sku_store_mapping
					where strategy_id = any (%2$L)
					group by 1
					) level_mapping
			using(product_level_id)
			where %1$s
			);',where_condition,
			--vl_output_limit, vl_data_offset,
		strategy_fetching_array);

		RAISE NOTICE 'SQL 4 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;


		vl_test_query := format('
			select count(*)
			from tb_tmp_final_metrics
			%1$s
			', in_approval_filter, where_condition);
		RAISE NOTICE 'count statement: %', vl_test_query;
		execute vl_test_query into final_count;

		if in_page_number = -1 then
	        vl_data_offset := 0;
	        vl_output_limit := final_count;
	    end if;

		vl_test_query:=format('drop table if exists public.TB_dashboard_table_data_%1$s',in_user_id);
        execute vl_test_query;

		vl_test_query:= format('create unlogged table public.TB_dashboard_table_data_%3$s as (select jsonb_build_object(
			''timeline'',jsonb_build_object(
				''start_date'',  %2$L::date,
				''end_date'', %1$L::date
			),
			''count'', %19$L,
			''table_data'',
				jsonb_agg(
					json_build_object(
						''strategy_id'',fm.strategy_id,
						''strategy_name'',fm.strategy_name,
						''pcd_id'',fm.pcd_id,
						''pcd_start_date'',fm.pcd_start_date::date,
						''pcd_end_date'',fm.pcd_end_date::date,
						''product_level_value'',fm.product_level_value,
						''product_level_id'',fm.product_level_id,
						''channel_info'',fm.channel_info,
						''stores_with_inventory'',fm.stores_with_inventory,
						''unique_key'',gen_random_uuid(),
						''status'',fm.status,
						''action_status'', fm.action_status,
						''pcd_number'', fm.pcd_number,
						''dept'', fm.dept,
						''class'', fm.class,
						''brand'', fm.brand,
						''mfg'', fm.mfg,
						''base_price'', fm.base_price,
						''age'', fm.age,
						''updated_at'', fm.updated_at,
					''metrics'',jsonb_build_object(
						''fin_sales_units'',fm.fin_sales_units,
						''fin_revenue_$'',fm.fin_revenue_$,
						''fin_gm_$'',fm.fin_gm_$,
						''fin_gm_percent'',fm.fin_gm_percent,
						''fin_aum_$'',fm.fin_aum_$,
						''fin_st_percent'',fm.fin_st_percent,
						''fin_markdown_$'',fm.fin_markdown_$,
						''fin_inventory'',fm.fin_inventory,
						''fin_discount'',fm.fin_discount,
						''fin_incremental_discount'',fm.fin_incremental_discount,
						''fin_previous_discount'',fm.fin_previous_discount,
						''fin_pcd_price'',fm.fin_pcd_price,
						''fin_previous_pcd_price'',fm.fin_previous_pcd_price,
						''fin_markdown_type'',fm.fin_markdown_type,
						''fin_previous_markdown_type'', fm.fin_previous_markdown_type,
						''fin_inventory_cost'', fm.fin_inventory_cost,

						''ia_sales_units'',fm.ia_sales_units,
						''ia_revenue_$'',fm.ia_revenue_$,
						''ia_gm_$'',fm.ia_gm_$,
						''ia_gm_percent'',fm.ia_gm_percent,
						''ia_aum_$'',fm.ia_aum_$,
						''ia_st_percent'',fm.ia_st_percent,
						''ia_markdown_$'',fm.ia_markdown_$,
						''ia_inventory'',fm.ia_inventory,
						''ia_discount'',fm.ia_discount,
						''ia_incremental_discount'',fm.ia_incremental_discount,
						''ia_previous_discount'',fm.ia_previous_discount,
						''ia_pcd_price'',fm.ia_pcd_price,
						''ia_previous_pcd_price'',fm.ia_previous_pcd_price,
						''ia_markdown_type'',fm.ia_markdown_type,
						''ia_previous_markdown_type'', fm.ia_previous_markdown_type,
						''ia_inventory_cost'', fm.ia_inventory_cost
					)
					)
					order by %14$s %15$s
				)
			) as final_response,
			%4$L as _strategy_id,
			%5$L as product_h1 ,
			%6$L as product_h2 ,
			%7$L as product_h3 ,
			%8$L as product_h4 ,
			%9$L as product_h5 ,
			%10$L as brand      ,
			%11$L as store_h1   ,
			%12$L as store_h2   ,
			%2$L as _start_date,
			%1$L as _end_date
			from
				(
				    select * from tb_tmp_final_metrics
				    %16$s
				    limit %17$s offset %18$s
				) fm

			);',
				_end_date,_start_date,in_user_id,_strategy_id,
				product_h1 , product_h2 , product_h3 , product_h4, product_h5,
				brand,_s0_ids,_s1_ids, total_count, in_sort_key, in_sort_order, in_approval_filter,
				vl_output_limit, vl_data_offset, final_count
			);

		RAISE NOTICE 'SQL final statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL final statement: %', end_time - start_time;
		vl_test_query := format('Select final_response from public.TB_dashboard_table_data_%1$s;',in_user_id);
		return query  execute vl_test_query;
	else
		return query  execute dummy_data_query;
	end if;
	--raise notice 'query: %', q2;
END;
$function$
;
