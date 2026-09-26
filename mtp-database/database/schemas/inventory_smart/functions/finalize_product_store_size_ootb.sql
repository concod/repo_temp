--liquibase formatted sql
--changeset mahaveer.kamuju:finalize_product_store_size_ootb runOnChange:true stripComments:false splitStatements:false context:MTP-125163 labels:MTP-125163
--comment: OOTB SP for finalize_product_store_size
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_store_size_ootb(refcursor, varchar, varchar, varchar, varchar, varchar, varchar, varchar);

CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_store_size_ootb(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
  * Function/Procedure name: inventory_smart.finalize_product_store_size_ootb
  * Author: Gururaj Patil
  * Created at: 13-Mar-2026
  * No of input parameter: 8
  * Parameter Description : $1 = Cursor name
  *                         $2 = Allocation Code
  *                         $3 = Store code
  *                         $4 = Article code/SKU code
  *                         $5 = Ignore allocation code
  *                         $6 = Type (allocated/other)
  *                         $7 = Plan type - determines mode (ASN/PO/NS/DC)
  *							$8 = Pack filter
  * Purpose: 
  * Generic SP across tenants supporting DC, ASN, PO, and NS allocation modes.
  * Calling Statement:
  *
  */
 DECLARE
    _query_combine text;
    _store_filter1 text := '';
    _article_filter text := '';
    _final_inv_query text;
    _pm_date date;
    _query text;
    _alloc_code text;
    _allocated_units_function text;
    _available_units_function text;
	_aval_reserve_cte text;
    _mode text;
    _date_filter text;
    -- store_level_base_table format vars
    _slbt_group text;
    _pack_type_where text := '';
	_pack_config text := '';
	_dc_code_exp text := 'dc_code';
	_final_inv_join text:='store_code';
	_slbt_select text:='';
 BEGIN
    -- Determine mode from plan type
    _mode := CASE
        WHEN $7 = 'ASN Allocation' THEN 'asn'
        WHEN $7 IN ('PO', 'Backdoor Allocation PO', 'PO Auto Allocation') THEN 'po'
        WHEN $7 IN ('New Store Allocation', 'Backdoor Allocation NS') THEN 'ns'
        ELSE 'dc'
    END;
    CASE UPPER(_mode)
        WHEN 'NS' THEN 
            _allocated_units_function := 'inventory_smart.sku_ns_allocated_units';
            _available_units_function := 'inventory_smart.sku_ns_available_units';
			_dc_code_exp = 'po_code as dc_code';
        WHEN 'PO' THEN 
            _allocated_units_function := 'inventory_smart.sku_po_allocated_units';
            _available_units_function := 'inventory_smart.sku_po_available_units';
			_dc_code_exp = 'po_code as dc_code';
        WHEN 'ASN' THEN 
            _allocated_units_function := 'inventory_smart.sku_asn_allocated_units';
            _available_units_function := 'inventory_smart.sku_asn_available_units';
			_dc_code_exp = 'asn_code as dc_code';
        ELSE             
			_allocated_units_function := 'inventory_smart.sku_dc_allocated_units';
            _available_units_function := 'inventory_smart.sku_dc_available_units';
    END CASE;



    -- store_level_base_table format variables
    _query = format($$select tam.attribute_value->'value'->>'pack_configuration'
			from global.tenant_attribute_master tam 
			where tam."name" = 'finalize_configuration'$$);
    EXECUTE _query INTO _pack_config;

	IF UPPER(coalesce(_pack_config,'packs')) = 'EACHES' THEN
		_slbt_select := 'article, store_code, store_name, store_grade, size, size as pack_type_id';
		_slbt_group := 'article, store_code, store_name, store_grade, size ';
		_final_inv_join:= 'store_code,pack_type_id';
	ELSE 
		_slbt_select := 'article, store_code, store_name, store_grade';
		_slbt_group := 'article, store_code, store_name, store_grade';
		_final_inv_join:= 'store_code';
	END IF;
    -- pack_type_id WHERE filter
    IF ($8 = '') IS FALSE THEN
        _pack_type_where := format($$ WHERE ft.pack_type_id = '%s'$$, $8);
    END IF;
    -- Determine alloc_code and pm_date
    _query := 'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
    IF $5 = '' THEN _alloc_code := $2; ELSE _alloc_code := $5; END IF;
    _query := format(_query, _alloc_code);
    EXECUTE _query INTO _pm_date;
    RAISE NOTICE 'pm_date: %', _pm_date;

    _date_filter := format($$ AND carfs.created_at BETWEEN %s AND %s$$,
        quote_literal(_pm_date::timestamp), quote_literal(_pm_date::timestamp + interval '1 day'));

    IF ($3 = '') IS FALSE THEN
        _store_filter1 := format($$ AND store_code = '%s'$$, $3);
    END IF;
    IF ($4 = '') IS FALSE THEN
        _article_filter := format($$AND carfs.article = '%s'$$, $4);
    END IF;


    -- === Build allocated mode CTEs (_final_inv_query) ===
  	IF ($6 = 'allocated')
	THEN
    IF UPPER(_mode) NOT IN ('ASN', 'PO', 'NS') THEN
        _aval_reserve_cte := $res$
        ,reserve_allocation as materialized(
            SELECT am.dc_code::text as dc_code, am.pack_type_id ,coalesce(avg(b.quantity/coalesce(am.units_in_pack,1)),0) user_reserve_qty 
            FROM (
                SELECT dc_code, article, size, pack_type_id,units_in_pack FROM packs
                GROUP BY 1, 2, 3, 4, 5
            ) am
            LEFT JOIN (
                SELECT * FROM inventory_smart.sku_dc_reserved_units 
                WHERE (article, dc_code::text) in (SELECT article, dc_code::text as dc_code FROM packs)
            ) b
			on am.dc_code::text = b.dc_code::text and am.article = b.article and am.size = b.size and
            (b.pack_type_id = am.pack_type_id or b.size = am.pack_type_id)
            JOIN inventory_smart.dc_pack_configuration dpc 
            on am.article = dpc.article and b.pack_type_id = dpc.pack_type_id and am.size = dpc.size
            GROUP BY 1, 2
        )
        ,current_available as materialized(
             SELECT a.dc_code::text as dc_code, a.pack_type_id,
                        CASE
                            WHEN a.inventory_source = 'oh_oo' THEN sum((oh + oo)/coalesce(a.units_in_pack,1))
                            WHEN a.inventory_source = 'oh_it' THEN sum((oh + it)/coalesce(a.units_in_pack,1))
                            WHEN a.inventory_source = 'it' THEN sum((it)/coalesce(a.units_in_pack,1))
                            ELSE sum((oh)/coalesce(a.units_in_pack,1))
                        END as oh
                FROM (SELECT article, size, pack_type_id, dc_code, inventory_source, units_in_pack FROM packs GROUP BY 1,2,3,4,5,6) a
                LEFT JOIN (SELECT * FROM inventory_smart.sku_dc_available_units WHERE (article, dc_code::text) IN (SELECT article, dc_code FROM packs)) b
                on a.dc_code::text = b.dc_code::text and a.article = b.article and a.size = b.size and
            	(b.pack_type_id = a.pack_type_id or b.size = a.pack_type_id) 
			GROUP BY a.dc_code, a.pack_type_id, a.inventory_source

        )$res$;
    ELSE
        _aval_reserve_cte := format($res$
        ,reserve_allocation as materialized(    
            SELECT pack_type_id, dc_code, 0 as user_reserve_qty FROM packs
            GROUP BY 1, 2
        )
        ,current_available as materialized(
            SELECT am.pack_type_id, am.dc_code ,coalesce(sum(b.oh/coalesce(am.units_in_pack,1)),0) as oh
            FROM (SELECT article, size, pack_type_id, dc_code, units_in_pack FROM packs GROUP BY 1, 2, 3, 4, 5) am 
            LEFT JOIN (SELECT %2$s, article, size,pack_type_id, oh FROM %1$s ) b
			on b.dc_code::text = am.dc_code::text and am.article = b.article and am.size = b.size and
            (b.pack_type_id = am.pack_type_id or b.size = am.pack_type_id)
            GROUP BY 1, 2
        )$res$, _available_units_function, _dc_code_exp);
    END IF;

        raise notice 'reserve CTE created';
    -- Build _final_inv_query using format with tagged dollar-quotes ($fmt$)
        _final_inv_query := format($fmt$
        %1$s
        ,other_allocations as materialized (
                SELECT  dc_code, pack_type_id, sum(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT  am.dc_code, am.article, am.pack_type_id, am.size, 
                    b.quantity/coalesce(units_in_pack,1) as allocated_reserve_qty
                    FROM (
                        SELECT dc_code::text as dc_code, article, pack_type_id, size, pack_type, units_in_pack FROM packs
                        GROUP BY 1, 2, 3, 4, 5, 6 
                    ) am
                    JOIN (  
                        select article, pack_type_id, size, dc_code, sum(quantity) as quantity 
                        from %2$s('%3$s') where allocation_code not in ('%3$s') 
                        group by article, pack_type_id, size, dc_code
                    ) b
                    --USING (dc_code, article, size, pack_type_id)
                    on am.dc_code::text = b.dc_code::text and am.article = b.article and am.size = b.size and
                    (b.pack_type_id = am.pack_type_id or b.size = am.pack_type_id)
                ) a
                GROUP BY 1, 2
        )
		,total_allocated_qty as (
            SELECT x.pack_type_id, dc_code,
                sum(current_allocation) as total_allocated
            FROM (
                SELECT allocation_code, article, dc_code,
                    unnest(replace(replace(inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS current_allocation
                FROM (
                    SELECT carfs.allocation_code, carfs.article, carfs.store as store_code,
                        js.items::text as dc_code, js.value as inventory_data
                    FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                    CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
                    WHERE allocation_code = '%3$s'
                    GROUP BY 1,2,3,4,5
                ) pack_allocation
            ) x 
			JOIN inventory_smart.dc_pack_configuration dpc ON dpc.article = x.article and (dpc.pack_type_id = x.pack_type_id or dpc.size = x.pack_type_id)
			GROUP BY 1,2
        )
        ,net_availble_count as materialized (
            select dc_code,pack_type_id,
				(COALESCE(avg(oh),0) - COALESCE(sum(total_allocated),0) - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  dc_available, 
            	(COALESCE(avg(oh),0)  - COALESCE(avg(allocated_reserve_qty),0) - COALESCE(avg(user_reserve_qty),0))  as  bulk_dc_available,
            	COALESCE(avg(allocated_reserve_qty),0) as allocated_reserve_qty, 
				COALESCE(avg(user_reserve_qty),0) as user_reserve_qty
            from final_inv fi
			left join current_available ca using(dc_code,pack_type_id)
            left join reserve_allocation ra using(dc_code,pack_type_id)
            left join other_allocations oa using(dc_code,pack_type_id)
			left join total_allocated_qty using(dc_code,pack_type_id)
            group by dc_code,pack_type_id
        )$fmt$,
        _aval_reserve_cte,
        _allocated_units_function,
        _alloc_code);

		ELSE
        _final_inv_query := format($fmt2$
		,total_allocated_qty as (
            	SELECT x.pack_type_id, dc_code,
        	        sum(current_allocation) as total_allocated
    	        FROM (
	                SELECT allocation_code, article, dc_code,
                    	unnest(replace(replace(inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    	unnest(replace(replace(inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS current_allocation
                	FROM (
                    	SELECT carfs.allocation_code, carfs.article, carfs.store as store_code,
                        js.items::text as dc_code, js.value as inventory_data
                    	FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                    	CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
                    	WHERE allocation_code = '%1$s'
                    	GROUP BY 1,2,3,4,5
                	) pack_allocation
            	) x 
				JOIN inventory_smart.dc_pack_configuration dpc ON dpc.article = x.article and (dpc.pack_type_id = x.pack_type_id or dpc.size = x.pack_type_id)
				GROUP BY 1,2
        	)
			,net_availble_count as materialized (
					select dc_code, pack_type_id, (COALESCE(avg(dc_available_packs),0) - COALESCE(sum(total_allocated),0))  as  dc_available,
					COALESCE(avg(dc_available_packs),0) as bulk_dc_available
					from final_inv
					left join total_allocated_qty using (dc_code,pack_type_id)
					group by dc_code, pack_type_id
				)
				$fmt2$,
				_alloc_code
				);

		END IF;
        raise notice 'Final INV CTE created';


    -- === Assemble the full query ===
    _query_combine := format($final$
        WITH base_table AS MATERIALIZED (
            SELECT carfs.article, carfs.allocated_total, carfs.oh, carfs.oo, carfs.it,
                carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max,
                store store_code, updated_oh_oo_it, demand, demand_type,
                saf.store_name, carfs.store_grade, carfs.retail_size_cd as size, carfs.inventory_source
            FROM inventory_smart.create_allocation_result_flat_gurobi carfs
            JOIN global.store_attributes_filter saf ON saf.store_code = carfs.store
            WHERE allocation_code = '%1$s' %2$s %3$s %4$s
        )
    	,flat_table as (
        SELECT article, store_code, js.key::text as dc_code, size, js.value, inventory_source,
            UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
            UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
            UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
            UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) packs_rounding_factor
        FROM base_table foo, JSONB_EACH(pack_dc_allocation) js
        GROUP BY 1,2,3,4,5,6,7,8,9,10
        )
		,packs as materialized (
        SELECT dpc.article, dc_code, store_code, 
			ft.pack_type_id as pack_type_id, 
			dpc.size, pack_type, units_in_pack, coalesce(packs_rounding_factor,1) as packs_rounding_factor,
            available_qty as available_qty_packs, packs_allocated_qty, inventory_source,
            CASE WHEN dpc.pack_type = 'packs' THEN packs_allocated_qty * dpc.units_in_pack::double precision
                ELSE packs_allocated_qty * coalesce(packs_rounding_factor,1)::double precision END as total_allocated_qty,
            CASE WHEN dpc.pack_type = 'packs' THEN available_qty * dpc.units_in_pack::double precision
                ELSE available_qty * coalesce(packs_rounding_factor,1)::double precision END as available_qty
        FROM inventory_smart.dc_pack_configuration dpc
        JOIN flat_table ft ON dpc.article = ft.article and (dpc.pack_type_id = ft.pack_type_id or dpc.size = ft.pack_type_id)
		%5$s
        group by 1,2,3,4,5,6,7,8,9,10,11,12
		) 
		,product_attributes_filter as materialized (
		select distinct paf.article, paf.size , paf.product_code 
		from "global".product_attributes_filter paf
		where paf.article in (select distinct p.article from packs p)
		)

    	
    	,final_inv as (
        SELECT dc_code, store_code, pack_type_id, pack_type, 
            avg(available_qty_packs) as dc_available_packs, avg(available_qty) as available_qty,
            sum(total_allocated_qty) AS total_allocated_qty, avg(packs_allocated_qty) packs_allocated_qty
        FROM packs p GROUP BY 1,2,3,4
        )
		%6$s
    	,base_table_min_wos as (
        SELECT p.*,
            greatest(0, p.min - (updated_oh_oo_it)) as min_short,
            greatest(0, allocated_total - greatest(0, p.min - (updated_oh_oo_it))) as wos_allocation,
            least(allocated_total, greatest(0, p.min - (updated_oh_oo_it))) as min_allocation
        FROM base_table p
    	)
		,store_level_base_table as (
                SELECT %7$s, sum(demand) aggregated_demand, 
					COALESCE(sum(MIN), 0) min_store, COALESCE(sum(MAX), 0) max_store,
                    COALESCE(SUM(min_allocation), 0) as min_allocation, 
					COALESCE(SUM(wos_allocation), 0) as wos_allocation,
                    COALESCE(sum(oh), 0) oh, COALESCE(sum(oo), 0) oo, COALESCE(sum(it), 0) it,
					sum(oh) + sum(oo) + sum(it) as oh_oo_it_total , 
					SUM(allocated_total) + SUM(oh) + sum(oo) + sum(it) as total_allocated_qty_oh_oo_it,
                    COALESCE(SUM(allocated_total), 0) allocated_quantity,
					COUNT(DISTINCT article) as style_color_cnt
                FROM base_table_min_wos bt 
				GROUP BY %9$s
        )
		,size_order_cte as materialized
					(
					SELECT 	
						article,
						elem ->> 'size'  AS size,
						elem ->> 'product_code'  AS pack_type_id,
						max(elem ->> 'order') AS pack_size_order
					FROM inventory_smart.ph_master pm
					CROSS JOIN LATERAL jsonb_array_elements(to_jsonb(pm.product_code_size_map)) AS j(elem)
					where article in (select distinct article from packs )
					group by 1,2,3 )
        SELECT slb.*,
            fi.dc_code, fi.total_allocated_qty,fi.pack_type_id as packs_allocated,
            nac.dc_available, nac.bulk_dc_available, fi.packs_allocated_qty,style_color_cnt,
            coalesce(dcs.name,fi.dc_code) as "name", coalesce(name,fi.dc_code) as dc,coalesce(so.pack_size_order::text,'1') as pack_size_order
        FROM store_level_base_table slb
        LEFT JOIN final_inv fi USING(%8$s)
		LEFT JOIN net_availble_count nac USING(dc_code, pack_type_id)
		LEFT JOIN "global".distribution_centres dcs on nac.dc_code = dcs.dc_code::text
		left join size_order_cte so on slb.article = so.article and (nac.pack_type_id = so.pack_type_id or nac.pack_type_id = so.size)
		$final$,
         $2, 
		_article_filter, 
		_store_filter1,
        _date_filter,
		_pack_type_where,
		_final_inv_query,
		_slbt_select,
		_final_inv_join,
		_slbt_group
    );


    RAISE NOTICE '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    RETURN $1;
 END
$function$
;

