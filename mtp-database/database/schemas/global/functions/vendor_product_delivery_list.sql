--liquibase formatted sql
--changeset liquibase:vendor_product_delivery_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_product_delivery_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.vendor_product_delivery_list(input refcursor, jsonb, jsonb, jsonb, jsonb, integer[], integer[], boolean);
CREATE OR REPLACE FUNCTION global.vendor_product_delivery_list(input refcursor, jsonb, jsonb, jsonb, jsonb, integer[], integer[], boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 
/*  
 * Function/Procedure name: global.vendor_product_delivery_list
 * Created by: Kailash Yadav
 * Created at: 07-Aug-2022
 * No of input parameter: 4
 * Arguments Description : 
 		$1: vendor master filter
  	 	$2: vendor sku mapping fields filter
  	 	$3: product attributes filter
  	 	$4: search and limit json
  	 	$5: store group list  
 * Purpose: This function been created to get the list of product_store_mapping based on vandor, store_group and product attributes  

 * Calling Statement:   
   select * from global.vendor_product_delivery_list(
  			'{"vendor_name": [{"operator": "in", "type": "list", "values": ["LUCENT JEWELERS INC"]}]}',
			'{"vendor_status": [], "preferred_status": []}',
			'{"l0_name": [], "l1_name": [], "l2_name": [], "l3_name": []}',
			'{"range": [], "sort": [], "search": [], "limit": {"limit": 10, "page": 1}}',
			'{"200","143"}'	
			);
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
   Gautam Baruah    15-Sep-2022     Made the function generic by returning refcursor and added condition to return count/records based on $8

 */
 
	declare
		_query_pa text := '';
		_query_pm text := '';
		_query_vm text := '';
		_query_vsku text := '';
		_query_sm text := '';
		_query_vpl text :='';
		_query_sku_map text := '';
		_key text;
		_value text;
		-- need to figure out dynamically for each column.
		_dt text := 'varchar';
		_filter text;
		_con text[];
		_list_values text;
		_where text = '';
		_combine_where text[];
		_attr_cols text[] := array['vendor_code', 'store_code']::text[];
		_query_combine text;
		_query_table_filters text := '';
		_sg_code_filter text :='';
		_lead_time_filter text :='';
		_final_query text := '';
		
		
	begin 
		
		_query_sku_map := 'SELECT * FROM global.vendor_sku_mapping' || (global.form_main_table_filters('vendor_sku_mapping', $3)); 
		
		_query_vm := 'SELECT * FROM global.vendor_master' || (global.form_main_table_filters('vendor_master', $2)); 
		

		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $4);
	
		_query_table_filters := global.form_table_query($5);
		
	if coalesce (array_length($6::int[],1),0) =0 then 
		_sg_code_filter ='1=1';
	else
		_sg_code_filter:= 'sg_code =any(''' || concat($6) || '''::int[])';
	
	end if;

	if coalesce (array_length($7::int[],1),0)=0 then 
		_lead_time_filter ='1=1';
	else
		_lead_time_filter:= 'x.lead_time_key::int  =any('''|| concat($7) ||'''::int[])';
	end if;
	
	_query_combine := 'With prod_attr as (
							select sg.sg_code,sg.store_code, paf.*
						from 
						(('||_query_pa||' ) paf 
						 join (
						 select * from (
						select sgm.sg_code as sg_code,sgm.store_code store_code, psm.product_code product_code 
						from global.store_groups_mapping sgm 
						join global.product_store_mapping psm
						on psm.store_code = sgm.store_code 
						where '||_sg_code_filter|| '
						) sg
						) sg 
					on sg.product_code =paf.product_code ) ),
						vendor_sku as 
							(select  distinct 
							vm.vendor_code, vm.vendor_name , 
							prod_attr.*,
							vpl.store_code ,
							saf.*,
							vpl.lead_time_variation::jsonb lead_time_variation, 
							vpl.lead_time::jsonb   lead_time
							from ('||_query_sku_map||') vsk 
							join prod_attr 
							on prod_attr.product_code = vsk.product_code 
							join ('||_query_vm||') vm
							on vsk.vendor_code =vm.vendor_code 
							join 
						(select distinct b.vendor_code ,b.product_code ,b.store_code ,b.lead_time ,b.lead_time_variation  
						from (
						select  jsonb_object_keys((lead_time) )::text lead_time_key,
							vendor_code,product_code,store_code, lead_time_variation  
							from global.vendor_product_location) x
							join  global.vendor_product_location b
							on x.vendor_code =b.vendor_code 
							and x.product_code =b.product_code 
							and x.store_code=b.store_code 
							where '||_lead_time_filter|| '
							 ) vpl
								on vm.vendor_code =vpl.vendor_code 
								and vsk.product_code =vpl.product_code
								and prod_attr.store_code = vpl.store_code 
								join global.store_attributes_filter saf 
								on saf.store_code = prod_attr.store_code
								)
								select * from vendor_sku' ||
								_query_table_filters;
						
						raise notice '_query_combine%',_query_combine;
	
	if $8 is false then 
		_final_query := _query_combine;
	else
		_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
	end if;		

	open $1 for execute _final_query;
	RETURN $1;
	
	
		
 end $function$
;
