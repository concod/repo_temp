--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:ph-new-sku runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit_ph-new-sku
--comment: initial changeset for ph-new-sku
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.delete_placeholder_info(text);

CREATE OR REPLACE FUNCTION item_smart.delete_placeholder_info(product_code text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    hierarchy_code_var INTEGER;
	partition_var text;
    wp_table_name text;
	iaf_table_name text;
	deletion_count_wp INTEGER := 0;
	deletion_count_iaf INTEGER := 0;
	deletion_count_ph INTEGER := 0;
    
BEGIN



    -- Retrieve the hierarchy code based on the dynamic WHERE clause
    EXECUTE format('SELECT hierarchy_code,l0_name FROM item_smart.placeholders_info WHERE style = %L LIMIT 1', product_code)
    INTO hierarchy_code_var, partition_var;

	wp_table_name := 'item_smart.wp_master_' || partition_var;
	iaf_table_name := 'item_smart.iaf_master_' || partition_var;

	RAISE NOTICE 'Country is % and Hierarchy code is %. and wp table is % iaf table is %', partition_var,hierarchy_code_var,wp_table_name,iaf_table_name;

	--delete from wp_master
	EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %L', wp_table_name,hierarchy_code_var );
	GET DIAGNOSTICS deletion_count_wp = ROW_COUNT;
	
	--delete from iaf_master
	EXECUTE format('DELETE FROM %s WHERE hierarchy_code = %L', iaf_table_name,hierarchy_code_var );
	GET DIAGNOSTICS deletion_count_iaf = ROW_COUNT;

	--delete from placeholder info table
	EXECUTE format('DELETE FROM item_smart.placeholders_info WHERE style = %L', product_code );
	GET DIAGNOSTICS deletion_count_ph = ROW_COUNT;
	

    RETURN deletion_count_wp+deletion_count_iaf+deletion_count_ph;
END;
$function$
;
