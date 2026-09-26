--liquibase formatted sql
--changeset linu.nazil:sync_new_store_data_puma stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:sync_sp
--comment: initial changeset for sync_new_store_data
DROP PROCEDURE IF EXISTS public.sync_new_store_data();
CREATE OR REPLACE PROCEDURE public.sync_new_store_data()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
 		delete from
 		  global.new_store_data
 		where
 		  true;
 		INSERT INTO global.new_store_data  (
 		  store_code, store_name
 		)
 		SELECT
 		  x.store_code,
 		  x.store_name
 		FROM
 		  public.new_store_data x;
 	end
 $procedure$
;

