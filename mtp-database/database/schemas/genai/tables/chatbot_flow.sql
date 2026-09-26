--liquibase formatted sql
--changeset biplab.malaklar@impactanalytics.co:chatbot_flow_enum stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: chatbot_flow table creation

drop type if exists genai."chatbot_flow" cascade;
create type genai."chatbot_flow" as enum('NAVIGATION', 'INSIGHTS');

--changeset akshay.jain@impactanalytics.co:chatbot_flow_enum stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: added new flow type
ALTER TYPE genai."chatbot_flow" ADD VALUE 'AGENT';