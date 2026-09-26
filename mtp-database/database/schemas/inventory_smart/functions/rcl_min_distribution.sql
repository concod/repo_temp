--liquibase formatted sql
--changeset akash.bhandari:inventory_smart_rcl_min_distribution runOnChange:true stripComments:false splitStatements:false context:initial labels:inventory_smart_rcl_min_distribution MTP-103848
--comment: Initial changeset for rcl_min_distribution function in inventory_smart schema
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_min_distribution(text, text, text, jsonb, int4, varchar);
DROP FUNCTION IF EXISTS  inventory_smart.rcl_min_distribution(text, text, jsonb, jsonb, jsonb, int4, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.rcl_min_distribution(p_distribution_type text, _temp_tbl_name text, channel_filter jsonb, store_filter jsonb, product_filter jsonb, _rule_id integer DEFAULT NULL::integer, _psa_code character varying DEFAULT NULL::character varying)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result json;
    v_uuid text := replace(gen_random_uuid()::text, '-', '');
    v_prod_data_table text := format('prod_data_%s', v_uuid);
    v_query text;
    v_query_combine text;
    v_special_classification text;
    v_pp_code bigint;
	v_sa_sql text := '';
	_psaf_hierarchy_level text;
	v_store_attr_cols text;
	_psaf_hierarchy_level_array text[];
	v_pa_sql text := '';
	v_channel_where_clause text := '';
	v_pa_sql_without_channel text :='';
	v_alloc_chk_q text :='';
	v_is_alloc_eligible boolean;
BEGIN

    -- Get comma-separated list of store attribute columns
	SELECT string_agg('psaf.' || quote_ident(attribute_name), ', ')
    INTO v_store_attr_cols
    FROM inventory_smart.rcl_master_attribute_list
    WHERE module_code = 170
      AND attribute_dimension = 'store';

    raise notice 'dynamic store attributes: %', v_store_attr_cols;

	SELECT string_to_array(
	           replace(attribute_value->>'value', '"', ''),
	           ','
	       )
	INTO _psaf_hierarchy_level_array
	FROM global.tenant_attribute_master
	WHERE name = 'psaf_hierarchy_level';

	SELECT array_to_string(ARRAY(SELECT '"' || trim(col) || '"' FROM unnest(_psaf_hierarchy_level_array) col), ', ')
	INTO _psaf_hierarchy_level;

	raise notice '_psaf_hierarchy_level: %', _psaf_hierarchy_level;

	
	if _rule_id is not null then
		v_sa_sql := ' where  '|| quote_literal(_rule_id) ||'= any(rule_codes) and '|| quote_literal(_psa_code) ||' = any(psa_codes)';
		raise notice 'v_sa_sql: %', v_sa_sql;
	else
		v_sa_sql := global.form_main_table_filters(
		    'store_attributes_filter'::Text,
		    store_filter::jsonb
	  	);
	raise notice 'v_sa_sql: %', v_sa_sql;
	end if;
	
	v_pa_sql_without_channel := global.form_main_table_filters('product_attributes_filter'::Text, product_filter::jsonb);
	raise notice 'v_pa_sql_without_channel: %', v_pa_sql_without_channel;

	-- -------------------------------------------------
	-- Prepare channel where clause 
	-- -------------------------------------------------
	raise notice 'channel_filter data : %', channel_filter;
	
	IF channel_filter IS NOT NULL AND (channel_filter->>'include_channel')::boolean = true THEN
	
	    v_channel_where_clause := format(
	        ' %1$I = %2$L ',
	        channel_filter->>'channel_filter_column_name',
	        channel_filter->>'channel_filter_value'
	    );

		v_pa_sql := v_pa_sql_without_channel || ' AND ' || v_channel_where_clause;
	
	ELSE

    	v_pa_sql := v_pa_sql_without_channel;

	END IF;
	
	RAISE NOTICE 'v_pa_sql query after adding v_channel_where_clause: %', v_pa_sql;

	v_alloc_chk_q := format(
	    $sql$
	    WITH distinct_sizes AS MATERIALIZED (
	        SELECT DISTINCT size, %1$s
	        FROM global.product_attributes_filter
	        %2$s
	    )
	    SELECT EXISTS (
	        SELECT 1
	        FROM distinct_sizes ds
	        JOIN global.product_store_attributes_filter psaf
	        USING (%1$s)
	    )
	    $sql$,
	    _psaf_hierarchy_level,
	    v_pa_sql_without_channel
	);
	
	RAISE NOTICE 'Allocation check query for requested article: %', v_alloc_chk_q;
	
	EXECUTE v_alloc_chk_q INTO v_is_alloc_eligible;
	
	IF NOT v_is_alloc_eligible THEN
	    RETURN json_build_object(
	        'success', false,
	        'message', 'This article is currently not eligible for allocation so distribution details cannot be displayed. You may still save the distribution type for future use.',
	        'data', json_build_array()
	    );
	END IF;

   IF p_distribution_type = 'same_min' OR p_distribution_type = 'product_profile' OR p_distribution_type = 'x_units_per_size' OR p_distribution_type = 'equal_distribute' THEN
        ---------------------------------------------------------------------
        -- Inline logic of get_product_profiles_v3
        ---------------------------------------------------------------------

        -- Drop temp table if exists
        v_query := format('DROP TABLE IF EXISTS %I CASCADE;', v_prod_data_table);
        EXECUTE v_query;

        -- Create temp product data table
        --v_query := format('CREATE UNLOGGED TABLE %I AS SELECT unnest(product_codes) AS product_code FROM inventory_smart.ph_master ' || v_pa_sql || '');

		v_query := format(
		    'CREATE UNLOGGED TABLE %1$I AS
		     SELECT unnest(product_codes) AS product_code
		     FROM inventory_smart.ph_master
		     %2$s',
		    v_prod_data_table,
		    v_pa_sql
		);

		RAISE NOTICE 'Create temp product data table query: %', v_query;
        EXECUTE v_query;

        -- First, get pp_code and special_classification
        SELECT g.default_product_profile, ppm.special_classification
        INTO v_pp_code, v_special_classification
        FROM inventory_smart.generate_rcl_dc_store_policy(v_prod_data_table, 10003, current_date) g
        LEFT JOIN inventory_smart.product_profile_master ppm
               ON g.default_product_profile = ppm.pp_code;

        RAISE NOTICE 'default_product_profile: %', v_pp_code;
        RAISE NOTICE 'v_special_classification: %', v_special_classification;

        -- Decide logic based on classification
        IF v_pp_code IS NULL THEN
            -- IA: return article + size level contribution
            -- Try to fetch pp_code dynamically for this article

			v_query := format(
			    'SELECT pp_code
			     FROM inventory_smart.product_profile_master
				 JOIN inventory_smart.ph_master phm
				 USING(ph_code) ' || v_pa_sql || ' AND NOT is_deleted');

			RAISE NOTICE 'fetch IA pp code query: %', v_query;
			EXECUTE v_query INTO v_pp_code;

            RAISE NOTICE 'v_pp_code: %', v_pp_code;

			IF v_pp_code IS NULL THEN
				-- Return message -> Forcaste not available for this product. Please attach user defined product profile.
				--RETURN 'Forcaste not available for this product. Please attach user defined product profile.';

				RETURN json_build_object(
				    'success', False,
				    'message', 'Forecast is not available for this product. Please attach a user-defined product profile.',
					'data', json_build_array()
				);

			ELSE

	            v_query_combine := format(
	                $sql$
	                SELECT 
	                    saf.store_code,
	                    saf.store_name,
						%1$s,
	                    COALESCE(ppm.overall_proportion, 0) AS overall_proportion,
	                    COALESCE(ppm.size_level_proportion, 0) AS size_level_proportion,
	                    paf."size",
						array_agg(rule_code) as rule_codes,
	--					string_agg(distinct rule_code::text, ', ') as rule_codes,
						array_agg(psa_code) as psa_codes
	                FROM inventory_smart.product_profile_mapping ppm
	                RIGHT JOIN "global".product_attributes_filter paf 
							USING(l0_name, product_code)
	                JOIN "global".store_attributes_filter saf 
	                       USING(store_code)
					JOIN global.product_store_attributes_filter psaf USING (store_code, $sql$ || _psaf_hierarchy_level || $sql$)
	                join inventory_smart.rcl_constraint_master using(psa_code)
					where ppm.pp_code = %2$s
					GROUP BY saf.store_code, saf.store_name, %1$s, saf.channel,
	                         paf.article, ppm.overall_proportion, 
	                         ppm.size_level_proportion, paf."size"
	                ORDER BY saf.store_code
	                $sql$,
				    v_store_attr_cols,
				    v_pp_code
	            );

			END IF;

        ELSE
            v_query_combine := format(
                $sql$
                WITH distinct_sizes AS MATERIALIZED (
                    SELECT DISTINCT size, $sql$ || _psaf_hierarchy_level || $sql$
                    FROM global.product_attributes_filter
                    %1$s AND active
                )
                SELECT
                    saf.store_code,
                    saf.store_name,
					%2$s,
                    pum.overall_proportion,
                    pum.size_level_proportion,
                    pum.size,
					array_agg(rule_code) as rule_codes,
--					string_agg(distinct rule_code::text, ', ') as rule_codes,
					array_agg(psa_code) as psa_codes
                FROM (select overall_proportion, size_level_proportion, size, store_code, pp_code from inventory_smart.product_profile_user_mapping_size) pum
                JOIN global.store_attributes_filter saf USING(store_code)
                JOIN distinct_sizes ds using (size)
				JOIN global.product_store_attributes_filter psaf USING (store_code, $sql$ || _psaf_hierarchy_level || $sql$)
                join inventory_smart.rcl_constraint_master using(psa_code)
				WHERE pum.pp_code = %3$L
                GROUP BY saf.store_code, saf.store_name, %2$s, pum.overall_proportion, pum.size_level_proportion, pum.size
                ORDER BY 1
                $sql$,
				v_pa_sql_without_channel,
				v_store_attr_cols,
                v_pp_code
            );
			RAISE NOTICE 'v_query_combine pp code query: %', v_query_combine;
        END IF;

        -- Create final result table in public schema

		v_query := format(
		    $sql$
		    CREATE TABLE public.%1$I AS
            WITH active_sizes AS (
                SELECT DISTINCT paf.size, ast."order"
                FROM global.product_attributes_filter paf
				left join inventory_smart.article_status_tag ast
				using(product_code)
				%2$s AND active
            ),
		    summed AS (
		        SELECT *, SUM(size_level_proportion) OVER (PARTITION BY store_code) AS store_sum
		        FROM (%3$s) t
		    ),
		    rescaled AS (
		        SELECT *,
		            CASE 
		                WHEN store_sum = 0 THEN 0
		                ELSE size_level_proportion / store_sum
		            END AS normalized_proportion
		        FROM summed
		    ),
			filtered_stores AS (
		        select DISTINCT saf.store_code, saf.store_name from (SELECT store_code, store_name
		        FROM global.store_attributes_filter)saf
				JOIN summed su USING (store_code)
		        %4$s
		    ),
	        all_combinations AS (
	            SELECT fs.store_code, s.size, fs.store_name, s."order"
	            FROM filtered_stores fs
	            CROSS JOIN active_sizes s
	        ),
			combined AS (
			    SELECT 
			        a.store_code,
			        COALESCE(r.store_name, a.store_name) AS store_name,
			        a.size,
					a."order",
			        COALESCE(r.size_level_proportion, 0) AS size_level_proportion,
			        COALESCE(r.normalized_proportion, 0) AS normalized_proportion
			    FROM all_combinations a
			    LEFT JOIN rescaled r
			      ON a.store_code = r.store_code
			     AND a.size = r.size
			)
		    SELECT
		        c.store_code,
		        c.store_name,
				json_object_agg(c.size, c.size_level_proportion ORDER BY c."order") AS base_size_level_proportion,
				json_object_agg(c.size, ROUND(c.normalized_proportion::numeric * 100, 2) ORDER BY c."order") AS normalized_size_level_proportion

		    FROM combined c
		    LEFT JOIN filtered_stores fs USING (store_code)
		    WHERE fs.store_code IS NOT NULL OR %5$s
		    GROUP BY c.store_code, c.store_name;
		    $sql$,
			_temp_tbl_name,
			v_pa_sql,
		    v_query_combine,
		    CASE WHEN v_sa_sql IS NULL OR v_sa_sql = '' THEN '' ELSE v_sa_sql END,
		    CASE WHEN v_sa_sql IS NULL OR v_sa_sql = '' THEN 'TRUE' ELSE 'FALSE' END
		);
		
		RAISE NOTICE 'Final query with store filter: %', v_query;
        EXECUTE v_query;

		IF p_distribution_type = 'product_profile' THEN
	        -- Return result as JSON
	        v_query := format('SELECT json_agg(t) FROM %I t;', _temp_tbl_name);
	        EXECUTE v_query INTO v_result;

		    RETURN json_build_object(
		        'success', True,
		        'message', 'Product profile distribution generated successfully.',
		        'data', v_result
		    );

		ELSIF p_distribution_type = 'x_units_per_size' THEN
			
	        ---------------------------------------------------------------------
	        -- At least X units per size ==> Return the active sizes from paf
	        ---------------------------------------------------------------------

			EXECUTE format(
			    'SELECT COALESCE(json_agg(paf.size ORDER BY ast."order"), ''[]''::json)
			     FROM global.product_attributes_filter paf
			     LEFT JOIN inventory_smart.article_status_tag ast
			     USING(product_code)
			     ' || v_pa_sql || '
			       AND active'
			)
			INTO v_result;

		    RETURN json_build_object(
		        'success', True,
		        'message', 'Active sizes fetched successfully.',
		        'data', v_result
		    );


		ELSIF p_distribution_type = 'equal_distribute' OR p_distribution_type = 'same_min' THEN
			
	        ---------------------------------------------------------------------
	        --  'Equally distribute or same minimum' ==> Return null
	        ---------------------------------------------------------------------
	
			RETURN json_build_object(
			    'success', True,
			    'message', 'Equal distribution or same minimum applied.',
			    'data', json_build_array()
			);

		END IF;

    ELSE

		RETURN json_build_object(
		    'success', False,
		    'message', 'Invalid distribution type.',
		    'data', json_build_array()
		);

    END IF;
END;
$function$
;