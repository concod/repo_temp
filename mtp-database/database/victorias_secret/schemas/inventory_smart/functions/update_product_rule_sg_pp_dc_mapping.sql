--liquibase formatted sql
--changeset liquibase:update_product_rule_sg_pp_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0_0 labels:MTP-20882
--comment: MTP-20882
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_pp_dc_mapping(input jsonb, jsonb, integer[], text, jsonb, integer, integer[]);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_rule_sg_pp_dc_mapping(input jsonb, jsonb, integer[], text, jsonb, integer, integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 declare
_query_ph text := '';
_query_sa text := '';
_query_combine text:= '';
_column_name text := '';
_column_value text := '';
_query_l0_name text := '';
_query_table_filters text := '';
begin
select $1->>'l0_name' into _query_l0_name;
_query_l0_name = format('{"l0_name": %1$s}', _query_l0_name);

raise notice 'l0 query%',_query_l0_name; 

_query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
_query_ph := inventory_smart.form_main_table_filters('ph_master', $1);
_query_sa := global.form_main_table_filters('store_attributes', $2);
_query_table_filters := global.form_table_query($5); 

 --raise notice '%,', $7;

    if $4 ilike 'store' then
        _column_name := 'default_store_groups';
        _column_value := $3::text;
    --raise notice 'under if condition';
    elsif $4 ilike 'dc' then
        _column_name := 'default_dcs';
        _column_value := $3::text;
    else
        _column_name := 'default_product_profile';
        _column_value := $3[1]::text;
    end if;
    
   
   
    raise notice '%', _column_value;
    _query_combine := '
     update inventory_smart.ph_configuration_mapping psm
     set '||_column_name||' = '''||_column_value ||''' , default_store_groups_selected = '''||$7::text||'''
     where ph_code in (
     select ph_code from (
     select *
     from (select *, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || ') ph
     join (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||' and is_active = true and validity is not null) pmps 
     using (product_code, l0_name)
     join (select * from "global".store_attributes_filter '|| _query_sa || ') saf
     using (store_code) 
     '|| _query_table_filters ||'
    ) as x
     );';
    raise notice '%', _query_combine;
    execute _query_combine;
    _query_combine := '
    INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, '|| _column_name ||')
    SELECT ph_code, channel, '''|| _column_value ||'''
    FROM (
         SELECT ph_code, channel
        FROM (
            SELECT ph_code, ph.channel
            FROM (
                select *, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || '
            ) ph
             JOIN (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||' and is_active = true and validity is not null) pmps 
                USING (product_code, l0_name)
             JOIN (select * from "global".store_attributes_filter '|| _query_sa || ') saf
                 using (store_code) 
            '|| _query_table_filters ||'
        ) as x
    ) x
    WHERE (ph_code, channel) NOT IN (SELECT ph_code, channel FROM inventory_smart.ph_configuration_mapping)
    ON CONFLICT DO NOTHING;
    ';
    raise notice '%', _query_combine;
    execute _query_combine;
end
$function$
;
