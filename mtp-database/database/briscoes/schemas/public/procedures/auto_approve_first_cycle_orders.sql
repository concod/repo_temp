--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:auto_approve_first_cycle_orders runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_auto_approve_first_cycle_orders
--comment: initial changeset for auto_approve_first_cycle_orders
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.auto_approve_first_cycle_orders();
CREATE OR REPLACE PROCEDURE public.auto_approve_first_cycle_orders()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();

    -- Variable to generate the unique batch name once
    v_order_batch_name text;
   	v_template_sql_1  TEXT;
    v_template_sql_2  TEXT;
    v_sql_1 TEXT;
    v_sql_2 TEXT;
    v_rowcount INTEGER;
    
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);

	begin
	    -- 1. Generate the unique batch name for the current run
	    v_order_batch_name := 'IA_Order_' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD"T"HH24MISS');
	    RAISE NOTICE 'order_batch_name: %', v_order_batch_name;
	   
	    -- 2. INSERT statement: Move orders into the approved table
	    v_template_sql_1 := format($fmt$
	   
	    INSERT INTO inventory_smart.oms_orders_approved
	    (    
	     id, order_gen_type, product_code, article, 
	     size, loc_code, min_order_quantity_sku, max_order_quantity_sku, min_order_quantity_style, 
	     vendor_code, rop, grade, order_quantity, unit_cost, roq_constrained, 
	     roq_unconstrained, order_placement_date, order_placement_recom_date, 
		 expected_receipt_date,editable_expected_receipt_date, rop_ideal, lead_time, 
		 effective_lead_time, dc_inv, system_inv, inventory_hold, order_status_id, 
		 created_by, created_at, updated_by, edit_by_date, 
		 is_deleted, 
		 order_batch_name, 
		 reconciliation_id
	     )
	     
	    --------------------Base data
	    (
	        WITH auto_approve_articles AS (
	            SELECT article 
	            FROM inventory_smart.oms_constraints_order_policy
	            WHERE auto_approve = true
	        ),
	        store_filter AS (
	            SELECT saf.store_code
	            FROM global.store_attributes_filter saf
	            where special_classification='WHS'
	        ),
	        orders_to_consider AS (
	            SELECT 
	                oors.*,
	                --ROW_NUMBER() OVER(PARTITION BY oors.product_code, oors.loc_code ORDER BY oors.order_placement_date ASC) as rn
	            	dense_rank() OVER(PARTITION BY oors.product_code ORDER BY oors.order_placement_date ASC) as rn
				FROM inventory_smart.oms_orders_recommended oors
	            INNER JOIN auto_approve_articles aaa ON oors.article = aaa.article
	            WHERE trim(lower(oors.order_type)) IN ('order cycle', 'reorder point')
	        )
	        ,
	        oors_product_filter AS (
	            SELECT oors.*
	            FROM orders_to_consider oors
	            INNER JOIN store_filter saf ON saf.store_code = oors.loc_code
	            AND oors.order_quantity > 0 
	            AND oors.rn = 1 -- Only process the first (earliest) order_placement_date
	            ------------Only process today's recommendation if already not pushed to oms_orders_recommended
	            and oors.order_status_id = 0 
	            and date(created_at) = current_date
	        )
	        
	     	SELECT
	        oor.id, oor.order_gen_type, oor.product_code,oor.article, 
			oor.size, oor.loc_code, oor.min_order_quantity_sku, oor.max_order_quantity_sku,oor.min_order_quantity_style, 
			oor.vendor_code, oor.rop, oor.grade, oor.order_quantity, oor.unit_cost, oor.roq_constrained, 
			oor.roq_unconstrained, CURRENT_DATE AS order_placement_date, oor.order_placement_recom_date, 
			oor.expected_receipt_date::DATE, oor.editable_expected_receipt_date::DATE, oor.rop_ideal, oor.lead_time, 
			oor.effective_lead_time, ok.dc_inv, ok.system_inv, oor.inventory_hold::int, 3 AS order_status_id, 
			(select user_code from "global".user_master where email='ia_system@impactanalytics.co') as created_by,
			CURRENT_TIMESTAMP AS created_at, NULL AS updated_by, CURRENT_DATE + 28 AS edit_by_date, 
			FALSE AS is_deleted,
			%1$L AS order_batch_name,
			CONCAT(oor.product_code, '-', oor.loc_code, '-', coalesce(oor.channel,'-')) AS reconciliation_id
	       FROM oors_product_filter AS oor
		   INNER JOIN "global".product_attributes_filter paf
	       ON oor.product_code = paf.product_code
		   LEFT JOIN inventory_smart.oms_kpi AS ok
	       ON oor.product_code = ok.product_code and oor.loc_code = ok.loc_code
	       WHERE TRUE    
	    );
	   
	   $fmt$, v_order_batch_name);
	  
	  
	    -- 3. Mark them approved
	    v_template_sql_2 := format($fmt$
	    
	        
	        WITH auto_approve_articles AS (
	            SELECT article 
	            FROM inventory_smart.oms_constraints_order_policy
	            WHERE auto_approve = true
	        ),
	        store_filter AS (
	            SELECT saf.store_code
	            FROM global.store_attributes_filter saf
	            where special_classification='WHS'
	        ),
	        orders_to_consider AS (
	            SELECT 
	                oors.*,
	                -- ROW_NUMBER() OVER(PARTITION BY oors.product_code, oors.loc_code ORDER BY oors.order_placement_date ASC) as rn
					dense_rank() OVER(PARTITION BY oors.product_code ORDER BY oors.order_placement_date ASC) as rn
	            FROM inventory_smart.oms_orders_recommended oors
	            INNER JOIN auto_approve_articles aaa ON oors.article = aaa.article
	            WHERE trim(lower(oors.order_type)) IN ('order cycle', 'reorder point')
	        )
	        ,
	        oors_product_filter AS (
	            SELECT oors.*
	            FROM orders_to_consider oors
	            INNER JOIN store_filter saf ON saf.store_code = oors.loc_code
	            AND oors.order_quantity > 0 
	            AND oors.rn = 1 -- Only process the first (earliest) order_placement_date
	            ------------Only process today's recommendation if already not pushed to oms_orders_recommended
	            and oors.order_status_id = 0 
	            and date(created_at) = current_date
	        ) 
	        
	    UPDATE inventory_smart.oms_orders_recommended oor
	    SET 
	        order_status_id = 3, 
	        order_batch_name = %1$L, -- Use the generated batch name
	        is_deleted = true,
	        updated_by = (select user_code from "global".user_master where email='ia_system@impactanalytics.co'),
	        updated_at = now()
	    FROM oors_product_filter opf
	    WHERE oor.id = opf.id;
	    
	    $fmt$, v_order_batch_name);
	  
	    --------------------- QUERY 1 Execution ---------------------
--	    v_sql_1 :=
--	        replace(
--	            v_template_sql_1,
--	            '{{v_order_batch_name}}',
--	            quote_literal(v_order_batch_name)
--	        );
	 
		RAISE NOTICE 'FINAL APPROVED ORDER TO EXECUTE: %', v_template_sql_1;
	  
		EXECUTE v_template_sql_1;
		
		RAISE NOTICE 'INSERT COMPLETE WITH BATCH %', v_order_batch_name;
	
	    -- 5️⃣ GET ROW COUNT
	    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
	    RAISE NOTICE 'Total rows inserted: %', v_rowcount;
	   
	   
	    --------------------- QUERY 2 Execution ---------------------
--	       v_sql_2 :=
--	        replace(
--	            v_template_sql_2,
--	            '{{v_order_batch_name}}',
--	            quote_literal(v_order_batch_name)
--	        );
--	 
		RAISE NOTICE 'FINAL RECOMMENDED ORDER TO EXECUTE: %', v_template_sql_2;
	  
		EXECUTE v_template_sql_2;
		
		RAISE NOTICE 'UPDATE COMPLETE WITH BATCH %', v_order_batch_name;
	
	    -- 5️⃣ GET ROW COUNT
	    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
	
	    RAISE NOTICE 'Total rows inserted: %', v_rowcount;
	   
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
	        raise exception 'Error occurred in the procedure: %', SQLERRM;
	  
	END;
end;
$procedure$
;