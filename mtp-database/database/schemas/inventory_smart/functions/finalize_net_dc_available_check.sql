--liquibase formatted sql
--changeset liquibase:finalize_net_dc_available_check runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for finalize_net_dc_available_check MTP-113993
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.finalize_net_dc_available_check(refcursor, varchar, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_net_dc_available_check(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/* 
  * Function/Procedure name: inventory_smart.finalize_net_dc_available_check
  * Created by: Inventory Smart Team
  * Created at: 10-Nov-2025
  * No of input parameter: 6
  * Parameter Description : 	$2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = article filter
                                $5 = Ignore allocation codes
                                $6 = type
                                $7 = plan type based on source of allocation (dc,asn,ns,po)
  * Purpose: 
  * This function is created to calculate net dc available inventory check (-ve or +ve)
  * Finalize screen of Allocate flow
  * Calling Statement:
     begin;
     select * from inventory_smart.finalize_net_dc_available_check
        ('my_cur',
        '6_155_PFS_20230519T071512',
        '',
        '',
		'',
       'allocated',
		'dc');
      FETCH ALL IN "my_cur";
   
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */

DECLARE
    _store_filter text;
    _article_filter text;
	_pm_date date;
    _alloc_code text;
    _allocated_units_function TEXT;
    _available_units_function TEXT;
    _available_select_str TEXT;
    _dc_type TEXT;
    _query text;
    _reserve_allocation_cte TEXT;
    _final_inv_query TEXT;
    _query_combine TEXT;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    -- Determine source functions based on source_type parameter
    CASE $7
        WHEN 'ns' THEN 
            _allocated_units_function := 'inventory_smart.sku_ns_allocated_units';
            _available_units_function := 'inventory_smart.sku_ns_available_units';
            _available_select_str := 'article, dc_code, pack_type_id, size, oh, oo, it';
            _dc_type := 'int';
        WHEN 'dc' THEN 
            _allocated_units_function := 'inventory_smart.sku_dc_allocated_units';
            _available_units_function := 'inventory_smart.sku_dc_available_units';
            _available_select_str := 'article, dc_code, pack_type_id, size, oh, oo, it';
            _dc_type := 'int';
        WHEN 'po' THEN 
            _allocated_units_function := 'inventory_smart.sku_po_allocated_units';
            _available_units_function := 'inventory_smart.sku_po_available_units';
            _available_select_str := 'article, po_code as dc_code, pack_type_id, size, oh, 0 as oo, 0 as it';
            _dc_type := 'text';
        WHEN 'asn' THEN 
            _allocated_units_function := 'inventory_smart.sku_asn_allocated_units';
            _available_units_function := 'inventory_smart.sku_asn_available_units';
            _available_select_str := 'article, asn_id as dc_code, pack_type_id, size, oh, 0 as oo, 0 as it';
            _dc_type := 'text';
        WHEN 'pdq' THEN 
            _allocated_units_function := 'inventory_smart.sku_dc_allocated_units';
            _available_units_function := 'inventory_smart.sku_dc_available_units';
            _available_select_str := 'article, dc_code, pack_type_id, size, oh, oo, it';
            _dc_type := 'int';
        ELSE RAISE EXCEPTION 'Invalid source_type: %. Must be one of: ns, dc, po, asn, pdq', $7;
    END CASE;	

	_query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
    if $5 = '' then 
        _alloc_code := $2;	 
    else
        _alloc_code := $5;
    end if; 
    _query := format(_query, _alloc_code);
    execute _query into _pm_date;
    raise notice 'pm_date: %', _pm_date;

    if ($3 = '') IS FALSE
        then
            _store_filter := format($$ AND  carfs.store in ('%s')$$, $3);
        end if;
    if ($4 = '') IS FALSE
        then
            _article_filter := format($$ AND carfs.article in ('%s')$$, $4);
    end if;
    raise notice 'all variables created';

    -- Reserve allocation CTE (built separately to keep formatting simple)
    IF $7 = 'dc' THEN
        _reserve_allocation_cte := $res$
        ,reserve_alloc as materialized (SELECT * FROM inventory_smart.sku_dc_reserved_units sdru)
        ,reserve_allocation as materialized (
            SELECT dc_code, pack_type_id, sum(COALESCE(quantity,0)) user_reserve_qty 
            FROM (
                SELECT dc_code, article, size, pack_type_id FROM dc_pack_config
                GROUP BY 1, 2, 3, 4
            ) am
            LEFT JOIN (
                SELECT * FROM reserve_alloc 
                WHERE (article, dc_code) in (SELECT article, dc_code FROM dc_pack_config)
            ) b
            USING (dc_code, article, size, pack_type_id)
            JOIN inventory_smart.dc_pack_configuration dpc USING(article, pack_type_id, size)
            GROUP BY 1, 2
        )$res$;
    ELSE
        _reserve_allocation_cte := $res$
        ,reserve_allocation as (    
            SELECT dc_code, pack_type_id, 0 as user_reserve_qty FROM dc_pack_config
            GROUP BY 1, 2
        )$res$;
    END IF;
        raise notice 'reserve CTE created';
    -- Build _final_inv_query using format with tagged dollar-quotes ($fmt$)
    IF $6 = 'allocated' THEN
        _final_inv_query := format($fmt$
        current_avail as materialized (SELECT %5$s FROM %1$s where article is not null)
        ,current_available as materialized (
            SELECT dc_code, pack_type_id, 
            case when inventory_source = 'oh_oo' then coalesce(sum(oh+oo),0) 
                when inventory_source = 'it' then coalesce(sum(it),0)
                when inventory_source = 'oh_it' then coalesce(sum(oh+it),0)
            else coalesce(sum(oh),0) end as oh
            FROM (SELECT article, size, pack_type_id, dc_code, inventory_source FROM dc_pack_config GROUP BY 1, 2, 3, 4, 5) a 
            LEFT JOIN (SELECT * FROM current_avail where  (article, dc_code) in (SELECT article, dc_code FROM dc_pack_config)) b
            USING(dc_code, pack_type_id, article, size)
            GROUP BY dc_code, pack_type_id, inventory_source
        )%2$s
        ,other_allocations as materialized (
            select dc_code, pack_type_id, sum(allocated_reserve_qty) allocated_reserve_qty from (
                SELECT allocation_code, dc_code, pack_type_id, sum(allocated_reserve_qty) as allocated_reserve_qty
                FROM (
                    SELECT b.allocation_code, am.dc_code, am.article, am.pack_type_id, am.size, 
                    b.quantity as allocated_reserve_qty
                    FROM (
                        SELECT dc_code, article, pack_type_id, size, pack_type FROM dc_pack_config
                        GROUP BY 1, 2, 3, 4, 5
                    ) am
                    JOIN (select * from %3$s('%4$s') where allocation_code not in ('%4$s'))b
                    --USING (dc_code, article, size, pack_type_id)
                    on am.dc_code = b.dc_code and am.article = b.article and am.size = b.size and
                    (am.pack_type_id = b.pack_type_id or am.size = b.pack_type_id)
                ) a
                GROUP BY 1, 2, 3 
            ) c
            group by 1, 2
        )
        ,net_inv_count as materialized (
            select dc_code,pack_type_id, 
				(COALESCE(sum(oh),0) - COALESCE(sum(total_allocated_qty),0) - COALESCE(sum(allocated_reserve_qty),0) - COALESCE(sum(user_reserve_qty),0)) as dc_available
            from dc_pack_inv
            left join current_available using(dc_code, pack_type_id)
            left join reserve_allocation using(dc_code, pack_type_id)
            left join other_allocations using(dc_code, pack_type_id)
            group by dc_code, pack_type_id
        )$fmt$,
        _available_units_function, --1
        _reserve_allocation_cte, --2
        _allocated_units_function, --3
        _alloc_code, --4    
        _available_select_str --5
        );
    ELSE
        _final_inv_query := $fmt$
        net_inv_count as materialized (
            select dc_code, pack_type_id, 
                (COALESCE(sum(available_qty),0) - COALESCE(sum(total_allocated_qty),0)) as dc_available
            from dc_pack_inv
            group by dc_code, pack_type_id
        )$fmt$;
    END IF;
        raise notice 'Final INV CTE created';
    
--    RAISE NOTICE '%', _final_inv_query;

    _query_combine := format($fmt$
        with base_table as materialized (
        	SELECT article, store as store_code, pack_dc_allocation, retail_size_cd as size, allocated_total, inventory_source
        	FROM inventory_smart.create_allocation_result_flat_gurobi carfs
			WHERE carfs.created_at between '%1$s'  and '%2$s'  and  allocation_code = '%3$s' %4$s %5$s 
        )
        ,flat_table as (
        	SELECT article, store_code, inventory_source,
        		   js.key::%7$s dc_code, 
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) packs_allocated_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty,
        		   UNNEST((TRANSLATE((js.value::jsonb->>'pack_rounding_factor')::text, '[]', '{}'))::numeric[]) pack_rounding_factor
        	FROM (
        		SELECT * FROM base_table 
        		) foo , JSONB_EACH(pack_dc_allocation) js group by 1,2,3,4,5,6,7,8)
        ,dc_pack_config as materialized (
        	SELECT dpc.article, ft.dc_code, ft.store_code, ft.inventory_source, dpc.pack_type_id, dpc.size, dpc.pack_type, dpc.units_in_pack,
               case when dpc.pack_type = 'packs' then coalesce(ft.packs_allocated_qty,0) * dpc.units_in_pack::double precision
        	   		else  coalesce(ft.packs_allocated_qty,0) * coalesce(ft.pack_rounding_factor,1) end AS total_allocated_qty
        FROM inventory_smart.dc_pack_configuration dpc
        JOIN flat_table as ft on  dpc.article = ft.article and (dpc.pack_type_id = ft.pack_type_id or dpc.size = ft.pack_type_id)
        )
        ,dc_pack_inv as (
        	select dc_code, pack_type_id,
        	  sum(total_allocated_qty) AS total_allocated_qty
        from dc_pack_config p	
        group by 1,2
        )
		,%6$s		
    	SELECT  
			article,
			pack_type_id,
			dc_code,
			SUM(dc_available) as net_available
        FROM (select dc_code, article, pack_type_id from dc_pack_config p group by 1,2,3) dpi
    	left join net_inv_count nac using(dc_code, pack_type_id)
		group by 1, 2, 3 
    	$fmt$,
		_pm_date::timestamp , --1
		_pm_date::timestamp + interval '1 day', --2
		$2, --3 allocation code
		_article_filter, --4 
		_store_filter, --5
		_final_inv_query, --6
		_dc_type --7
    );

   	RAISE NOTICE ' %',  _query_combine;
    OPEN $1 FOR execute _query_combine;  
	 perform  global.sp_log(v_gen_random_uuid,'inventory_smart.finalize_net_dc_available_check', 'Before Return',_query_combine,jsonb_build_object('allocation_code', $2,'store_code' , $3, 'Article code/SKU code', $4, 'ignore_allocation_code', $5,'type',$6,'plan_type',$7));
     RETURN $1;
--	RETURN _query_combine;
END;
$function$
;