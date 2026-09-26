--liquibase formatted sql
--changeset liquibase:update_constraints_time_based_single runOnChange:true stripComments:false splitStatements:false context:MTP-48841 table fixes labels:MTP-48841 table fixes
--comment: MTP-48841 table fixes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_constraints_time_based_single(jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_constraints_time_based_single(jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  records jsonb;
  record RECORD;
  record_row jsonb;
  my_cursor refcursor;
  product_code_value TEXT;
  channel_value text;
  stores jsonb;
  stores_data jsonb;
  _key text;
  _value text;
  update_query text := '';
  insert_query text := '';
  delete_query text := '';
  BEGIN
  raise notice '%', 'records ';

 for records in select * from jsonb_array_elements($1::jsonb) loop
	raise notice '%', records;
	product_code_value := (records ->>'product_code');
	channel_value := (records ->>'channel');
	stores_data := records -> 'stores';	
    RAISE NOTICE 'Processing store: % with product code: %, channel %', stores_data, product_code_value, channel_value;

	 OPEN my_cursor FOR SELECT * FROM jsonb_array_elements(stores_data);
  loop
    FETCH my_cursor INTO record_row;
    EXIT WHEN NOT FOUND;

	raise notice 'record_row%', record_row;
    RAISE NOTICE 'Processing store: % with product code: %', record_row->>'store_code', product_code_value;
   
   if record_row->>'action' = 'update' then
   		raise notice 'update is being performed';
   		update_query := 'UPDATE
                  inventory_smart.constraint_master 
		SET 
                  ' || 
                  CASE WHEN record_row->>'min' IS NOT NULL THEN 'min_stock = '''||(record_row->>'min')||''', ' ELSE '' END ||
                  CASE WHEN record_row->>'max' IS NOT NULL THEN 'max_stock = '''||(record_row->>'max')||''', ' ELSE '' END ||
                  CASE WHEN record_row->>'wos' IS NOT NULL THEN 'wos = '''||(record_row->>'wos')||''', ' ELSE '' END ||
                  'updated_at = now(), 
		  updated_by = '||$2||'
                WHERE 
                  product_code = '''||product_code_value||''' 
                  AND store_code = '''||(record_row->>'store_code')||''';';

		raise notice 'update query %', update_query;
		execute update_query;
	end if;
	if record_row->>'action' = 'insert' then
		insert_query := 
			'INSERT INTO inventory_smart.constraint_master 
            (mapping_code, l0_name, product_code, store_code, validity, channel, wos, min_stock, max_stock, created_at, created_by, updated_by)
	   SELECT t1.mapping_code,
       l0_name,
       product_code, 
       store_code,
       daterange(to_date('''||(record_row->>'start_date')||''', ''YYYY-MM-DD''), to_date('''||(record_row->>'end_date')||''', ''YYYY-MM-DD''), ''[)'') as validity,
       channel,
	   wos,
       min_stock,
       max_stock,
       now() as created_at,
       '||$2||' as created_by,
	   '||$2||' as updated_by
	FROM (
	with jsonb_data as (
   		SELECT 
           '''||product_code_value||''' as product_code, 
           '''||(record_row->>'store_code')||''' as store_code,
           '''||(record_row->>'min')||'''::numeric as min_stock,
		   '''||(record_row->>'max')||'''::numeric as max_stock,
		   '''||(record_row->>'wos')||'''::numeric as wos,
		   '''||(record_row->>'start_date')||''' as start_date,
		   '''||(record_row->>'end_date')||''' as end_date,
		   '''||channel_value||''' as channel
		)
	, mapping_data as (
		select mapping_code,
			l0_name,
			pmps.product_code,
			pmps.store_code
			from "global".product_mapping_product_store pmps where product_code = '''||product_code_value||''' and store_code = '''||(record_row->>'store_code')||'''
	)
		select jb.channel, jb.product_code, jb.store_code, jb.wos, jb.min_stock, jb.max_stock, md.mapping_code, md.l0_name from jsonb_data jb join mapping_data md using (product_code, store_code)
	)t1;
	';
	raise notice 'insert query %', insert_query;
	execute insert_query;
	end if;	
	
	if record_row->>'action' = 'delete' then
		raise notice 'record row in del %', record_row;	
		raise notice 'orig start_date %', product_code_value;
		raise notice 'store code %', record_row->>'store_code';
delete_query := 
	'DELETE 
		FROM 
		inventory_smart.constraint_master 
		WHERE product_code = '''|| product_code_value ||''' 
AND store_code = ''' || (record_row->>'store_code') || ''' AND lower(validity) = ''' || (record_row->>'original_start_date') || '''::date;';
	raise notice 'delete query %', delete_query;
	execute delete_query;

	end if;
  END LOOP;
 	CLOSE my_cursor;
  end loop;
	END;
$function$
;