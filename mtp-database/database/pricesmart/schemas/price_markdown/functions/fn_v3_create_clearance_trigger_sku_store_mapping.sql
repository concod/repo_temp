--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_v3_insert_clearance_trigger_options-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Function to insert clearance trigger options

DROP FUNCTION if exists price_markdown.fn_v3_create_clearance_trigger_sku_store_mapping;

CREATE OR REPLACE FUNCTION price_markdown.fn_v3_create_clearance_trigger_sku_store_mapping(p_trigger_id integer, p_product_ids bigint[], p_store_ids bigint[], p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	BEGIN

		INSERT INTO price_markdown.tb_clearance_trigger_sku_mapping (trigger_id, product_id, store_id, created_by, created_at)
        SELECT p_trigger_id AS trigger_id,
            pm.product_id,
            sm.store_id,
			p_user_id as created_by,
			now() as created_at
        FROM (SELECT unnest(p_product_ids) AS product_id) AS products
        CROSS JOIN (SELECT unnest(p_store_ids) AS store_id) AS stores
        INNER JOIN global.tb_store_master sm ON sm.store_id = stores.store_id
        INNER JOIN price_markdown.product_master pm ON pm.product_id = products.product_id;

		RETURN p_trigger_id;

	END;
$function$
;
