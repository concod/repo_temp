--liquibase formatted sql
--changeset liquibase:update_product_rule_sg_pp_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0_7 labels:MTP-41787,MTP-25762
--comment: MTP-41787,MTP-25762
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_pp_dc_mapping(input jsonb, jsonb, integer[], text, jsonb, integer, integer[]);
DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_pp_dc_mapping(input refcursor, jsonb, jsonb, integer[], text, jsonb, integer, integer[], text);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_rule_sg_pp_dc_mapping(input refcursor, jsonb, jsonb, integer[], text, jsonb, integer, integer[], text)
 RETURNS refcursor
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
_cols text := '';
_select_1 text := 'select 1 as success';
_count_query text;
_result jsonb;
_channel_str text;
_ph_data text;

begin
select $2->>'l0_name' into _query_l0_name;
_query_l0_name = format('{"l0_name": %1$s}', _query_l0_name);

raise notice 'l0 query%',_query_l0_name; 

_query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
_query_sa := global.form_main_table_filters('store_attributes', $3);
_query_table_filters := global.form_table_query($6); 
_query_table_filters := replace(_query_table_filters, 'WHERE', 'AND');

 --raise notice '%,', $7;

    if $5 ilike 'store' then
        _column_name := 'default_store_groups, default_store_groups_selected ';
        _column_value := quote_literal($4::text)||','||quote_literal($8::text);
        _cols := concat('default_store_groups = array(select distinct unnest(array_cat(default_store_groups, ',quote_literal($4::text),'))), default_store_groups_selected = array(select distinct unnest(array_cat(default_store_groups_selected, ',quote_literal($8::text),')))');
       
    --raise notice 'under if condition';
    elsif $5 ilike 'dc' then
        _column_name := 'default_dcs';
        _column_value := quote_literal($4::text);
    	_cols := 'default_dcs = ''' || $4::text || ''''; 
    else
        _column_name := 'default_product_profile';
        _column_value := quote_literal($4[1]::text);
    	_cols := concat('default_product_profile = ',$4[1]::text);
    end if;
    
   
   
    raise notice '%', _column_value;
   raise notice '_query_table_filters %', _query_table_filters;
    _channel_str = replace(replace(replace(jsonb_extract_path($3,'channel','0','values')::text,'[',''),']',''),'"','''');
    raise notice 'channel new is %', _channel_str;
   
   _ph_data := '
   	with ph_master_data as(
		select *, unnest(product_codes) product_code from inventory_smart.ph_master '|| _query_ph ||' and channel = '|| _channel_str ||'
		'||_query_table_filters||'
	 ),
	 product_codes as(
		select product_code from ph_master_data
	 )
	';

   if $9 ilike 'record_count' then 
   		_count_query = '
						'||_ph_data||'
						select jsonb_build_object(''record_count'', record_count , ''sku_count'', record_count) as count from (
select count(distinct ph_code)  record_count
     from (select * from ph_master_data) b
left join (select * from (
select * from (SELECT store_code  
FROM "global".store_attributes_filter s '|| _query_sa || ') s
left JOIN (
    SELECT product_code, store_code, l0_name 
    FROM global.product_mapping_product_store 
    '||_query_l0_name||'
	and product_code in (select * from product_codes)
    AND is_active = TRUE
) pmps USING(store_code)) a) c
using(product_code,l0_name))d';
    raise notice '%', _count_query;
   end if;
  
    _query_combine := '
	'||_ph_data||'
     update inventory_smart.ph_configuration_mapping psm
--  set '||_column_name||' = '''||_column_value ||''' , default_store_groups_selected = '''||$8::text||'''
	set '|| _cols   ||' , updated_by = '||$7||', updated_at = now() '||case when $5 ilike 'store' then ', upload_flag=''false''' else '' end ||'
     where (ph_code,channel) in (
     select ph_code,channel from (
     select *
     from (select * from ph_master_data) ph
     left join (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||' and product_code in (select * from product_codes) and is_active = true) pmps 
     using (product_code, l0_name)
     left join (select * from "global".store_attributes_filter '|| _query_sa || ') saf
     using (store_code,channel)
    ) as x
     );';
    raise notice '%', _query_combine;
   
   	if $9 ilike 'insert_update' then  
    		execute _query_combine;
    	end if; 
    _query_combine := '
	'||_ph_data||'
    INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, '|| _column_name ||', created_by, updated_by, created_at)
    SELECT ph_code, channel, '|| _column_value||' , '||$7||', '||$7||', now()
    FROM (
         SELECT ph_code, channel
        FROM (
            SELECT ph_code, ph.channel
            FROM (
                select * from ph_master_data
            ) ph
             LEFT JOIN (select product_code , store_code, l0_name from global.product_mapping_product_store '||_query_l0_name||' and product_code in (select product_code from product_codes) and is_active = true) pmps 
                USING (product_code, l0_name)
             LEFT JOIN (select * from "global".store_attributes_filter '|| _query_sa || ') saf
                 using (store_code,channel)
        ) as x
    ) x
    WHERE (ph_code, channel) NOT IN (SELECT ph_code, channel FROM inventory_smart.ph_configuration_mapping)
    ON CONFLICT DO NOTHING;
    ';
    raise notice '%', _query_combine;
   	
   	if $9 ilike 'record_count' then 
   		OPEN $1 FOR EXECUTE _count_query;
   		return $1;
   	else 
		execute _query_combine;
		OPEN $1 FOR EXECUTE _select_1;
		return $1;
	end if;
end
$function$
;