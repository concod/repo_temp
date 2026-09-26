--liquibase formatted sql
--changeset liquibase:tb_product_user_mapping_2 runAlways:true stripComments:false splitStatements:false context:tb_product_user_mapping labels:tb_product_user_mapping
--comment: tb_product_user_mapping
--rollback: SELECT 1

DROP VIEW IF EXISTS price_promo.tb_product_user_mapping;

CREATE OR REPLACE VIEW price_promo.tb_product_user_mapping AS
SELECT
    t1.product_id,
    t1.primaryupc,
    t1.vendor_id,
    t1.vendor,
    t1.vendor_cuq,
    t1.vendor_cid,
    t1.vendor_mail_id,
    t2.user_code
FROM price_promo.tb_product_user_mapping_version t1
LEFT JOIN (
    SELECT
        user_master.user_code,
        user_master.email
    FROM global.user_master
    WHERE user_master.is_deleted = false
) t2
    ON t1.vendor_mail_id = t2.email::text
WHERE t1.version_code = global.get_table_version('price_promo.tb_product_user_mapping_version'::text);
