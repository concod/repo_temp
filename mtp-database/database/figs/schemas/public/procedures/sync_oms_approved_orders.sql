--liquibase formatted sql
--changeset poojith.krishna@impactanalytics.co:initial_version runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: initial version of sync_oms_approved_orders
DROP PROCEDURE IF EXISTS public.sync_oms_approved_orders(bool);
CREATE OR REPLACE PROCEDURE public.sync_oms_approved_orders(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_approved_orders';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		
		---Step1: Intermediate table joining actual and pseudo po
        create temp table reconciliation_data on commit drop as
        (
            WITH actual_po AS
            (
                SELECT 
                    CONCAT(product_code, '-', loc_code, '-', coalesce(channel,'-'), '-' , date(projected_delivery_date)) AS po_detail_id,
                    CONCAT(product_code, '-', loc_code, '-', coalesce(channel,'-')) AS po_detail_id_key,
                    opm.*
                FROM inventory_smart.oms_po_master opm 
                JOIN global.product_attributes_filter paf 
                    USING(product_code)
                WHERE po_id <> '-'
            )     
            ,pseudo_po AS
            (
    			select 
    				CONCAT(product_code, '-', loc_code, '-', coalesce(channel,'-'), '-' , date(editable_expected_receipt_date)) AS po_detail_id,
    				CONCAT(product_code, '-', loc_code, '-', coalesce(channel,'-')) AS po_detail_id_key,
					ooa.*
			from inventory_smart.oms_orders_approved ooa
            )
            SELECT 
            DISTINCT *,
            CONCAT(product_code, loc_code, channel, order_placement_date, order_placement_recom_date, order_gen_type) as final_reconciliation_id
            FROM 
            (
                SELECT 
                	distinct
                	pp.*,
                	-----If po_to_order_processing is null then take default as 1 day
                    coalesce(oclt.po_to_order_processing,1) as po_to_order_processing, 
                    (current_date::DATE - order_placement_date::DATE) as days_since_approved,
                    DATE(ap.projected_delivery_date) as projected_delivery_date,
                    ap.po_detail_id as actual_po_detail_id, 
                    ap.po_detail_id_key as po_detail_id_key_actual_po,
                    DATE(pp.editable_expected_receipt_date) as editable_expected_receipt_date_final,
                    pp.po_detail_id_key as po_detail_id_key_pseudo_po,
		        	ap.oo,
		        	ap.it
                FROM 
                	pseudo_po pp
                left join
                	actual_po ap
				 ON 
				 	ap.po_detail_id_key = pp.po_detail_id_key
				 	----------If projected delivery date is between +-7 days of editable_expected_receipt_date then delete this PO
				 	AND DATE(ap.projected_delivery_date) - DATE(pp.editable_expected_receipt_date) BETWEEN -7 AND 7
                left JOIN 
                	inventory_smart.oms_constraints_lead_time oclt 
                using
                	(article)    	
            )AS base  
		);
			
		
		---Step2: If any actual PO is mapped to 2 or more approved po then map it to only 1st approved po
		WITH duplicate_actual_po_detail_id_mapping AS 
		(
	    SELECT
	        ctid,
	        CASE 
	            WHEN actual_po_detail_id IS NULL THEN 1
	            ELSE ROW_NUMBER() OVER (PARTITION BY actual_po_detail_id ORDER BY editable_expected_receipt_date_final) END AS rnk
	    FROM reconciliation_data
		)
		UPDATE reconciliation_data t
		SET actual_po_detail_id = null,
			oo = null,
			it = null
		FROM duplicate_actual_po_detail_id_mapping d
		WHERE t.ctid = d.ctid
		  AND d.rnk > 1;
			
			
		---Step3: Map aggregated PO qty to the approved PO 
		create temp table reconciliation_data_final on commit drop  as
		(
		with actual_po_derived as
		(
        select 
            po_detail_id,
            sum(coalesce(oo,0)) as oo_final,
            sum(coalesce(it,0)) as it_final,
            sum(coalesce(oo,0) + coalesce(it,0)) AS po_quantity
		from 
			reconciliation_data
		group by 1
		)
		select 
			a.*, b.oo_final, b.it_final, b.po_quantity,
			GREATEST(COALESCE(order_quantity - po_quantity, order_quantity),0) AS calc_approved_pending_recon,
			CASE WHEN actual_po_detail_id IS NOT null THEN 1 ELSE 0 END AS po_flag
		from 
			reconciliation_data a
		left join 
			actual_po_derived b
		using 
			(po_detail_id)
		);	
	
			             
        ---Step4: Delete form approved order
        DELETE FROM inventory_smart.oms_orders_approved
        WHERE CONCAT(product_code, loc_code, channel, order_placement_date, order_placement_recom_date, order_gen_type) in
        (select 
        	distinct  final_reconciliation_id
         from 
         	reconciliation_data_final
        WHERE 
        	----Delete approved orders if passed po_to_order_processing_day
        	----And retain partial PO till po_to_order_processing_day
        	days_since_approved> po_to_order_processing
            OR (po_flag = 1 AND calc_approved_pending_recon = 0)
        );
       
       
        ---Step5: Update pending PO in oms_orders_approved table
        UPDATE inventory_smart.oms_orders_approved ooa
        SET approved_orders_pending_reconciliation = cte.calc_approved_pending_recon
        FROM reconciliation_data_final cte
        WHERE cte.product_code = ooa.product_code
            AND cte.final_reconciliation_id = CONCAT(ooa.product_code, 
           											ooa.loc_code,
           											ooa.channel,
           											ooa.order_placement_date,
           											ooa.order_placement_recom_date,
           											ooa.order_gen_type);
           
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;