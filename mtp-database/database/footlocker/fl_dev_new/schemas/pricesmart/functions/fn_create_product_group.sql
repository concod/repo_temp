--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.fn_create_product_group_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_create_product_group_2

DROP FUNCTION if exists pricesmart.fn_create_product_group;


CREATE OR REPLACE FUNCTION pricesmart.fn_create_product_group(_product_group_name text, _product_group_description text, _pg_grouping_type integer, _user_id integer, _product_hierarchy jsonb DEFAULT NULL::jsonb, _product_ids integer[] DEFAULT NULL::integer[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _pg_id INTEGER;
	_products_count int := 0;
	_get_products_query text;
BEGIN
	_products_count = COALESCE(array_length(_product_ids, 1), 0);
	raise notice '_products_count:  % ', _products_count;


    if _products_count is null or _products_count = 0 then 
		_get_products_query = format('
			select
		        array_agg(pm.product_id)
		    from
		        pricesmart.product_master pm
		    where
				%1$s
				and is_active = 1
				and clearance_indicator = 0
		', pricesmart.fn_build_hierarchy_where_cluse(_product_hierarchy));
		
		raise notice '_get_products_query : %', _get_products_query;
		
		execute _get_products_query into _product_ids;
		_products_count = COALESCE(array_length(_product_ids, 1), 0);
		
		raise notice 'new _products_count:  % ', _products_count;
	end if;

	
	-- Insert into product_group table
    INSERT INTO pricesmart.tb_product_group (
        pg_name,
        description,
        created_by,
        pg_grouping_type,
        products_count
    )
    VALUES (
        _product_group_name,
        _product_group_description,
        _user_id,
        _pg_grouping_type,
		_products_count
    )
    RETURNING pg_id INTO _pg_id;


	-- Insert product mappings if product_ids is not null and not empty
	IF _product_ids IS NOT NULL AND array_length(_product_ids, 1) > 0 THEN
        INSERT INTO pricesmart.tb_pg_product(
            pg_id,
            product_id
        )
        SELECT _pg_id, unnest(_product_ids);
    END IF;


	-- Insert all product_hierarchy from products.
	CALL pricesmart.pc_insert_pg_products_hierarchy(
		_pg_id, 
		_product_ids::integer[]
	);


	-- Update actual user given product_hierarchy from all hierarchy, is_temporary = 0
	CALL pricesmart.pc_insert_actual_pg_hierarchy(
    	_pg_id,
    	_product_hierarchy::jsonb
	);


	-- Update markdown pg-products count.
	perform pricesmart.fn_update_markdown_pg_products_count(_pg_id, _products_count);

    RETURN _pg_id;
END;
$function$
;
