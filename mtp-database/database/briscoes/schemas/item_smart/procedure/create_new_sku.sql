-- DROP PROCEDURE item_smart.create_new_sku();

CREATE OR REPLACE PROCEDURE item_smart.create_new_sku()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
begin
    
    DROP TABLE IF EXISTS item_smart.new_skus;
  
    CREATE TABLE item_smart.new_skus AS 
    SELECT phf.* 
    FROM item_smart.mv_product_hierarchies_filter phf 
    LEFT JOIN (
        SELECT DISTINCT hierarchy_code 
        FROM item_smart.iaf_master 
    ) iaf ON phf.hierarchy_code = iaf.hierarchy_code  
    WHERE iaf.hierarchy_code IS NULL;
   
   
   ALTER TABLE item_smart.new_skus ADD COLUMN is_cadence_generated bool NULL,
   ADD COLUMN is_mapped bool NULL, 
   ADD COLUMN mapped_product_code varchar null,
   ADD COLUMN mapped_product_code_description VARCHAR NULL,
   ADD COLUMN updated_at timestamptz NULL ,
   ADD COLUMN updated_by integer NULL ;

   
END;
$procedure$
;
