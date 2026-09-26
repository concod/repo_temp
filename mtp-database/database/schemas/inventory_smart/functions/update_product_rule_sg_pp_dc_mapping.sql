--liquibase formatted sql
--changeset anshuman:update_product_rule_sg_pp_dc_mapping stripComments:false splitStatements:false runOnChange:true context:Release_3_0_3 labels: MTP-28858
--comment: MTP-28858
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
_channel text[] := inventory_smart.get_channel_from_input_new($3);
_channel_where_condition text := '';
_select_1 text := 'select 1 as success';
begin
select $2->>'l0_name' into _query_l0_name;
_query_l0_name = format('{"l0_name": %1$s}', _query_l0_name);

raise notice 'l0 query%',_query_l0_name; 

_query_l0_name := inventory_smart.form_main_table_filters('ph_master', _query_l0_name::jsonb);
_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
_query_sa := global.form_main_table_filters('store_attributes', $3);
_query_table_filters := global.form_table_query($6); 
if cardinality(_channel) = 0 then
raise notice 'no channel passs %,',_channel;
	_channel_where_condition = ' ';
else
	_channel_where_condition = ' and channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
end if;

 --raise notice '%,', $7;

	if $5 ilike 'store' then
		_column_name := 'default_store_groups';
		_column_value := $4::text;
	--raise notice 'under if condition';
	elsif $5 ilike 'dc' then
		_column_name := 'default_dcs';
		_column_value := $4::text;
	else
		_column_name := 'default_product_profile';
		_column_value := $4[1]::text;
	end if;
	
	raise notice '%', _column_value;
	_query_combine := '
	 update inventory_smart.ph_configuration_mapping psm
	 set '||_column_name||' = '''||_column_value ||''' , updated_by = '||$7||', updated_at = now()
	 where (ph_code, channel) in (
	 select ph_code, channel from (
	 select *
	 from (select *, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || _channel_where_condition ||') ph
	 '|| _query_table_filters ||'
	) as x
	 );';
	raise notice '%', _query_combine;
	execute _query_combine;
    _query_combine := '
    INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel, '|| _column_name ||', created_by, created_at)
    SELECT ph_code, channel, '''|| _column_value ||''', '||$7||', now()
    FROM (
         SELECT ph_code, channel
        FROM (
            SELECT ph_code, ph.channel
            FROM (
                select *, unnest(product_codes) product_code from inventory_smart.ph_master ' || _query_ph || _channel_where_condition ||'
            ) ph
            '|| _query_table_filters ||'
        ) as x
    ) x
    WHERE (ph_code, channel) NOT IN (SELECT ph_code, channel FROM inventory_smart.ph_configuration_mapping)
    ON CONFLICT DO NOTHING;
    ';
    raise notice '%', _query_combine;
    execute _query_combine;
    OPEN $1 FOR EXECUTE _select_1;
	return $1;
end
$function$
;

 --rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1;