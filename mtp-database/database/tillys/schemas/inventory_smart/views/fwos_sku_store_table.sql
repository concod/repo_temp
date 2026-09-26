--liquibase formatted sql
--changeset anish.a@impactanalytics.co:fwos_sku_store_table_view runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for fwos_sku_store_table_view
do
$$
DECLARE 
    _is_view int;
    _is_table int;
begin

    select count(*) as cnt into _is_table
    from information_schema."tables" c  
    where table_name = 'fwos_sku_store_table' and table_schema = 'inventory_smart' 
    and table_type = 'BASE TABLE';

    select count(*) as cnt into _is_view
    from information_schema."tables" c  
    where table_name = 'fwos_sku_store_table' and table_schema = 'inventory_smart' 
    and table_type = 'VIEW';

    IF _is_table = 1 THEN 
    
        DROP TABLE IF EXISTS inventory_smart.fwos_sku_store_table;
        --raise notice 'dropping table....';
        
    END IF;
    
    IF _is_view = 1 THEN 
    
        DROP VIEW IF EXISTS inventory_smart.fwos_sku_store_table;
        --raise notice 'dropping view....';
        
    END IF;
    
CREATE OR REPLACE VIEW inventory_smart.fwos_sku_store_table
AS SELECT 
    fwos_sku_store_table_version.version_code,
    fwos_sku_store_table_version.article,
    fwos_sku_store_table_version."date",
    fwos_sku_store_table_version.fiscal_year,
    fwos_sku_store_table_version.it,
    fwos_sku_store_table_version.it_dc,
    fwos_sku_store_table_version.lw_fiscal_week,
    fwos_sku_store_table_version.lw_fiscal_year_week,
    fwos_sku_store_table_version.oh,
    fwos_sku_store_table_version.oh_dc,
    fwos_sku_store_table_version.oo,
    fwos_sku_store_table_version.oo_dc,
    fwos_sku_store_table_version.product_code,
    fwos_sku_store_table_version.store_code,
    fwos_sku_store_table_version.tot_inv,
    fwos_sku_store_table_version.total_forecast,
    fwos_sku_store_table_version.wos,
    fwos_sku_store_table_version.wos_oh,
    fwos_sku_store_table_version.wos_oh_it,
    fwos_sku_store_table_version.wos_oh_oo,
    fwos_sku_store_table_version.store_level_prediction,
    fwos_sku_store_table_version.store_level_actuals,
    fwos_sku_store_table_version.size_integrity,
    fwos_sku_store_table_version.dc_oh_oo_it_wos,
    fwos_sku_store_table_version.dc_oh_wos,
    fwos_sku_store_table_version.dc_oh_oo_wos
  FROM inventory_smart.fwos_sku_store_table_version
  WHERE fwos_sku_store_table_version.version_code = global.get_table_version('inventory_smart.fwos_sku_store_table_version'::text);

end;
$$;