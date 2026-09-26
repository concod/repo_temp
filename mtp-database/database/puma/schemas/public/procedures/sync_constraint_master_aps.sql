--liquibase formatted sql
--changeset liquibase:sync_constraint_master_aps runOnChange:true stripComments:false splitStatements:false context:DAT-825  labels:sync_constraint_master_aps
--comment: changeset for sync_constraint_master_aps
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_constraint_master_aps();
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_aps()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
  	declare
  	
  	_l0 text;
  	begin
	  	
	  	--drop table if exists public.aps_append_table_tmp;

		create table if not exists public.aps_append_table_tmp
			as 
		select aps.aps,aps.store_code,aps.product_code, paf.l0_name  
		from public.aps_append_table aps 
		join global.product_attributes_filter paf 
		on aps.product_code= paf.product_code
		;
	
		raise notice 'aps_append_table_tmp %', 'table_created';
	  	
	  	for _l0 in 
	  		select 
	  		  attribute_value 
	  		from 
	  		  global.product_attributes 
	  		where 
	  		  attribute_name = 'l0_name' 
	  		group by 
	  		  1 
  		  loop
	  		  update  inventory_smart.constraint_master cm
	  		  	 set aps = x.aps
	  		  	from (select * from public.aps_append_table_tmp where l0_name= _l0 ) x
	  		  	where  
	  		  		cm.store_code =x.store_code 
				and cm.product_code =x.product_code 
			 	and cm.l0_name =_l0;
  				raise notice 'l0_name %', _l0;
  		  end loop;
	    
 			drop table if exists public.aps_append_table_tmp;
 	 
  	end $procedure$
;