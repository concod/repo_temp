--liquibase formatted sql
--changeset shreyan.haldankar@impactanalytics.co:store_groups_list_aggregation_download runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-36657
--comment: initial changeset for store_groups_list_aggregation_download
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_groups_list_aggregation_download(input refcursor, jsonb, jsonb, jsonb, text[]);
CREATE OR REPLACE FUNCTION global.store_groups_list_aggregation_download(input refcursor, jsonb, jsonb, jsonb, text[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare 
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_main_filter_cnt int := 0;
	_attr_filter_cnt int := 0;
	_filter_con text := ' ';
	_keys text[] := array['created_by', 'updated_by']::text[];
	_vals text[] := array[$3,$4]::text[];
	store_attribute_filter_array text[] := $5;
	store_attribute_filter_parameters text := '';
	store_attribute_filter_final_select text := '';
	val text := '';
	begin
		select count(*) into _main_filter_cnt from jsonb_each_text($2);
		select count(*) into _attr_filter_cnt from jsonb_each_text($3);
	
		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;
		
		foreach val in array store_attribute_filter_array loop
			store_attribute_filter_final_select := store_attribute_filter_final_select || 'extra.' || val || ' AS ' || val || ', ';
			store_attribute_filter_parameters := store_attribute_filter_parameters || val || ', ';
		end loop;
		
		store_attribute_filter_final_select := LEFT(store_attribute_filter_final_select, LENGTH(store_attribute_filter_final_select) - 2 );
		store_attribute_filter_parameters := LEFT(store_attribute_filter_parameters, LENGTH(store_attribute_filter_parameters) - 2);
		
		raise notice '%,%', store_attribute_filter_final_select, store_attribute_filter_parameters;
		
		_query_table_filters := global.form_table_query($4);
		if _main_filter_cnt = 0 and _attr_filter_cnt != 0 then
			_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
			_filter_con := ''|| _query_sa || '';
		elseif _main_filter_cnt != 0 and _attr_filter_cnt = 0 then 
			_query_sm := 'SELECT * FROM global.store_master' ||  (global.form_main_table_filters('store_master', $2));
			_filter_con := ''|| _query_sm ||') ';
		elseif _main_filter_cnt != 0 and _attr_filter_cnt != 0 then
			_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $2));
			_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
			_filter_con := 'SELECT sgm.sg_code, * FROM (' || _query_sm || ') A JOIN (' || _query_sa || ') B on A.store_code = B.store_code ';
		end if;
		raise notice 'filter con %',_filter_con;	
	
		_query_combine := 'SELECT * FROM (
			select sg.name as name,
 				special_classification, 
 				store_code, 
				store_name, 
				created_at, 	
				updated_at, 
				um.name as created_by, 
				umup.name as updated_by ,
				extra.channel as channel, 
				' || store_attribute_filter_final_select || '
	 		from
		   (
		      select
		         sgm.* 
		      from
		         (
		            select
		               sgm.sg_code,
		               sgm.store_code,
		               channel 
		            from
		               (
		                  ' || _filter_con || '
		               )
		               x 
		               join
		                  "global".store_groups_mapping sgm 
		                  on x.store_code = sgm.store_code 
		            group by
		               sgm.sg_code,
		               sgm.store_code,
		               channel
		         ) f 
		         left join
		            (
		               select
		                  sg_code,
		                  ' || store_attribute_filter_parameters || ',
		                  channel 
		               from
		                  "global".store_groups_mapping 
		                  join
		                     (
		                        select
		                           ' || store_attribute_filter_parameters || ',
		                           channel 
		                        from
		                           global.store_attributes_filter 
		                        where
		                           active
		                     )
		                     saf using (store_code) 
		               where
		                  sg_code is not null 
		               group by
		                  sg_code,
		                  '|| store_attribute_filter_parameters ||',
		                  channel 
		            )
		            sgm 
		            on f.sg_code = sgm.sg_code 
		            and f.store_code = sgm.store_code
		   ) extra 
		   join
		      global.store_groups sg using(sg_code) 
		      left join
		         (
		            select
		               user_code,
		               name 
		            from
		               "global".user_master um 
		            where
		               (
		                  um.is_deleted::bool = false::bool
		               )
		         )
		         um 
		         on created_by = um.user_code 
		         left join
		            (
		               select
		                  user_code,
		                  name 
		               from
		                  "global".user_master um 
		               where
		                  (
		                     um.is_deleted::bool = false::bool
		                  )
		            )
		            umup 
		            on updated_by = umup.user_code

) X  '|| _query_table_filters ||'';
		raise notice '%', _query_combine;
		open $1 for execute _query_combine;
		return $1;
							
end $function$
;