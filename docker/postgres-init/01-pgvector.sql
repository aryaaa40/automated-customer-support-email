-- Aktifkan pgvector di database utama dan buat database test (juga dengan pgvector).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE email_routing_test;
\connect email_routing_test
CREATE EXTENSION IF NOT EXISTS vector;
