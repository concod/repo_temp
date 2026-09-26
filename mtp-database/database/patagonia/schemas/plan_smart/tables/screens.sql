--liquibase formatted sql
--changeset devadharshini.ms@impactanalytics.co:screens stripComments:false splitStatements:false context:Release_1_0 labels:mtp-100486
--comment: initial changeset for plansmart screens
CREATE TABLE plan_smart.screens (
	screen_id INT PRIMARY KEY,
    screen_name VARCHAR(255) NOT NULL
);