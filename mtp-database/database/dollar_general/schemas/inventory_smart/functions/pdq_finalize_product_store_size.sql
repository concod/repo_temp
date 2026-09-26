--liquibase formatted sql
--changeset liquibase:pdq_finalize_product_store_size runOnChange:true stripComments:false splitStatements:false context:MTP-58781 labels:MTP-58781
--comment: MTP-66787 no need to convert created_at to IST time
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.pdq_finalize_product_store_size(refcursor, varchar, varchar, varchar, varchar, varchar);
CREATE OR REPLACE FUNCTION inventory_smart.pdq_finalize_product_store_size(input refcursor, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.pdq_finalize_product_store_size
  * Created by: Manohara Gulla
  * Created at: 01-Oct-2024
  * No of input parameter: 6
  * Parameter Description : $1 = Cursor
  *                         $2 = Allocation Code
  *                             $3 = Store code
  *                             $4 = Article code/SKU code
  *                             $5 = Ignore allocation code
								$6 = type
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
	
	vl_query_text text;
	start_time timestamp;
	end_time timestamp;
	_pm_date date;
	_query text;
    begin
        _store_filter1 := '';
        _article_filter := '';
        _store_filter2 := '';
        _priority_allocation := '';
		_query :=  'select date(created_at) from inventory_smart.plan_master where plan_code = %L';
		if $5 = '' then 
			_query := format(_query, $2); 
		else
			_query := format(_query, $5);
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
                _store_filter1 := format($$WHERE psa_name = '%s'$$, $3);
                _store_filter2 := format($$WHERE a.store_code = '%s'$$, $3);
            end if;
        if ($4 = '') IS FALSE
            then
                _article_filter := format($$AND carfs.article = '%s'$$, $4);
            end if;


        _query_combine := format($$
            ------ PRODUCT VIEW - Size TABLE DATA
		with base_table as materialized (SELECT carfs.article, 
							  carfs.allocated_total,carfs.store_name,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max, 
							  channel, store store_code, retail_size_cd size, updated_oh_oo_it, saf.store_attribute
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		LEFT JOIN global.store_attributes_filter saf ON store_code = store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%1$s' %2$s
		)
		,flat_table as (SELECT article,
			   store_code,
			   js.key::int dc_code, 
			   channel,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty,
			   UNNEST((TRANSLATE((js.value::jsonb->>'packs_available_qty')::text, '[]', '{}'))::numeric[]) available_qty        
		FROM (
			SELECT article, store_code, channel, pack_dc_allocation FROM base_table 
			GROUP BY 1, 2, 3, 4
		) foo , JSONB_EACH(pack_dc_allocation) js)
	,packs as (SELECT article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   channel,
			   available_qty ,
			   allocated_qty packs_allocated_qty,
			   allocated_qty,
			   'NS' size
		FROM flat_table 
		group by 1,2,3,4,5,6,7,8)
	,packs_base as materialized (SELECT article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   pack_type_id as size,
			   allocated_qty,
			   channel,
			   available_qty,
			   allocated_qty as packs_allocated_qty,
			   'E' as type
		FROM flat_table
		WHERE NOT (pack_type_id IN ( SELECT pack_type_id FROM packs))
		UNION
		SELECT article,
			   dc_code,
			   store_code,
			   pack_type_id,
			   size,
			   allocated_qty,
			   channel,
			   available_qty,
			   packs_allocated_qty,
			   'S' as type
	   FROM packs)
	,final_inv as (
	        		    SELECT dc_code,
	                           size,
	        		           SUM(allocated_qty) as allocated_qty,
	        		           SUM(available_qty) as dc_available,
	        		       	   COALESCE(SUM(available_qty), 0) - COALESCE(SUM(allocated_qty), 0)  as net_available
	        		    FROM (
	        		        SELECT
	        		            article,
	        		            size,
	        		            dc_code,
	        		            SUM(allocated_qty) as allocated_qty,
	        		            avg(available_qty) as available_qty
							FROM packs_base
							GROUP BY 1, 2, 3
	        		    ) a
						GROUP BY 1, 2
	        		)
 --select * from final_inv
	,store_level_inv as (SELECT store_code, dc_code, size, net_available
			FROM (
				SELECT store_code,
					   size,
					   JSONB_OBJECT_KEYS(pack_dc_allocation)::int as dc_code
				FROM base_table
			) foo
			LEFT JOIN final_inv USING(dc_code, size)
			group by 1,2,3,4
			)
--select * from store_level_inv
,base_table_min_wos as  (select b.*,l0_name,l1_code,l2_code,l3_code, l4_code, l0_code, l1_name, l3_name, 1 as units_in_pack from
			(
			select
				b.*, 
				greatest(0,MIN - (updated_oh_oo_it)) as min_short,
				greatest(0, UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
				least(UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]),greatest(0,MIN - (updated_oh_oo_it))) as min_allocation,
				UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
				UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::numeric[]) allocated_qty
			from
				base_table b, JSONB_EACH(pack_dc_allocation) js) b 
				join global.product_attributes_filter paf on paf.product_code = b.article)
--select * from base_table_min_wos
,store_level_base_table as (
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
				   bt.pack_type_id as packs_allocated,
				   bt.units_in_pack,
				   bt.store_attribute,
				   COALESCE(MAX(MIN), 0) as min_store,
				   COALESCE(MAX(MAX), 0) as max_store,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(MAX(oh), 0) oh,
				   COALESCE(MAX(oo), 0) oo,
				   COALESCE(MAX(it), 0) it,
				   COALESCE(SUM(allocated_qty), 0) as allocated_quantity,
				   COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15   
		) 
		,store_band_level_base_table as materialized (
			select distinct coalesce(psaf.psa_name,'2') as psa_name, psaf.store_group_description, slbt.*   
			from store_level_base_table slbt left join global.product_store_attributes_filter psaf 
			on md5(slbt.l0_code || slbt.l1_code || slbt.l3_code || slbt.l4_code || slbt.store_code) = md5(psaf.l0_code || psaf.l1_code || psaf.l3_code || psaf.l4_code || psaf.store_code)
			)
		,cnt_table as (
			select psa_name, count(distinct store_code) stores_cnt from store_band_level_base_table where allocated_quantity > 0 group by 1 
		)
		SELECT slb.*,
		   sli.dc_code,
		   sli.net_available,
		   dcs.name as dc,
		   smf.store_name,
		   smf.store_code,
		   coalesce(ct.stores_cnt,0) stores_cnt
        FROM store_band_level_base_table slb
        LEFT JOIN store_level_inv sli USING(store_code)
        LEFT JOIN global.distribution_centres dcs using(dc_code) 
        LEFT JOIN global.store_attributes_filter smf using (store_code)
        left join cnt_table ct using (psa_name)	
        %3$s $$, $2, _article_filter, _store_filter1, _final_inv_query, _priority_allocation, _priority_allocation);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;

