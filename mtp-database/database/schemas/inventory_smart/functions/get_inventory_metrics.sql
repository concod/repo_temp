--liquibase formatted sql
--changeset liquibase:get_inventory_metrics runOnChange:true stripComments:false splitStatements:false context:MTP-109474 labels:MTP-109474
--comment: MTP-109474 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_inventory_metrics(text[]);
DROP FUNCTION IF EXISTS inventory_smart.get_inventory_metrics_po(text[]);
DROP FUNCTION IF EXISTS inventory_smart.get_inventory_metrics_ns(text[]);
DROP FUNCTION IF EXISTS inventory_smart.get_inventory_metrics_asn(text[]);
DROP FUNCTION IF EXISTS inventory_smart.get_inventory_metrics_asn(text[],text);
DROP FUNCTION IF EXISTS inventory_smart.get_inventory_metrics(refcursor, text[], text[], integer[], text[], text, jsonb);


CREATE OR REPLACE FUNCTION inventory_smart.get_inventory_metrics(input refcursor, article_codes text[], size text[], dc_code integer[], id text[], alloc_type text, tenant_config jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query text:= '';
	_dc_query text:= '';
    _inv_soucre text:= '';
    _alloc_source text:= '';
    _reserve_source text:= '';
    _id_query text:= '';
    _reserve_query text:= '';
    _reserve_metric text:= '';
    _reserve_join text:= '';
    _oh_oo_it_metric text:= '';
	_final_oh_oo_it_metric text:= '';
    _id_as_dc text:= '';
    _active_dc_check text:= '';
    _active_dc_check_join text:= '';
    _saf_retail_check text:= '';
    _dc_code_name text:= '';
BEGIN

    -- Set dc code query based on tenant config
    IF array_length(dc_code, 1) IS NOT NULL AND array_length(dc_code, 1) > 0 THEN
    	_dc_query := format('AND dc_code = ANY(''{%s}'')', array_to_string(dc_code, ','));
    END IF;

	-- Set inventory, allocation, and reserve sources based on alloc_type
	IF alloc_type IS NULL OR alloc_type = '' OR alloc_type = 'default' OR alloc_type = 'nc' THEN
		_inv_soucre := 'inventory_smart.sku_dc_available_units';
		_alloc_source := 'inventory_smart.sku_dc_allocated_units';
		_reserve_source := 'inventory_smart.sku_dc_reserved_units';

	ELSIF alloc_type = 'po' THEN
		_inv_soucre := 'inventory_smart.sku_po_available_units';
		_alloc_source := 'inventory_smart.sku_po_allocated_units';

	ELSIF alloc_type = 'ns' THEN
		_inv_soucre := 'inventory_smart.sku_ns_available_units';
		_alloc_source := 'inventory_smart.sku_ns_allocated_units';

	ELSIF alloc_type = 'asn' THEN
		_inv_soucre := 'inventory_smart.sku_asn_available_units';
		_alloc_source := 'inventory_smart.sku_asn_allocated_units';
        
	END IF;

    -- Set id query based on alloc_type
    IF alloc_type = 'po' THEN
        _id_query := format('where po_code = ANY(''{%s}'')', array_to_string(id, ','));
    ELSIF alloc_type = 'asn' THEN
        _id_query := format('where asn_code = ANY(''{%s}'')', array_to_string(id, ','));
    END IF;

    -- Set user reserve based on alloc_type
    IF alloc_type IS NULL OR alloc_type = '' OR alloc_type = 'default' OR alloc_type = 'nc' THEN
        _reserve_query := format(',
            reserve AS materialized(
                SELECT 
                    p.product_code,
                    p.dc_code,
                    p.size, 
                    SUM(quantity)::int AS reserved
                FROM %1$s sdru
		    	right join size_dc_eligibility p on (p.product_code = sdru.product_code and p.dc_code::int = sdru.dc_code::int)
                GROUP BY p.product_code, p.dc_code, p.size
            )', _reserve_source);
        _reserve_metric := 'COALESCE(r.reserved, 0) AS reserved,';
        _reserve_join := 'LEFT JOIN reserve r USING (product_code, dc_code, size)';
    END IF;

    -- Set oh+oo metric based on tenant config
    if (tenant_config->'enable_oh_oo'->>alloc_type)::boolean then
        _oh_oo_it_metric := ', SUM(COALESCE(oh_oo, 0))::int AS available_oh_oo';
        _final_oh_oo_it_metric := ',COALESCE(av.available_oh_oo, 0) AS available_oh_oo';
    end if;

	-- Set oh+it metric based on tenant config
    if (tenant_config->'enable_oh_it'->>alloc_type)::boolean then
        _oh_oo_it_metric := ', SUM(COALESCE(oh_it, 0))::int AS available_oh_it, SUM(COALESCE(it, 0))::int AS available_it';
        _final_oh_oo_it_metric := ',COALESCE(av.available_oh_it, 0) AS available_oh_it ,COALESCE(av.available_it, 0) AS available_it';
    end if;

    -- Set id as dc_code based on tenant config
    if (tenant_config->'id_as_dc'->>alloc_type)::boolean then
       _id_as_dc := format(
    					'%s as dc_code',
    					array_to_string(ARRAY(
       					SELECT quote_literal(x)
        				FROM unnest(id) AS x
    				), ',')
				);
	else 
		_id_as_dc := 'dc_code::varchar';
    end if;

    -- Set active dc check and saf retail check based on tenant config
    if (tenant_config->'enable_saf_channel_check'->>alloc_type)::boolean then
        _saf_retail_check := format('and saf.channel = ''%s''', tenant_config->'saf_channel'->>alloc_type);
    end if;

    if (tenant_config->'enable_active_dc_check'->>alloc_type)::boolean then
        _active_dc_check := format(',
		    active_dc AS materialized(
                SELECT DISTINCT ON (dc.dc_code, dc.name) dc.dc_code, dc.name, dc.linked_store_code as dc_code_name
                FROM global.store_attributes_filter saf 
                JOIN global.distribution_centres dc ON dc.linked_store_code = saf.store_code
                WHERE
                    saf.active
                    AND dc.is_active
                    %1$s
            )', _saf_retail_check);
        _active_dc_check_join := 'inner JOIN active_dc dc on (dc.dc_code::varchar = av.dc_code::varchar)';
    end if;

     if (tenant_config->'fetch_dc_code_from_saf'->>alloc_type)::boolean then
        _dc_code_name := ',dc.dc_code_name::text as "_inv_source_code"';
    end if;

    _query := format('
        WITH 
        product AS materialized(
            SELECT article, size, product_code 
            FROM global.product_attributes_filter paf 
            WHERE article = any(''%1$s'') and active
        ),
		size_dc_eligibility as materialized(
			select DISTINCT ON (size,dc_code) paf.*, %12$s from product paf
			join global.product_mapping_product_dc using (product_code)
			where size = any(''%2$s'') and is_active %3$s
		),
		size_order_data AS materialized(
            SELECT DISTINCT ON (size) 
                ast.size, 
                ast."order"
            FROM inventory_smart.article_status_tag ast
			join size_dc_eligibility using (product_code)
            ORDER BY ast.size, ast."order" NULLS LAST
        )
        %13$s,        
        available AS materialized(
            SELECT 
                p.product_code,
                p.dc_code::text, 
                p.size, 
                SUM(COALESCE(oh, 0))::int AS available_oh
				%10$s
            FROM %4$s sdau
            RIGHT JOIN size_dc_eligibility p on (p.product_code = sdau.product_code and p.dc_code::varchar = sdau.dc_code::varchar)
            %6$s
            GROUP BY p.product_code, p.dc_code, p.size
        ),
        allocated AS materialized(
            SELECT 
                p.product_code,
                p.dc_code,
                p.size, 
                SUM(COALESCE(quantity, 0))::int AS allocated
            FROM %5$s sdalu
            RIGHT JOIN size_dc_eligibility p on (p.article = sdalu.article and p.size = sdalu.size and p.dc_code::varchar = sdalu.dc_code::varchar)
            GROUP BY p.product_code, p.dc_code, p.size
        )%7$s
        SELECT 
			DENSE_RANK() OVER (ORDER BY al.dc_code)::int AS "_uniqueId",
            al.dc_code::text AS _dc_code, 
			gdc.name::text AS _dc_name,
			av.size::text,
			%8$s
			COALESCE(av.available_oh, 0) AS available_oh, 
			COALESCE(al.allocated, 0) AS allocated
            %15$s
            %11$s
        FROM available av 
        %9$s
        LEFT JOIN allocated al USING (product_code, dc_code, size)
        LEFT JOIN global.distribution_centres gdc on (gdc.dc_code::varchar = av.dc_code::varchar)
        %14$s
        LEFT JOIN size_order_data ast 
            ON av.size = ast.size
        ORDER BY 
            CASE 
                WHEN ast."order" IS NOT NULL THEN ast."order"
                ELSE NULL
            END, 
            av.size;
    ', article_codes, 
    size, 
    _dc_query, 
    _inv_soucre, 
    _alloc_source, 
    _id_query, 
    _reserve_query, 
    _reserve_metric, 
    _reserve_join, 
    _oh_oo_it_metric, 
    _final_oh_oo_it_metric,
    _id_as_dc,
    _active_dc_check,
    _active_dc_check_join,
    _dc_code_name);

	raise notice '%', _query;
    OPEN $1 FOR EXECUTE _query;
	return $1;
END;
$function$
;
