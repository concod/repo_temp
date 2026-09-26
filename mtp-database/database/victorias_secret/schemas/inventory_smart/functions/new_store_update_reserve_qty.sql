--liquibase formatted sql
--changeset Manohara.gulla:new_store_update_reserve_qty runOnChange:true stripComments:false splitStatements:false context:MTP-93778 labels:liquibase_project_start
--comment: MTP-93778 | dc oh calculation changes MTP-104179
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.new_store_update_reserve_qty(character varying,  character varying[], int);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_update_reserve_qty(
    store_code_in character varying,
    product_code_in character varying[],
    updated_value int
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    query text;
    product_code_list text;
    _product_code_clause text;
BEGIN
    if product_code_in is not null AND array_length(product_code_in, 1) > 0 then
        -- Convert the array to a comma-separated list for use in the query
        product_code_list := array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(product_code_in) AS x), ',');
        _product_code_clause := format('AND nsr.product_code IN (%s)', product_code_list);
    else
        _product_code_clause := '';
    end if;
    

    query := format($$
        WITH nsr_temp AS MATERIALIZED (
            SELECT 
                nsr.store_code,
                nsr.product_code,
                approved_qty,
                %s AS new_approved_qty,
                released_qty,
                COALESCE(nsm.need,0) AS need,
                COALESCE(nsm.po_upcoming_units,0) AS oo_units
            FROM global.new_store_reserve nsr
            LEFT JOIN inventory_smart.new_store_metrics nsm USING (store_code,product_code)
            WHERE nsr.store_code = %L
              %s    
              AND released IS DISTINCT FROM true 
        ),
        dc_data AS MATERIALIZED (
            SELECT 
                DISTINCT a.product_code, 
                CASE 
                    WHEN l0_id='VSB' THEN 'S003' 
                    ELSE 'S015' 
                END AS dc_code
            FROM nsr_temp a
            INNER JOIN global.product_attributes_filter b
                ON a.product_code=b.product_code
        )
        ,inventory_temp as materialized (
	select
	    product_code,
        dc_code,
	    coalesce(sum(oh)-sum(reserve_quantity) - sum(allocated_quantity),0) as oh
	from
	(
		select 
		    sdau.product_code, 
		    coalesce (oh, 0) oh, 
		    linked_store_code as dc_code,
		    coalesce(sdru.quantity,0) reserve_quantity
			,coalesce(sdal.quantity,0) allocated_quantity
		from inventory_smart.sku_dc_available_units sdau
		left join ( select  product_code,
						    dc_code, 
						    sum(quantity) as quantity
					from inventory_smart.sku_dc_reserved_units sdru 
                    where type <> 'N'
					group by 1, 2
					) sdru 
					using(dc_code, product_code)
		left join (select dc_code, article, size, SUM(quantity) as quantity from inventory_smart.sku_dc_allocated_units('', (select array_agg(product_code) from nsr_temp)) GROUP BY dc_code, article, size) sdal
        on sdau.dc_code = sdal.dc_code and sdau.article = sdal.article and sdau.size = sdal.size --using(dc_code, article, size)
		join global.distribution_centres dc on sdau.dc_code = dc.dc_code
		join nsr_temp using(product_code)
        --join dc_data on dc_data.dc_code = dc.linked_store_code and dc_data.product_code = sdau.product_code
	   ) a
	group by 1,2
	)
--	select * from inventory_temp;
        ,inventory as (
			select  it.product_code, 
					sum(oh) as oh
			from inventory_temp it
			join dc_data on dc_data.dc_code = it.dc_code and dc_data.product_code = it.product_code
			group by 1
				)
--				select * from inventory;
        ,insert_values AS (
            SELECT  
                store_code,
                product_code,
                TRUE AS approved,
                CASE 
                    WHEN new_approved_qty <= oh+oo_units THEN new_approved_qty
                    ELSE oh+oo_units
                END AS approved_qty
            FROM nsr_temp 
            JOIN inventory USING(product_code)
        )
        UPDATE global.new_store_reserve nsr
        SET approved = i.approved,
            approved_qty = i.approved_qty
        FROM insert_values i 
        WHERE nsr.store_code = i.store_code AND nsr.product_code = i.product_code;
        $$, updated_value, store_code_in, _product_code_clause);

    RAISE NOTICE 'query: %', query;
    EXECUTE query;
END
$function$;
