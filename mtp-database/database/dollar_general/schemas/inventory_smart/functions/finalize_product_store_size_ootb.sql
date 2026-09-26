--liquibase formatted sql
--changeset liquibase:finalize_product_store_size runOnChange:true stripComments:false splitStatements:false context:MTP-40575 labels:MTP-40575
--comment: MTP-66787 no need to convert created_at to IST time | MTP-88380
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.finalize_product_store_size_ootb(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.finalize_product_store_size_ootb(input refcursor, character varying, character varying, character varying, character varying, character varying, character varying, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.finalize_product_store_size
  * Created by: Manohara Gulla
  * Created at: 21-July-2024
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
            ------ PRODUCT VIEW STORE LEVEL - TABLE DATA
		with base_table as materialized (SELECT carfs.article, 
							  carfs.allocated_total,saf.store_name,carfs.oh,carfs.oo,carfs.it,
							  carfs.wos, carfs.pack_dc_allocation, carfs.min, carfs.max, 
							  channel, store store_code, retail_size_cd size, updated_oh_oo_it, saf.store_attribute
		FROM inventory_smart.create_allocation_result_flat_gurobi carfs
		LEFT JOIN global.store_attributes_filter saf ON store_code = store
		WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$  and allocation_code = '%1$s' %2$s
		)
	,base_table_min_wos as  (select b.*,l0_name,l1_code,l2_code,l3_code, l4_code, l0_code, l1_name, l3_name,dpc.units_in_pack from
			(
			select
				b.*, 
				greatest(0,MIN - (updated_oh_oo_it)) as min_short,
				greatest(0, allocated_total - greatest(0, MIN - (updated_oh_oo_it))) as wos_allocation,
				least(allocated_total,greatest(0,MIN - (updated_oh_oo_it))) as min_allocation,
				UNNEST((TRANSLATE((js.value::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) pack_type_id,
				js.key::int dc_code
			from
				base_table b, JSONB_EACH(pack_dc_allocation) js) b 
				join global.product_attributes_filter paf on paf.product_code = b.article
				join inventory_smart.dc_pack_configuration dpc on dpc.article = b.article
				)	
--				select * from base_table_min_wos;
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
			   store_attribute,
			   dc_code,
			   sum(style_color_cnt) as style_color_cnt,
			   SUM(oh) as oh,
			   SUM(oo) as oo,
			   SUM(it) as it,
			   sum(min) as min_store,
			   sum(max) as max_store,
			   SUM(allocated_total) as allocated_quantity,
			   COALESCE(SUM(min_allocation), 0) as min_allocation,
			   COALESCE(SUM(wos_allocation), 0) as wos_allocation
		FROM (SELECT article,
				   store_code,
				   store_name,
				   bt.l0_code,
				   bt.l0_name, 
				   bt.l1_code, 
				   bt.l2_code, 
				   bt.l3_code,
				   bt.l4_code,
				   bt.l1_name, 
				   bt.l3_name,
				   bt.store_attribute,
				   dc_code,
				   COALESCE(MAX(MIN), 0) MIN,
				   COALESCE(MAX(MAX), 0) MAX,
				   COALESCE(SUM(min_allocation), 0) as min_allocation,
				   COALESCE(SUM(wos_allocation), 0) as wos_allocation,
				   COALESCE(MAX(oh), 0) oh,
				   COALESCE(MAX(oo), 0) oo,
				   COALESCE(MAX(it), 0) it,
				   COALESCE(SUM(allocated_total), 0) allocated_total,
				   COUNT( DISTINCT( CASE WHEN allocated_total > 0 THEN article END)) as style_color_cnt
			FROM base_table_min_wos bt
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13) as st
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
--		select * from store_level_base_table;
		,store_band_level_base_table as materialized (
			select distinct psaf.psa_name,psaf.store_group_description, slbt.*   
			from store_level_base_table slbt left join global.product_store_attributes_filter psaf 
			on md5(slbt.l0_code || slbt.l1_code || slbt.l3_code || slbt.l4_code || slbt.store_code) = md5(psaf.l0_code || psaf.l1_code || psaf.l3_code || psaf.l4_code || psaf.store_code)
			)
--			select * from store_band_level_base_table;
		SELECT 
			slb.*,
			dcs.name as dc
	FROM store_band_level_base_table slb
	LEFT JOIN global.distribution_centres dcs using(dc_code) 
	%3$s
		$$, $2, _article_filter, _store_filter1);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
$function$
;