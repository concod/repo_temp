--liquibase formatted sql
--changeset nikhil.dhoot:oms_matrix_summary_save_and_finalize_article_size_loc runOnChange:true stripComments:false splitStatements:false context:MTP-91654 labels:MTP-91654_2
--comment: Added selected_linked_store_codes to the function

DROP FUNCTION IF EXISTS inventory_smart.oms_matrix_summary_save_and_finalize_article_size_loc(jsonb, text, _varchar);
DROP FUNCTION IF EXISTS inventory_smart.oms_matrix_summary_save_and_finalize_article_size_loc(jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.oms_matrix_summary_save_and_finalize_article_size_loc(modifications jsonb, user_id text, selected_linked_store_codes character varying[] DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

 
 	 
	declare
		v_recommended_orders_sql text:= '';
	    fiscal_week record;
	    style record;
	    l0 record;
	    l1 record;
	    l2 record;
	   	update_level text;
	    temp_ratio float;
		order_gen_type_enum TEXT[] := ARRAY['Recommended', 'edited', 'scenario', 'Edited', 'Scenario'];
 	 begin
    	SELECT modifications->0->>'update_level' INTO update_level;
	 	raise notice ' %',update_level;

	 	IF update_level= 'Week' then
	 	raise notice ' %',modifications->>'update_level';

	 	for fiscal_week in select * from jsonb_to_recordset(modifications) as (fiscal_timeperiod_id text, modified jsonb)
        loop
	        raise notice ' %',fiscal_week.modified;
			for style in select * from jsonb_to_recordset(fiscal_week.modified) as (l0 jsonb,name text)
            loop
	            IF style.l0->>'ratio' != '' then
				    update inventory_smart.oms_orders_recommended oorm
	                set order_quantity = ceil(roq_constrained::float* (style.l0->>'ratio')::float) , updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
						order_gen_type = 'Edited'
	                where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                and oorm.article::varchar = (style.l0->>'name')::varchar
		                and oorm.order_gen_type = ANY(order_gen_type_enum)
		                and oorm.order_status_id::int = 0
		                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));
				ELSIF style.l0->>'value' !='' THEN 

					update inventory_smart.oms_orders_recommended oorm
	                set order_quantity = ceil(((style.l0->>'value')::float /(select count(*) from inventory_smart.oms_orders_recommended oor where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                and oor.article::varchar = (style.l0->>'name')::varchar
		                and oor.order_gen_type = ANY(order_gen_type_enum)
		                and oor.order_status_id::int = 0
		                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oor.loc_code = ANY(selected_linked_store_codes))))::float)
						, updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
						order_gen_type = 'Edited'
	                where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                and oorm.article::varchar = (style.l0->>'name')::varchar
		                and oorm.order_gen_type = ANY(order_gen_type_enum)
		                and oorm.order_status_id::int = 0
		                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));     
				END IF;
               	for l1 in select * from jsonb_to_recordset((style.l0->>'l1')::jsonb) as (name text, l2 jsonb,ratio text,value text)
               	loop

	               	IF l1.ratio != '' THEN
		               	update inventory_smart.oms_orders_recommended oorm
	                    set order_quantity = ceil(roq_constrained::float*l1.ratio::float) , updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
							order_gen_type = 'Edited'
	                    where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
	                    				and oorm.article::varchar = (style.l0->>'name')::varchar
	                                    and oorm.size::varchar = l1.name
	                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
	                                    and oorm.order_status_id::int = 0
	                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));	
                    ELSIF l1.value !='' THEN 
						update inventory_smart.oms_orders_recommended oorm
	                    set order_quantity = ceil(((l1.value)::float /(select count(*) from inventory_smart.oms_orders_recommended oor where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
			                and oor.article::varchar = (style.l0->>'name')::varchar
			                and oor.size::varchar = l1.name
			                and oor.order_gen_type = ANY(order_gen_type_enum)
			                and oor.order_status_id::int = 0
			                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oor.loc_code = ANY(selected_linked_store_codes))))::float)
							, updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
							order_gen_type = 'Edited'
	                    where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
	                    				and oorm.article::varchar = (style.l0->>'name')::varchar
	                                    and oorm.size::varchar = l1.name
	                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
	                                    and oorm.order_status_id::int = 0
	                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes)); 
					END IF;
				
                    for l2 in select * from jsonb_to_recordset((l1.l2)::jsonb) as (name text, l2 jsonb,ratio text,value text)
               		loop
	               		IF l2.ratio != '' THEN
			               	update inventory_smart.oms_orders_recommended oorm
		                    set order_quantity = ceil(roq_constrained::float*l2.ratio::float) , updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
								order_gen_type = 'Edited'
		                    where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                    				and oorm.article::varchar = (style.l0->>'name')::varchar
		                                    and oorm.size::varchar = l1.name
		                                    and oorm.loc_code::varchar = l2.name
		                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
		                                    and oorm.order_status_id::int = 0
		                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));	
		                ELSIF l2.value !='' then
							update inventory_smart.oms_orders_recommended oorm
		                    set order_quantity = ceil(((l2.value)::float /(select count(*) from inventory_smart.oms_orders_recommended oor where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
				                and oor.article::varchar = (style.l0->>'name')::varchar
				                and oor.size::varchar = l1.name
				              	and oor.loc_code::varchar = l2.name
				                and oor.order_gen_type = ANY(order_gen_type_enum)
				                and oor.order_status_id::int = 0
				                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oor.loc_code = ANY(selected_linked_store_codes))))::float)
								, updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
								order_gen_type = 'Edited'
		                    where fiscal_year_week::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                    				and oorm.article::varchar = (style.l0->>'name')::varchar
		                                    and oorm.size::varchar = l1.name
		                                    and oorm.loc_code::varchar = l2.name
		                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
		                                    and oorm.order_status_id::int = 0
		                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));
						END IF;
                	end loop;
                end loop;  
            end loop;
           end loop;
			

    	else
    	for fiscal_week in select * from jsonb_to_recordset(modifications) as (fiscal_timeperiod_id text, modified jsonb)
        loop
	        raise notice ' %',fiscal_week.modified;
			for style in select * from jsonb_to_recordset(fiscal_week.modified) as (l0 jsonb,name text)
            loop
	            IF style.l0->>'ratio' != '' then
				    update inventory_smart.oms_orders_recommended oorm
	                set order_quantity = ceil(roq_constrained::float* (style.l0->>'ratio')::float) , updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
						order_gen_type = 'Edited'
	                where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                and oorm.article::varchar = (style.l0->>'name')::varchar
		                and oorm.order_gen_type = ANY(order_gen_type_enum)
		                and oorm.order_status_id::int = 0
		                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));
				ELSIF style.l0->>'value' !='' THEN 

					update inventory_smart.oms_orders_recommended oorm
	                set order_quantity =ceil(((style.l0->>'value')::float /(select count(*) from inventory_smart.oms_orders_recommended oor where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                and oor.article::varchar = (style.l0->>'name')::varchar
		                and oor.order_gen_type = ANY(order_gen_type_enum)
		                and oor.order_status_id::int = 0
		                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oor.loc_code = ANY(selected_linked_store_codes))))::float)
						, updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
						order_gen_type = 'Edited'
	                where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                and oorm.article::varchar = (style.l0->>'name')::varchar
		                and oorm.order_gen_type = ANY(order_gen_type_enum)
		                and oorm.order_status_id::int = 0
		                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));     
				END IF;
               	for l1 in select * from jsonb_to_recordset((style.l0->>'l1')::jsonb) as (name text, l2 jsonb,ratio text,value text)
               	loop

	               	IF l1.ratio != '' THEN
		               	update inventory_smart.oms_orders_recommended oorm
	                    set order_quantity = ceil(roq_constrained::float*l1.ratio::float) , updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
						order_gen_type = 'Edited'
	                    where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
	                    				and oorm.article::varchar = (style.l0->>'name')::varchar
	                                    and oorm.size::varchar = l1.name
	                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
	                                    and oorm.order_status_id::int = 0
	                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));	
                    ELSIF l1.value !='' THEN 
						update inventory_smart.oms_orders_recommended oorm
	                    set order_quantity = ceil(((l1.value)::float /(select count(*) from inventory_smart.oms_orders_recommended oor where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
			                and oor.article::varchar = (style.l0->>'name')::varchar
			                and oor.size::varchar = l1.name
			                and oor.order_gen_type = ANY(order_gen_type_enum)
			                and oor.order_status_id::int = 0
			                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oor.loc_code = ANY(selected_linked_store_codes))))::float)
							, updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
							order_gen_type = 'Edited'
	                    where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
	                    				and oorm.article::varchar = (style.l0->>'name')::varchar
	                                    and oorm.size::varchar = l1.name
	                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
	                                    and oorm.order_status_id::int = 0
	                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes)); 
					END IF;
				
                    for l2 in select * from jsonb_to_recordset((l1.l2)::jsonb) as (name text, l2 jsonb,ratio text,value text)
               		loop
	               		IF l2.ratio != '' THEN
			               	update inventory_smart.oms_orders_recommended oorm
		                    set order_quantity = ceil(roq_constrained::float*l2.ratio::float) , updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
								order_gen_type = 'Edited'
		                    where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                    				and oorm.article::varchar = (style.l0->>'name')::varchar
		                                    and oorm.size::varchar = l1.name
		                                    and oorm.loc_code::varchar = l2.name
		                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
		                                    and oorm.order_status_id::int = 0
		                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));	
		                ELSIF l2.value !='' then
							update inventory_smart.oms_orders_recommended oorm
		                    set order_quantity = ceil(((l2.value)::float /(select count(*) from inventory_smart.oms_orders_recommended oor where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
				                and oor.article::varchar = (style.l0->>'name')::varchar
				                and oor.size::varchar = l1.name
				              	and oor.loc_code::varchar = l2.name
				                and oor.order_gen_type = ANY(order_gen_type_enum)
				                and oor.order_status_id::int = 0
				                and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oor.loc_code = ANY(selected_linked_store_codes))))::float)
								, updated_by = user_id::int , updated_at = CURRENT_TIMESTAMP,
								order_gen_type = 'Edited'
		                    where fiscal_year_month::varchar = fiscal_week.fiscal_timeperiod_id::varchar
		                    				and oorm.article::varchar = (style.l0->>'name')::varchar
		                                    and oorm.size::varchar = l1.name
		                                    and oorm.loc_code::varchar = l2.name
		                                    and oorm.order_gen_type = ANY(order_gen_type_enum)
		                                    and oorm.order_status_id::int = 0
		                                    and (selected_linked_store_codes IS NULL OR array_length(selected_linked_store_codes, 1) IS NULL OR oorm.loc_code = ANY(selected_linked_store_codes));
						END IF;
                	end loop;
                end loop;  
            end loop;
           end loop;
			

	    END IF;
   
   
 	   
          
          end ;
          
 $function$
;
