--liquibase formatted sql
--changeset liquibase:finalize_store_view runOnChange:true stripComments:false splitStatements:false context:MTP-40575 labels:MTP-40575
--comment: MTP-66787 no need to convert created_at to IST time
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_store_view(refcursor, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_store_view(input refcursor, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_store
  * Created by: Manohara Gulla
  * Created at: 21-July-2024
  * No of input parameter: 5
  * Parameter Description : $1 = Cursor
  *                         $2 = Allocation Code
  *                             $3 = Ignore allocation code
  *                             $4 = Article code/SKU code
  *                             $5 = type
			
  * Purpose: 
  * This function is created to calculate Store View Allocation Summary which is displayed in the 
  * Finalize screen of Allocate flow
  * Calling Statement:
     
     begin;
     select * from inventory_smart.finalize_product_store
         ('my_cur',
          '3_aignet_test_allocation_1',
         '',
        '20339848');
      FETCH ALL IN "my_cur";
     commit;
 
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
 declare
    _query_combine text;
    _store_filter1 text;
    _store_filter2 text;
    _article_filter text;
    _final_inv_query text;
    _priority_allocation text;
	_pm_date date;
	_query text;
    begin
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';

		_query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
		if $3 = '' then 
			_query := format(_query, $2); 
		else
			_query := format(_query, $3);
		end if; 
		execute _query into _pm_date;
	   	raise notice 'pm_date: %', _pm_date;
        
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
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$AND carfs.article IN ('%s')$$, $4);
            end if;

        _query_combine := format($$
            ------ store  VIEW - TABLE DATA
	with base_table as materialized (SELECT carfs.article, 
							  carfs.allocated_total,carfs.store_name,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max, 
							  channel, store store_code, retail_size_cd size, updated_oh_oo_it
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		LEFT JOIN global.store_attributes_filter saf ON store_code = store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s
		)
	,base_table_min_wos as  (select b.*,l0_name,l1_code,l2_code,l3_code, l4_code, l0_code, l1_name, l3_name from
			(
			select
				b.*, 
				greatest(0,MIN - (updated_oh_oo_it)) as min_short,
				greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
				least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) as min_allocation
			from
				base_table b) b 
				join global.product_attributes_filter paf on paf.product_code = b.article
				)	
		,store_level_base_table as (
		SELECT store_code,
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
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
--		select * from store_level_base_table;
		,store_band_level_base_table as materialized (
			select distinct coalesce(psaf.psa_name,'2') as psa_name, psaf.store_group_description, slbt.*   
			from store_level_base_table slbt left join global.product_store_attributes_filter psaf 
			on md5(slbt.l0_code || slbt.l1_code || slbt.l3_code || slbt.l4_code || slbt.store_code) = md5(psaf.l0_code || psaf.l1_code || psaf.l3_code || psaf.l4_code || psaf.store_code)
			)
--			select * from store_band_level_base_table;
		, store_band as materialized(
				select psa_name,
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
			    group by 1, 2, 3, 4
		)
--		select * from store_band;
		,cnt_table as (
			select psa_name, coalesce(count(distinct store_code),0) stores_cnt from store_band_level_base_table where allocated_quantity > 0 group by 1 
		)
		SELECT 
			slb.*,
		   coalesce(ct.stores_cnt, 0) stores_cnt,
		   ROUND(CAST(slb.allocated_quantity / NULLIF(SUM(slb.allocated_quantity) OVER (), 0) * 100 AS NUMERIC), 2) AS allocated_percentage
	FROM store_band slb
	left join cnt_table ct using (psa_name)	
	order by psa_name
		$$, $2, _article_filter);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;
