--liquibase formatted sql
--changeset liquibase:manage_promo_product_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for manage_promo_product - added drop command
--rollback: SELECT 1
DROP FUNCTION IF EXISTS base_pricing.manage_promo_product();
CREATE FUNCTION base_pricing.manage_promo_product(operation_mode text, input_promo_id integer, input_product_id integer, status integer DEFAULT NULL::integer, is_deleted integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Call the function to create the partition if it doesn't exist
    PERFORM base_pricing.create_promo_product_partition_table(input_promo_id);

    CASE operation_mode
        WHEN 'INSERT' THEN
            INSERT INTO base_pricing.promo_product (promo_id, product_id, status, is_deleted)
            VALUES (input_promo_id, input_product_id, COALESCE(status, 0), COALESCE(is_deleted, 0));
        
            
        WHEN 'DELETE' THEN
            DELETE FROM base_pricing.promo_store
            WHERE promo_id = input_promo_id and product_id = input_product_id;
            
        ELSE
            RAISE EXCEPTION 'Invalid operation_mode: %', operation_mode;
    END CASE;

END;
$function$
;