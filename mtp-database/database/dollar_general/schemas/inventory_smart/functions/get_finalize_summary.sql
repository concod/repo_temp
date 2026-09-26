--liquibase formatted sql
--changeset liquibase:get_finalize_summary runOnChange:true stripComments:false splitStatements:false context:MTP-65387 labels:MTP-65387
--comment: MTP-65387 query join change
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_finalize_summary(input refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_finalize_summary(input refcursor, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_allocation_codes text := $2;
		_query_combine text := '';
	begin 
		_query_combine := '
		WITH base_data AS (
            SELECT
                carfg.article,
                carfg.store,
                carfg.min,
                carfg.max,
                carfg.allocated_total,
                carfg.allocated_total * pm.msrp as allocated_total_retail,
                carfg.allocation_code,
                carfg.updated_at,
                pm.l0_code,
                pm.l1_code,
                pm.l3_code,
                pm.l4_code,
                pm.l0_name,
                pm.l1_name,
                pm.l3_name,
                pm.l4_name,
                pm.primary_sku,
                pm.product_description,
                carfg.oo,
                carfg.oh,
                carfg.it,
                carfg.oh_oo_intransit,
                dpc.units_in_pack,
                GREATEST(LEAST(carfg.min - carfg.oh_oo_intransit, carfg.allocated_total), 0) AS min_allocation,
                carfg.allocated_total - GREATEST(LEAST(carfg.min - carfg.oh_oo_intransit, carfg.allocated_total), 0) as wos_allocation
            FROM
                inventory_smart.create_allocation_result_flat_gurobi carfg
            INNER JOIN
                inventory_smart.ph_master pm
                ON carfg.article = pm.article
            INNER JOIN (
		      SELECT 
		        DISTINCT pack_type_id, 
		        CASE WHEN article = pack_type_id THEN units_in_pack ELSE 1 END AS units_in_pack 
		      FROM 
		        inventory_smart.dc_pack_configuration dpc
		    ) AS dpc ON carfg.article = dpc.pack_type_id 
            WHERE
				carfg.allocation_code in (' || _allocation_codes || ')
                
        )
        SELECT
            case when pm2.type = 2 or pm2.type = 7 then ''IA System Created Auto Allocation'' else pm2.name end as "Allocation Plan Name",
            CASE 
                WHEN pm2.type = 2 or pm2.type = 7 THEN ''Auto Allocation''  
                ELSE ''Manual''
            END AS "Allocation Type",
            MAX(pm2.created_at) as "Last Created", 
            CASE 
                WHEN pm2.status = 3 THEN ''Approved'' 
                ELSE '''' 
            END AS "Status",
            b.l0_code AS plan_code,
            b.l0_name AS plan,
            psaf.psa_name AS store_band,
            b.l1_name AS department,
            b.l3_name AS class,
            b.primary_sku AS sku,
            b.product_description AS sku_description,
            b.units_in_pack,
            AVG(b.min)::int as min,
            AVG(b.max)::int as max,
            SUM(b.oh) AS store_oh,
            SUM(b.it) AS store_it,
            SUM(b.oo) AS store_oo,
            SUM(b.oh_oo_intransit) AS store_total,
            COUNT(DISTINCT b.store) AS eligible_stores,
            COUNT(DISTINCT CASE WHEN b.allocated_total > 0 THEN b.store END) AS no_allocated_stores,
            ROUND(CAST(COUNT(DISTINCT CASE WHEN b.allocated_total > 0 THEN b.store END) / NULLIF(COUNT(DISTINCT b.store), 0)::float * 100 AS numeric), 2) AS per_store_with_allocation,
            COUNT(DISTINCT CASE WHEN b.min_allocation != 0 THEN b.store END) AS no_of_stores_with_min_allocation,
            ROUND(CAST(COUNT(DISTINCT CASE WHEN b.min_allocation != 0 THEN b.store END) / NULLIF(COUNT(DISTINCT b.store), 0)::float * 100 AS numeric), 2) AS per_stores_with_min_replen,
            COUNT(DISTINCT CASE WHEN b.allocated_total + b.oh_oo_intransit >= b.max THEN b.store END) AS no_of_stores_capped_by_max,
            SUM(b.allocated_total) AS total_allocated_units,
            SUM(b.allocated_total_retail) AS total_allocated_units_retail,
            SUM(b.min_allocation) AS min_allocations,
            SUM(b.wos_allocation) AS wos_allocations,
            SUM(b.allocated_total / NULLIF(b.units_in_pack, 0))::float AS number_of_inner
        FROM
            base_data b
        INNER JOIN
            "global".product_store_attributes_filter psaf
            ON md5(b.l0_code || b.l1_code || b.l3_code || b.l4_code || b.store) = md5(psaf.l0_code || psaf.l1_code || psaf.l3_code || psaf.l4_code || psaf.store_code)
        INNER JOIN 
            inventory_smart.plan_master pm2 
            ON b.allocation_code = pm2.plan_code 
        GROUP BY
            b.l0_code,
            b.l0_name,
            psaf.psa_name,
            b.l1_name,
            b.l3_name,
            b.primary_sku,
            b.product_description,
            b.units_in_pack,
            pm2.name,
            pm2.type,
            pm2.status
			'
	   ;
			    
	raise notice '%', _query_combine;
	open $1 for execute _query_combine;
	RETURN $1;
	end
$function$
;