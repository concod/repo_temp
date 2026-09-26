--liquibase formatted sql
--changeset anish.a@impactanalytics.co:uom_view runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for uom_view
--rollback: SELECT 1
do
$$
DECLARE 
    _is_view int;
    _is_table int;
begin

    select count(*) as cnt into _is_table
    from information_schema."tables" c  
    where table_name = 'uom' and table_schema = 'inventory_smart' 
    and table_type = 'BASE TABLE';

    select count(*) as cnt into _is_view
    from information_schema."tables" c  
    where table_name = 'uom' and table_schema = 'inventory_smart' 
    and table_type = 'VIEW';

    IF _is_table = 1 THEN 
    
        DROP TABLE IF EXISTS inventory_smart.uom;
        --raise notice 'dropping table....';
        
    END IF;
    
    IF _is_view = 1 THEN 
    
        DROP VIEW IF EXISTS inventory_smart.uom;
        --raise notice 'dropping view....';
        
    END IF;
    
CREATE OR REPLACE VIEW inventory_smart.uom
AS SELECT uom_version.version_code,
    uom_version.from_unit_description,
    uom_version.factor,
    uom_version.to_unit_description,
    uom_version.item_id,
    uom_version.from_unit,
    uom_version.to_unit,
    uom_version.date,
    uom_version.article
   FROM inventory_smart.uom_version
  WHERE uom_version.version_code = global.get_table_version('inventory_smart.uom_version'::text);

end;
$$;