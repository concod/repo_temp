
-- liquibase formatted sql
-- changeset shrinidhi.choragi@impactanalytics.co:sync_product_supersession runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_product_supersession
-- comment: initial changeset for sync_product_supersession
DROP procedure if exists public.sync_product_supersession();
CREATE OR REPLACE PROCEDURE public.sync_product_supersession()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_supersession';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 
    TRUNCATE TABLE inventory_smart.product_supersession_mapping CASCADE;
    INSERT INTO inventory_smart.product_supersession_mapping (
        old_article,
        old_product_code,
        article,
        product_code,
        priority,
        start_date,
        end_date,
        has_store_exception,
        updated_by,
        updated_at,
        created_by,
        created_at,
        supersession_id
    )
    SELECT 
        old_article,
        old_product_code,
        article,
        product_code,
        priority,
        cast(start_date as date) start_date,
        cast(end_date as date) end_date,
        NULL AS has_store_exception,
        updated_by,
        updated_at,
        NULL AS created_by,
        NULL AS created_at,
        supersession_id
    FROM public.supersession_table;
    INSERT INTO inventory_smart.product_supersession_attribute (
        ps_code, 
        attribute_name, 
        attribute_value
    )
    SELECT 
        psm.ps_code,
        CONCAT('old_', pa.attribute_name) AS attribute_name, 
        pa.attribute_value
    FROM 
        global.product_attributes pa 
    INNER JOIN 
        inventory_smart.product_supersession_mapping psm ON pa.product_code = psm.old_product_code
    WHERE pa.attribute_name IN ('l0_name', 'l1_name', 'l2_name', 'l3_name', 'l4_name', 'l5_name', 'l6_name','collection', 'season','gender','class','subclass','style','style_description','prod_sku_key')
    UNION ALL
    SELECT 
        psm.ps_code,
        CONCAT('new_', pa.attribute_name) AS attribute_name,
        pa.attribute_value
    FROM 
        global.product_attributes pa 
    INNER JOIN 
        inventory_smart.product_supersession_mapping psm ON pa.product_code = psm.product_code
    WHERE pa.attribute_name IN ('l0_name', 'l1_name','l2_name', 'l3_name', 'l4_name', 'l5_name', 'l6_name','collection', 'season','gender','class','subclass','style','style_description','prod_sku_key');
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;