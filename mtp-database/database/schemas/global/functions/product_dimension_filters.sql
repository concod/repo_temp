--liquibase formatted sql
--changeset akash.bhandari@impactanalytics.co:MTP-136700 runOnChange:true stripComments:false splitStatements:false context:MTP-136700 labels:MTP-136700
--comment: comment: Refactored product_dimension_filters to support product + product_store filtering, added early filtering & DISTINCT-based optimization to avoid large joins, improved performance from ~40 min to <2 sec, fixed check_configuration handling and varchar[] issues
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_dimension_filters(input refcursor, character varying[], jsonb);
CREATE OR REPLACE FUNCTION global.product_dimension_filters(input refcursor, character varying[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
 Returns aggregated distinct values for product attributes sent in $2
 Calling Statement: 
 	 select * from global.product_dimension_filters('abc','{"l0_name","l2_name"}', 
 	'{"l0_name": []}')

	---------------------------------------------------------------
	Decision Block: Product vs Product-Store Filtering Strategy
	---------------------------------------------------------------
	
	We split incoming filters into:
	1. product filters          → applied on product_attributes_filter (PAF)
	2. product_store filters    → applied on product_store_attributes_filter (PSAF)
	
	
	CASE 1: No product_store filters present
	---------------------------------------
	If `_product_store_filters` is empty, all filters belong only to the
	product dimension.
	
	→ We directly use:
	   global.form_attribute_table_filters_v2('product_attributes', ...)

	→ Kept earlier logic

	CASE 2: product_store filters exist (Multi-dimension case)
	---------------------------------------------------------
	If `_product_store_filters` is NOT empty, filtering involves both
	product and product_store dimensions.
	
	→ We:
	   1. Apply filters separately on both tables
	   2. Build two reduced datasets:
	        - filtered_paf   (product filters)
	        - filtered_psaf  (product_store filters)
	
	   3. Join them using common hierarchy columns
	        (e.g., l0_name, l1_name, l2_name)
	
	→ Ensures correct cross-dimension filtering
	
	
	---------------------------------------------------------------
	Critical Optimization Applied
	---------------------------------------------------------------
	
	Problem (Earlier Implementation):
	--------------------------------
	- JOIN was happening BEFORE aggregation
	- Then applied:
	
	    array_agg(DISTINCT l3_name),
	    array_agg(DISTINCT l4_name)
	
	on the joined dataset
	
	→ This caused:
	   - Huge intermediate dataset (~2B rows)
	   - DISTINCT aggregation on massive data
	   - Execution time ~40+ minutes
	
	
	Optimized Solution (Current Implementation):
	-------------------------------------------
	We changed execution order:
	
	1. Apply filters EARLY on both tables
	2. Use SELECT DISTINCT inside CTEs:
	       - filtered_paf
	       - filtered_psaf
	
	3. JOIN only the reduced datasets
	
	4. Perform aggregation:
	       array_agg(DISTINCT ...)
	
	→ Now aggregation runs on a very small dataset
	
	
	Performance Impact:
	-------------------
	Before:
	- Join first, then aggregate
	- ~2 billion rows processed
	- ~40+ minutes execution time
	
	After:
	- Filter + DISTINCT first, then join
	- Very small dataset in join
	- Execution time < 2 seconds

	Key Principle:
	--------------
	"Filter Early → Reduce Data → Then Join → Then Aggregate"
	
	NOT:
	"Join → Then Aggregate"

  */
	declare
	_query text := '';
	_projection_queries text[];
	_col text;
    _attr_obj jsonb;
	_check_config jsonb;
	_check_config_val jsonb;
	_res jsonb;
	_res_item jsonb;
    _res_array text[] := '{}';
    _temp text;
    _sp_input_arg text;

    _product_filters jsonb := '{}'::jsonb;
    _product_store_filters jsonb := '{}'::jsonb;
	_product_filters_ text;
	_product_store_filters_ text;
	_common_columns text[] := '{}';
	_paf_select_cols text[];
	_psaf_select_cols text[];
	_psaf_filter_cols text[];
	_using_clause text;

	begin

		_projection_queries := '{}';
		foreach _col in array $2 loop
			_projection_queries := array_append(
				_projection_queries, 
				'array_agg(distinct ' || _col || ') as ' || _col || '');

		end loop;
 		raise notice ' _projection_queries - %',_projection_queries;
 		
 		FOR _col IN SELECT jsonb_object_keys($3) LOOP
		    _check_config := jsonb_extract_path($3, _col);
		    for _attr_obj in select * from jsonb_array_elements(_check_config) loop
		    	_check_config_val := _attr_obj->>'check_configuration';
		    	if _check_config_val is not null then
		    		-- Skip if check_configuration array contains any element with {"checkedRows": [null]} or {"unCheckedRows": [null]}
		    		if exists (
		    			select 1 from jsonb_array_elements(_check_config_val::jsonb) as elem
		    			where (elem ? 'checkedRows' and elem->'checkedRows' @> '[null]'::jsonb)
		    			   or (elem ? 'unCheckedRows' and elem->'unCheckedRows' @> '[null]'::jsonb)
		    		) then
		    			continue;
		    		end if;
					-- MTP-133919: Short-circuit when values are already resolved by frontend.
					-- Skip expensive select_all_transactions if check_configuration is simple
					-- (checkAll/checkedRows with no unCheckedRows and no meta search/range)
					-- and the values array is already populated.
					IF (
						NOT EXISTS (
							SELECT 1 FROM jsonb_array_elements(_check_config_val::jsonb) AS elem
							WHERE (elem ? 'unCheckedRows')
							   OR (elem ? 'unCheckAll')
							   OR (elem ? 'meta' AND elem->'meta' != '{}'::jsonb
							       AND (
							           (elem->'meta' ? 'search' AND jsonb_array_length(COALESCE(elem->'meta'->'search', '[]'::jsonb)) > 0)
							           OR (elem->'meta' ? 'range' AND jsonb_array_length(COALESCE(elem->'meta'->'range', '[]'::jsonb)) > 0)
							       ))
						)
						AND (_attr_obj->'values') IS NOT NULL
						AND jsonb_typeof(_attr_obj->'values') = 'array'
						AND jsonb_array_length(_attr_obj->'values') > 0
					) THEN
						_attr_obj = _attr_obj - 'check_configuration';
						$3 := jsonb_set($3, array[_col], jsonb_build_array(_attr_obj));
						CONTINUE;
					END IF;
				    _attr_obj = _attr_obj - 'check_configuration';
		    		_sp_input_arg := '{"0": {}, "1": {"cols": "' || _col || '"}, "2": {"' || _col || '": ' || jsonb_build_array(_attr_obj) || '}}';
					_query := format('SELECT json_agg(result) FROM (SELECT * FROM global.select_all_transactions(%L, %L, %L,true)) AS result',
                  	'global.product_dimension_filters_select_all',
                  	_sp_input_arg,
                  	'{"data":' || coalesce(_check_config_val::text, '[]') || ',"unique_columns":' || jsonb_build_array(_col) || '}'
                  	);
				   	execute _query INTO _res;
				   
				    for _res_item in select * from jsonb_array_elements(_res) loop
				        _temp := _res_item->'set_all_data'->>_col;
				        BEGIN
				            IF jsonb_typeof(_temp::jsonb) = 'array' THEN
				                _res_array := array_cat(_res_array, ARRAY(SELECT jsonb_array_elements_text(_temp::jsonb)));
				            ELSE
				                _res_array := array_append(_res_array, _temp);
				            END IF;
				        EXCEPTION WHEN OTHERS THEN
				            _res_array := array_append(_res_array, _temp);
				        END;
				    end loop;
				 	
				 	_res_item = jsonb_set(_attr_obj, '{values}', to_jsonb(_res_array));
				 	$3 := jsonb_set($3, array[_col],jsonb_build_array(_res_item));	
				 	_res_array := '{}';				 
				end if;
		    end loop;
		 end loop;

	    /* -----------------------------------------
	       Split filters based on dimension
	    ----------------------------------------- */
	
	    FOR _col IN SELECT jsonb_object_keys($3)
	    LOOP
	        _check_config := $3 -> _col;
	
	        -- assuming single object per column (your structure)
	        _attr_obj := _check_config->0;
	
	        IF (_attr_obj->>'dimension') = 'product' THEN
	            _product_filters := jsonb_set(
	                _product_filters,
	                ARRAY[_col],
	                jsonb_build_array(_attr_obj),
	                true
	            );
	
	        ELSIF (_attr_obj->>'dimension') = 'product_store' THEN
	            _product_store_filters := jsonb_set(
	                _product_store_filters,
	                ARRAY[_col],
	                jsonb_build_array(_attr_obj),
	                true
	            );
	        END IF;
	    END LOOP;

	    RAISE NOTICE 'Product Filters: %', _product_filters;
	    RAISE NOTICE 'Product Store Filters: %', _product_store_filters;


		-- CASE 1: No product_store filters present, kept existing logic
		IF NOT EXISTS (
		    SELECT 1 FROM jsonb_each(_product_store_filters)
		) THEN
	 		_query := 'select ' || ARRAY_TO_STRING(_projection_queries, ', ', '') || '
					 from (' || ("global".form_attribute_table_filters_v2('product_attributes',
					'product_code', $3)) || ' ) X';
	 		 raise notice ' _query - %',_query;


		-- CASE 2: product_store filters exist (Multi-dimension case)
		ELSE
		    RAISE NOTICE ' Product Store Filters -';
		
		    _product_filters_ := global.form_main_table_filters(
		        'product_attributes_filter', _product_filters
		    );
		
		    _product_store_filters_ := global.form_main_table_filters(
		        'product_store_attributes_filter', _product_store_filters
		    );
		
		    ---------------------------------------------------------
		    -- STEP 1: GET COMMON COLUMNS (FOR JOIN)
		    ---------------------------------------------------------
		    SELECT array_agg(column_name)
		    INTO _common_columns
		    FROM information_schema.columns
		    WHERE table_schema = 'global'
		    AND table_name = 'product_store_attributes_filter'
		    AND column_name IN (
		        SELECT column_name
		        FROM information_schema.columns
		        WHERE table_schema = 'global'
		        AND table_name = 'product_attributes_filter'
		    );

			---------------------------------------------------------
			-- STEP 2: BUILD USING CLAUSE
			---------------------------------------------------------
			_using_clause := '';
			
			IF array_length(_common_columns, 1) IS NOT NULL THEN
			    _using_clause := 'USING (';
			
			    FOR i IN 1..array_length(_common_columns,1)
			    LOOP
			        IF i > 1 THEN
			            _using_clause := _using_clause || ', ';
			        END IF;
			
			        _using_clause := _using_clause || format('%I', _common_columns[i]);
			    END LOOP;
			
			    _using_clause := _using_clause || ')';
			END IF;

		    ---------------------------------------------------------
		    -- STEP 3: BUILD PAF SELECT COLUMNS
		    ---------------------------------------------------------
		    _paf_select_cols := ARRAY[]::text[];
		
		    -- common columns
		    FOREACH _col IN ARRAY _common_columns LOOP
		        _paf_select_cols := array_append(_paf_select_cols, 'paf.' || _col);
		    END LOOP;
		
		    -- requested projection columns ($2)
		    FOREACH _col IN ARRAY $2 LOOP
		        IF NOT (_col = ANY(_common_columns)) THEN
		            _paf_select_cols := array_append(_paf_select_cols, 'paf.' || _col);
		        END IF;
		    END LOOP;
		
		    -- mandatory flags
		    _paf_select_cols := array_append(_paf_select_cols, 'paf.active');
		    _paf_select_cols := array_append(_paf_select_cols, 'paf.is_deleted');
		
		    ---------------------------------------------------------
		    -- STEP 4: BUILD PSAF SELECT COLUMNS
		    ---------------------------------------------------------
		    SELECT array_agg(key)
		    INTO _psaf_filter_cols
		    FROM jsonb_object_keys(_product_store_filters) AS key;
		
		    _psaf_select_cols := ARRAY[]::text[];
		
		    -- common columns
		    FOREACH _col IN ARRAY _common_columns LOOP
		        _psaf_select_cols := array_append(_psaf_select_cols, 'psaf.' || _col);
		    END LOOP;
		
		    -- product_store filter columns
		    IF _psaf_filter_cols IS NOT NULL THEN
		        FOREACH _col IN ARRAY _psaf_filter_cols LOOP
		            IF NOT (_col = ANY(_common_columns)) THEN
		                _psaf_select_cols := array_append(_psaf_select_cols, 'psaf.' || _col);
		            END IF;
		        END LOOP;
		    END IF;
		
		    ---------------------------------------------------------
		    -- STEP 5: BUILD FINAL QUERY
		    ---------------------------------------------------------
		    _query := '
		    WITH filtered_paf AS (
		        SELECT DISTINCT ' || array_to_string(_paf_select_cols, ', ') || '
		        FROM global.product_attributes_filter paf
		        ' || COALESCE(_product_filters_, '') || '
		    ),
		
		    filtered_psaf AS (
		        SELECT DISTINCT ' || array_to_string(_psaf_select_cols, ', ') || '
		        FROM global.product_store_attributes_filter psaf
		        ' || COALESCE(_product_store_filters_, '') || '
		    )
		
		    SELECT
		        ' || array_to_string(_projection_queries, ', ') || '
		    FROM filtered_paf f
		    JOIN filtered_psaf s
		    ' || _using_clause;
		
		    RAISE NOTICE '_query - %', _query;

		END IF;
    open $1 for execute _query;
 	RETURN $1;
	end
$function$
;
