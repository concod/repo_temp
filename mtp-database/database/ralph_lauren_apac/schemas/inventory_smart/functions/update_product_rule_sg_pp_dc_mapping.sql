--liquibase formatted sql
--changeset liquibase:update_product_rule_sg_pp_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-71157
--comment: material_count_mismatch
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_pp_dc_mapping(input jsonb, jsonb, integer[], text, jsonb, integer, integer[]);
DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_pp_dc_mapping(input jsonb, jsonb, integer[], text, jsonb, integer, integer[]);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_rule_sg_pp_dc_mapping(input refcursor, jsonb, jsonb, integer[], text, jsonb, integer, integer[], text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
_query_ph text := '';
_query_sa text := '';
_count_query text:= '';
_insert_query text:= '';
_update_query text:= '';
_column_name text := '';
_column_value text := '';
_query_l0_name text := '';
_query_table_filters text := '';
_cols text := '';
_select_1 text := 'select 1 as success';
_channel text := inventory_smart.get_channel_from_input($3);

begin
select $2->>'l0_name' into _query_l0_name;
_query_l0_name = format('{"l0_name": %1$s}', _query_l0_name);

raise notice 'l0 query%',_query_l0_name; 

_query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
_query_sa := global.form_main_table_filters('store_attributes', $3);
_query_table_filters := global.form_table_query($6); 

    if $5 ilike 'store' then
        _column_name := 'default_store_groups, default_store_groups_selected ';
        _column_value := quote_literal($4::text)||','||quote_literal($8::text);
        _cols := concat('default_store_groups = array(select distinct unnest(array_cat(default_store_groups, ',quote_literal($4::text),'))), default_store_groups_selected = array(select distinct unnest(array_cat(default_store_groups_selected, ',quote_literal($8::text),')))');
       
    --raise notice 'under if condition';
    elsif $5 ilike 'dc' then
        _column_name := 'default_dcs';
        _column_value := quote_literal($4::text);
    	_cols := 'default_dcs = ''' || $4::text || ''''; 
        --raise notice 'under if condition';
    elsif $5 ilike 'rule' then
        _column_name := 'default_dcs';
        _column_value := quote_literal($4::text);
    	_cols := 'rule_code = ''' || $4::int4 || ''''; 
    else
        _column_name := 'default_product_profile';
        _column_value := quote_literal($4[1]::text);
    	_cols := concat('default_product_profile = ',$4[1]::text);
    end if;
    
   
   
    raise notice '%', _column_value;
 
    _count_query := '
		select jsonb_build_object(''record_count'', record_count , ''sku_count'', record_count) as count from (
		select count(distinct ph_code)  record_count
     	from (select *, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || ' and channel = '''||_channel||''') ph
     	left join (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||' and is_active = true and validity is not null) pmps 
     	using (product_code, l0_name)
     	left join (select * from "global".store_attributes_filter '|| _query_sa || ') saf
     	using (store_code,channel) 
     	'|| _query_table_filters ||'
    	) as x
     ;';
   
    raise notice '%', _count_query;

	_update_query := '
     update inventory_smart.ph_configuration_mapping psm
--  set '||_column_name||' = '''||_column_value ||''' , default_store_groups_selected = '''||$8::text||'''
	set '|| _cols   ||' , updated_by = '||$7||', updated_at = now() , upload_flag=''false''
     where (ph_code, channel) in (
     select ph_code, channel from (
     select *
     from (select *, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || ' and channel = '''||_channel||''') ph
     left join (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||' and is_active = true and validity is not null) pmps 
     using (product_code, l0_name)
     left join (select * from "global".store_attributes_filter '|| _query_sa || ') saf
     using (store_code,channel) 
     '|| _query_table_filters ||'
    ) as x
     );';

   raise notice '%', _update_query;

    _insert_query := '
    INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, '|| _column_name ||', created_by, updated_by, created_at)
    SELECT ph_code, channel, '|| _column_value||' , '||$7||', '||$7||', now()
    FROM (
         SELECT ph_code, channel
        FROM (
                select *, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || ' and channel = '''||_channel||'''
            ) ph
            LEFT JOIN (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||' and is_active = true and validity is not null) pmps 
                USING (product_code, l0_name)
            LEFT JOIN (select * from "global".store_attributes_filter '|| _query_sa || ') saf
                 using (store_code,channel) 
            '|| _query_table_filters ||'
        ) as x
    WHERE (ph_code, channel) NOT IN (SELECT ph_code, channel FROM inventory_smart.ph_configuration_mapping)
    ON CONFLICT DO NOTHING;
    ';
raise notice '%', _insert_query;
   
    if $9 ilike 'record_count' then
   		OPEN $1 FOR EXECUTE _count_query;
   		return $1;
   	else 
		execute _update_query;
		execute _insert_query;
		OPEN $1 FOR EXECUTE _select_1;
		return $1;
	end if;
end
$function$
;