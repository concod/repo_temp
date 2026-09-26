--liquibase formatted sql
--changeset liquibase:pdq_finalize_selected_product_store runOnChange:true stripComments:false splitStatements:false context:MTP-63848 labels:MTP-63848
--comment: feature/MTP-63848 store band details for list of articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.pdq_finalize_selected_product_store(refcursor, varchar, varchar, varchar[], varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.pdq_finalize_selected_product_store(input refcursor, character varying, character varying, character varying[], character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
    _query_combine text;
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    _final_inv_query text;
    _priority_allocation text;
    begin
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';
        
        IF $5 = '' then
       		_priority_allocation = $2;
    	else
    		_priority_allocation = $5;
    	END IF;

        if ($3 = '') IS FALSE
            then
                _store_filter1 := format($$WHERE store_code = '%s'$$, $3);
                _store_filter2 := format($$WHERE a.store_code = '%s'$$, $3);
            end if;

		IF array_length($4, 1) IS NOT NULL THEN
			_article_filter := format($$AND carfs.article = ANY (%L)$$, $4);
		END IF;

        _query_combine := format($$

	with base_table as materialized (SELECT carfs.article, 
							  carfs.allocated_total,carfs.store_name,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max, 
							  channel, store store_code, retail_size_cd size, updated_oh_oo_it, saf.store_attribute
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		LEFT JOIN global.store_attributes_filter saf ON store_code = store
		WHERE allocation_code = '%1$s' %2$s
		)
	,base_table_min_wos as  (select b.*,l0_name,l1_code,l2_code,l3_code, l4_code, l0_code, l1_name, l3_name from
			(
			select
				b.*, 
				greatest(0,MIN - (updated_oh_oo_it)) as min_short,
				greatest(0, UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
				least(UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]),greatest(0,MIN - (updated_oh_oo_it))) as min_allocation
			from
				base_table b, JSONB_EACH(pack_dc_allocation) js) b
				join global.product_attributes_filter paf on paf.product_code = b.article
				)	
		,store_level_base_table as (
		SELECT store_code,
			   article,
			   store_name,
			   l0_code,
			   l0_name, 
			   l1_code, 
			   l2_code, 
			   l3_code,
			   l4_code,
			   l1_name, 
			   l3_name,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   sum(min) as min_store,
			   sum(max) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation
		FROM (
			SELECT article,
				   store_code,
				   store_name,
				   size,
				   bt.l0_code,
				   bt.l0_name, 
				   bt.l1_code, 
				   bt.l2_code, 
				   bt.l3_code,
				   bt.l4_code,
				   bt.l1_name, 
				   bt.l3_name,
				   COALESCE(MAX(MIN), 0) MIN,
				   COALESCE(MAX(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(MAX(oh), 0) oh,
				   COALESCE(MAX(oo), 0) oo,
				   COALESCE(MAX(it), 0) it,
				   COALESCE(SUM(allocated_total), 0) allocated_total
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 
		) as st
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)

		,store_band_level_base_table as materialized (
			select distinct coalesce(psaf.psa_name,'2') as psa_name, slbt.*   
			from store_level_base_table slbt left join global.product_store_attributes_filter psaf 
			on md5(slbt.l0_code || slbt.l1_code || slbt.l3_code || slbt.l4_code || slbt.store_code) = md5(psaf.l0_code || psaf.l1_code || psaf.l3_code || psaf.l4_code || psaf.store_code)
			)

		, store_band as materialized(
				select psa_name,
					   article,
					   l0_code,
					   l1_name,
					   l3_name,
					   coalesce(SUM(oh),0) as oh,
					   coalesce(SUM(oo),0) as oo,
					   coalesce(SUM(it),0) as it,
					   COALESCE(SUM(oh), 0) + COALESCE(SUM(oo), 0) + COALESCE(SUM(it), 0) AS oh_oo_it_total,
					   round(coalesce(avg(min_store),0)) as min_store,
					   round(coalesce(avg(max_store),0)) as max_store,
					   coalesce(SUM(allocated_quantity),0) as allocated_quantity,
					   COALESCE(SUM(min_allocation), 0) as min_allocation_dc,
					   COALESCE(SUM(wos_allocation), 0) as allocated_for_wos
			    from store_band_level_base_table
			    group by 1, 2, 3, 4, 5
		)

		,cnt_table as (
			select psa_name, article, coalesce(count(distinct store_code),0) stores_cnt from store_band_level_base_table where allocated_quantity > 0 group by 1,2
		)

	SELECT 
	    slb.*,
	    COALESCE(ct.stores_cnt, 0) AS stores_cnt
	FROM store_band slb
	LEFT JOIN (
	    SELECT 
	        psa_name, 
	        article, 
	        stores_cnt
	    FROM cnt_table
	    GROUP BY psa_name, article, stores_cnt
	) ct 
	ON slb.psa_name = ct.psa_name AND slb.article = ct.article
	order by article, psa_name
		$$, $2, _article_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;