--liquibase formatted sql
--changeset abhishek.kohli@impactanalytics.co:eoh_boh stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39224
--comment: initial changeset for eoh_boh
create table plan_smart.eoh_boh 
(plan_code int4 primary key, 
fetched_at timestamptz ,
is_deleted bool default false);