--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:sync_product_supersession runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-64
--comment: initial changeset for product_supersession
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS  public.sync_product_supersession();

CREATE OR REPLACE PROCEDURE public.sync_product_supersession()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_supersession';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin	
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	ALTER SEQUENCE inventory_smart.product_supersession_mapping_ps_code_seq RESTART WITH 1;
      -- Delete existing records from product_supersession_mapping
    truncate table inventory_smart.product_supersession_mapping cascade;

    -- Insert new records into product_supersession_mapping
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
        sub_choice_id,
        sub_product_code,
        main_choice_id,
        main_product_code,
        priority,
        valid_from,
        '2099-01-01' AS end_date,
        NULL AS has_store_exception,
        updated_by,
        updated_at,
        NULL AS created_by,
        NULL AS created_at,
        supersession_id
    FROM public.product_supersession;

    -- Insert new records into product_supersession_attribute for old and new attributes
    INSERT INTO inventory_smart.product_supersession_attribute (
	    ps_code, 
	    attribute_name, 
	    attribute_value
    )
    SELECT 
        ps_code,
        concat('old_',attribute_name) as attribute_name, 
        attribute_value
    FROM 
        global.product_attributes pa 
    INNER JOIN 
        inventory_smart.product_supersession_mapping psm ON pa.product_code = psm.old_product_code
    where pa.attribute_name in ('l0_name', 'l3_name', 'l4_name', 'l5_name', 'l6_name', 'l7_name', 'product_id_name','collection','product_lifecycle','masterstyle_descr','subbrand_code_desc','flex_style','generic','sizes_mat','form','user_defined_1','user_defined_2','user_defined_3','user_defined_4','user_defined_5','color','size')
    
    UNION ALL

    SELECT 
        ps_code,
        concat('new_',attribute_name) as attribute_name,
        attribute_value
    FROM 
        global.product_attributes pa 
    INNER JOIN 
        inventory_smart.product_supersession_mapping psm ON pa.product_code = psm.product_code
       	where attribute_name in ('l0_name', 'l3_name', 'l4_name', 'l5_name', 'l6_name', 'l7_name', 'product_id_name','collection','product_lifecycle','masterstyle_descr','subbrand_code_desc','flex_style','generic','sizes_mat','form','user_defined_1','user_defined_2','user_defined_3','user_defined_4','user_defined_5','color','size');      
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
