-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: contabil
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `contas`
--

DROP TABLE IF EXISTS `contas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `natureza` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel` int NOT NULL,
  `grupo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativa` tinyint(1) NOT NULL DEFAULT '1',
  `conta_pai_id` int DEFAULT NULL,
  `empresa_id` int NOT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contas_codigo_empresa_id_key` (`codigo`,`empresa_id`),
  KEY `contas_empresa_id_idx` (`empresa_id`),
  KEY `contas_conta_pai_id_idx` (`conta_pai_id`),
  CONSTRAINT `contas_conta_pai_id_fkey` FOREIGN KEY (`conta_pai_id`) REFERENCES `contas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `contas_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contas`
--

LOCK TABLES `contas` WRITE;
/*!40000 ALTER TABLE `contas` DISABLE KEYS */;
INSERT INTO `contas` VALUES (1,'1','ATIVO','S','D',1,'ATIVO',1,NULL,1,'2026-08-19 14:45:42.038','2026-08-19 14:45:42.038'),(2,'1.1','ATIVO CIRCULANTE','S','D',2,'ATIVO',1,1,1,'2026-08-19 14:45:42.044','2026-08-19 14:45:42.044'),(3,'1.1.1','Caixa e Equivalentes de Caixa','S','D',3,'ATIVO',1,2,1,'2026-08-19 14:45:42.047','2026-08-19 14:45:42.047'),(4,'1.1.1.01','Caixa','S','D',4,'ATIVO',1,3,1,'2026-08-19 14:45:42.051','2026-08-19 14:45:42.051'),(5,'1.1.1.01.001','Caixa Geral','A','D',5,'ATIVO',1,4,1,'2026-08-19 14:45:42.054','2026-08-19 14:45:42.054'),(6,'1.1.1.02','Bancos Conta Movimento','S','D',4,'ATIVO',1,3,1,'2026-08-19 14:45:42.058','2026-08-19 14:45:42.058'),(7,'1.1.1.02.001','Banco do Brasil','A','D',5,'ATIVO',0,6,1,'2026-08-19 14:45:42.061','2026-08-19 18:48:14.894'),(8,'1.1.1.02.002','Itaú','A','D',5,'ATIVO',1,6,1,'2026-08-19 14:45:42.065','2026-08-19 14:45:42.065'),(9,'1.1.1.03','Aplicações Financeiras','S','D',4,'ATIVO',1,3,1,'2026-08-19 14:45:42.068','2026-08-19 14:45:42.068'),(10,'1.1.1.03.001','Aplicações de Liquidez Imediata','A','D',5,'ATIVO',1,9,1,'2026-08-19 14:45:42.073','2026-08-19 14:45:42.073'),(11,'1.1.2','Clientes e Contas a Receber','S','D',3,'ATIVO',1,2,1,'2026-08-19 14:45:42.077','2026-08-19 14:45:42.077'),(12,'1.1.2.01','Duplicatas a Receber','A','D',4,'ATIVO',1,11,1,'2026-08-19 14:45:42.081','2026-08-19 14:45:42.081'),(13,'1.1.2.02','(-) Provisão p/ Devedores Duvidosos','A','D',4,'ATIVO',1,11,1,'2026-08-19 14:45:42.084','2026-08-19 14:45:42.084'),(14,'1.1.3','Estoques','S','D',3,'ATIVO',1,2,1,'2026-08-19 14:45:42.088','2026-08-19 14:45:42.088'),(15,'1.1.3.01','Mercadorias para Revenda','A','D',4,'ATIVO',1,14,1,'2026-08-19 14:45:42.093','2026-08-19 14:45:42.093'),(16,'1.1.3.02','Matérias-Primas','A','D',4,'ATIVO',1,14,1,'2026-08-19 14:45:42.097','2026-08-19 14:45:42.097'),(17,'1.1.4','Impostos a Recuperar','S','D',3,'ATIVO',1,2,1,'2026-08-19 14:45:42.101','2026-08-19 14:45:42.101'),(18,'1.1.4.01','ICMS a Recuperar','A','D',4,'ATIVO',1,17,1,'2026-08-19 14:45:42.104','2026-08-19 14:45:42.104'),(19,'1.1.4.02','PIS a Recuperar','A','D',4,'ATIVO',1,17,1,'2026-08-19 14:45:42.109','2026-08-19 14:45:42.109'),(20,'1.1.4.03','COFINS a Recuperar','A','D',4,'ATIVO',1,17,1,'2026-08-19 14:45:42.112','2026-08-19 14:45:42.112'),(21,'1.1.5','Despesas Antecipadas','S','D',3,'ATIVO',1,2,1,'2026-08-19 14:45:42.116','2026-08-19 14:45:42.116'),(22,'1.1.5.01','Seguros a Apropriar','A','D',4,'ATIVO',1,21,1,'2026-08-19 14:45:42.121','2026-08-19 14:45:42.121'),(23,'1.2','ATIVO NÃO CIRCULANTE','S','D',2,'ATIVO',1,1,1,'2026-08-19 14:45:42.126','2026-08-19 14:45:42.126'),(24,'1.2.1','Realizável a Longo Prazo','S','D',3,'ATIVO',1,23,1,'2026-08-19 14:45:42.130','2026-08-19 14:45:42.130'),(25,'1.2.1.01','Depósitos Judiciais','A','D',4,'ATIVO',1,24,1,'2026-08-19 14:45:42.133','2026-08-19 14:45:42.133'),(26,'1.2.2','Investimentos','S','D',3,'ATIVO',1,23,1,'2026-08-19 14:45:42.136','2026-08-19 14:45:42.136'),(27,'1.2.2.01','Participações Societárias','A','D',4,'ATIVO',1,26,1,'2026-08-19 14:45:42.140','2026-08-19 14:45:42.140'),(28,'1.2.3','Imobilizado','S','D',3,'ATIVO',1,23,1,'2026-08-19 14:45:42.143','2026-08-19 14:45:42.143'),(29,'1.2.3.01','Imóveis','A','D',4,'ATIVO',1,28,1,'2026-08-19 14:45:42.146','2026-08-19 14:45:42.146'),(30,'1.2.3.02','Veículos','A','D',4,'ATIVO',1,28,1,'2026-08-19 14:45:42.149','2026-08-19 14:45:42.149'),(31,'1.2.3.03','Máquinas e Equipamentos','A','D',4,'ATIVO',1,28,1,'2026-08-19 14:45:42.152','2026-08-19 14:45:42.152'),(32,'1.2.3.04','Móveis e Utensílios','A','D',4,'ATIVO',1,28,1,'2026-08-19 14:45:42.156','2026-08-19 14:45:42.156'),(33,'1.2.3.05','Computadores e Periféricos','A','D',4,'ATIVO',1,28,1,'2026-08-19 14:45:42.159','2026-08-19 14:45:42.159'),(34,'1.2.3.90','(-) Depreciação Acumulada','A','D',4,'ATIVO',1,28,1,'2026-08-19 14:45:42.162','2026-08-19 14:45:42.162'),(35,'1.2.4','Intangível','S','D',3,'ATIVO',1,23,1,'2026-08-19 14:45:42.165','2026-08-19 14:45:42.165'),(36,'1.2.4.01','Softwares','A','D',4,'ATIVO',1,35,1,'2026-08-19 14:45:42.168','2026-08-19 14:45:42.168'),(37,'1.2.4.02','Marcas e Patentes','A','D',4,'ATIVO',1,35,1,'2026-08-19 14:45:42.172','2026-08-19 14:45:42.172'),(38,'1.2.4.90','(-) Amortização Acumulada','A','D',4,'ATIVO',1,35,1,'2026-08-19 14:45:42.176','2026-08-19 14:45:42.176'),(39,'2','PASSIVO','S','C',1,'PASSIVO',1,NULL,1,'2026-08-19 14:45:42.179','2026-08-19 14:45:42.179'),(40,'2.1','PASSIVO CIRCULANTE','S','C',2,'PASSIVO',1,39,1,'2026-08-19 14:45:42.182','2026-08-19 14:45:42.182'),(41,'2.1.1','Fornecedores','S','C',3,'PASSIVO',1,40,1,'2026-08-19 14:45:42.186','2026-08-19 14:45:42.186'),(42,'2.1.1.01','Fornecedores Nacionais','A','C',4,'PASSIVO',1,41,1,'2026-08-19 14:45:42.191','2026-08-19 14:45:42.191'),(43,'2.1.1.02','Fornecedores Estrangeiros','A','C',4,'PASSIVO',1,41,1,'2026-08-19 14:45:42.195','2026-08-19 14:45:42.195'),(44,'2.1.2','Obrigações Trabalhistas','S','C',3,'PASSIVO',1,40,1,'2026-08-19 14:45:42.199','2026-08-19 14:45:42.199'),(45,'2.1.2.01','Salários a Pagar','A','C',4,'PASSIVO',1,44,1,'2026-08-19 14:45:42.209','2026-08-19 14:45:42.209'),(46,'2.1.2.02','FGTS a Recolher','A','C',4,'PASSIVO',1,44,1,'2026-08-19 14:45:42.215','2026-08-19 14:45:42.215'),(47,'2.1.2.03','INSS a Recolher','A','C',4,'PASSIVO',1,44,1,'2026-08-19 14:45:42.218','2026-08-19 14:45:42.218'),(48,'2.1.2.04','IRRF a Recolher','A','C',4,'PASSIVO',1,44,1,'2026-08-19 14:45:42.223','2026-08-19 14:45:42.223'),(49,'2.1.3','Obrigações Tributárias','S','C',3,'PASSIVO',1,40,1,'2026-08-19 14:45:42.227','2026-08-19 14:45:42.227'),(50,'2.1.3.01','ICMS a Recolher','A','C',4,'PASSIVO',1,49,1,'2026-08-19 14:45:42.231','2026-08-19 14:45:42.231'),(51,'2.1.3.02','PIS a Recolher','A','C',4,'PASSIVO',1,49,1,'2026-08-19 14:45:42.234','2026-08-19 14:45:42.234'),(52,'2.1.3.03','COFINS a Recolher','A','C',4,'PASSIVO',1,49,1,'2026-08-19 14:45:42.237','2026-08-19 14:45:42.237'),(53,'2.1.3.04','ISS a Recolher','A','C',4,'PASSIVO',1,49,1,'2026-08-19 14:45:42.241','2026-08-19 14:45:42.241'),(54,'2.1.3.05','IRPJ a Recolher','A','C',4,'PASSIVO',1,49,1,'2026-08-19 14:45:42.244','2026-08-19 14:45:42.244'),(55,'2.1.3.06','CSLL a Recolher','A','C',4,'PASSIVO',1,49,1,'2026-08-19 14:45:42.247','2026-08-19 14:45:42.247'),(56,'2.1.4','Empréstimos e Financiamentos CP','S','C',3,'PASSIVO',1,40,1,'2026-08-19 14:45:42.250','2026-08-19 14:45:42.250'),(57,'2.1.4.01','Empréstimos Bancários','A','C',4,'PASSIVO',1,56,1,'2026-08-19 14:45:42.253','2026-08-19 14:45:42.253'),(58,'2.2','PASSIVO NÃO CIRCULANTE','S','C',2,'PASSIVO',1,39,1,'2026-08-19 14:45:42.261','2026-08-19 14:45:42.261'),(59,'2.2.1','Empréstimos e Financiamentos LP','S','C',3,'PASSIVO',1,58,1,'2026-08-19 14:45:42.264','2026-08-19 14:45:42.264'),(60,'2.2.1.01','Financiamentos Bancários LP','A','C',4,'PASSIVO',1,59,1,'2026-08-19 14:45:42.267','2026-08-19 14:45:42.267'),(61,'2.2.2','Provisões','S','C',3,'PASSIVO',1,58,1,'2026-08-19 14:45:42.270','2026-08-19 14:45:42.270'),(62,'2.2.2.01','Provisão p/ Contingências','A','C',4,'PASSIVO',1,61,1,'2026-08-19 14:45:42.273','2026-08-19 14:45:42.273'),(63,'2.3','PATRIMÔNIO LÍQUIDO','S','C',2,'PL',1,39,1,'2026-08-19 14:45:42.277','2026-08-19 14:45:42.277'),(64,'2.3.1','Capital Social','S','C',3,'PL',1,63,1,'2026-08-19 14:45:42.280','2026-08-19 14:45:42.280'),(65,'2.3.1.01','Capital Social Subscrito','A','C',4,'PL',1,64,1,'2026-08-19 14:45:42.283','2026-08-19 14:45:42.283'),(66,'2.3.1.02','(-) Capital a Integralizar','A','C',4,'PL',1,64,1,'2026-08-19 14:45:42.286','2026-08-19 14:45:42.286'),(67,'2.3.2','Reservas de Capital','S','C',3,'PL',1,63,1,'2026-08-19 14:45:42.289','2026-08-19 14:45:42.289'),(68,'2.3.2.01','Ágio na Emissão de Ações','A','C',4,'PL',1,67,1,'2026-08-19 14:45:42.293','2026-08-19 14:45:42.293'),(69,'2.3.3','Reservas de Lucros','S','C',3,'PL',1,63,1,'2026-08-19 14:45:42.296','2026-08-19 14:45:42.296'),(70,'2.3.3.01','Reserva Legal','A','C',4,'PL',1,69,1,'2026-08-19 14:45:42.299','2026-08-19 14:45:42.299'),(71,'2.3.3.02','Reserva Estatutária','A','C',4,'PL',1,69,1,'2026-08-19 14:45:42.303','2026-08-19 14:45:42.303'),(72,'2.3.4','Lucros/Prejuízos Acumulados','S','C',3,'PL',1,63,1,'2026-08-19 14:45:42.306','2026-08-19 14:45:42.306'),(73,'2.3.4.01','Lucros Acumulados','A','C',4,'PL',1,72,1,'2026-08-19 14:45:42.311','2026-08-19 14:45:42.311'),(74,'2.3.4.02','(-) Prejuízos Acumulados','A','C',4,'PL',1,72,1,'2026-08-19 14:45:42.315','2026-08-19 14:45:42.315'),(75,'3','RECEITAS','S','C',1,'RECEITA',1,NULL,1,'2026-08-19 14:45:42.319','2026-08-19 14:45:42.319'),(76,'3.1','Receita Operacional Bruta','S','C',2,'RECEITA',1,75,1,'2026-08-19 14:45:42.322','2026-08-19 14:45:42.322'),(77,'3.1.1','Receita de Vendas de Mercadorias','A','C',3,'RECEITA',1,76,1,'2026-08-19 14:45:42.326','2026-08-19 14:45:42.326'),(78,'3.1.2','Receita de Prestação de Serviços','S','C',3,'RECEITA',1,76,1,'2026-08-19 14:45:42.329','2026-08-19 18:19:57.420'),(79,'3.2','(-) Deduções da Receita','S','D',2,'RECEITA',1,75,1,'2026-08-19 14:45:42.332','2026-08-19 14:45:42.332'),(80,'3.2.1','(-) Devoluções de Vendas','S','D',3,'RECEITA',1,79,1,'2026-08-19 14:45:42.335','2026-08-19 18:44:04.195'),(81,'3.2.2','(-) Descontos Incondicionais','A','D',3,'RECEITA',1,79,1,'2026-08-19 14:45:42.338','2026-08-19 14:45:42.338'),(82,'3.2.3','(-) ICMS s/ Vendas','A','D',3,'RECEITA',1,79,1,'2026-08-19 14:45:42.342','2026-08-19 14:45:42.342'),(83,'3.2.4','(-) PIS s/ Faturamento','A','D',3,'RECEITA',1,79,1,'2026-08-19 14:45:42.346','2026-08-19 14:45:42.346'),(84,'3.2.5','(-) COFINS s/ Faturamento','A','D',3,'RECEITA',1,79,1,'2026-08-19 14:45:42.349','2026-08-19 14:45:42.349'),(85,'3.2.6','(-) ISS s/ Serviços','S','D',3,'RECEITA',1,79,1,'2026-08-19 14:45:42.352','2026-08-19 18:42:30.652'),(86,'3.3','Receitas Financeiras','S','C',2,'RECEITA',1,75,1,'2026-08-19 14:45:42.355','2026-08-19 14:45:42.355'),(87,'3.3.1','Juros Ativos','A','C',3,'RECEITA',1,86,1,'2026-08-19 14:45:42.360','2026-08-19 14:45:42.360'),(88,'3.3.2','Rendimentos de Aplicações','A','C',3,'RECEITA',1,86,1,'2026-08-19 14:45:42.363','2026-08-19 14:45:42.363'),(89,'4','CUSTOS E DESPESAS','S','D',1,'DESPESA',1,NULL,1,'2026-08-19 14:45:42.366','2026-08-19 14:45:42.366'),(90,'4.1','Custo das Mercadorias Vendidas (CMV)','S','D',2,'DESPESA',1,89,1,'2026-08-19 14:45:42.369','2026-08-19 14:45:42.369'),(91,'4.1.1','CMV — Mercadorias','A','D',3,'DESPESA',1,90,1,'2026-08-19 14:45:42.373','2026-08-19 14:45:42.373'),(92,'4.2','Despesas Operacionais','S','D',2,'DESPESA',1,89,1,'2026-08-19 14:45:42.377','2026-08-19 14:45:42.377'),(93,'4.2.1','Despesas com Pessoal','S','D',3,'DESPESA',1,92,1,'2026-08-19 14:45:42.380','2026-08-19 14:45:42.380'),(94,'4.2.1.01','Salários e Ordenados','A','D',4,'DESPESA',1,93,1,'2026-08-19 14:45:42.383','2026-08-19 14:45:42.383'),(95,'4.2.1.02','Férias','A','D',4,'DESPESA',1,93,1,'2026-08-19 14:45:42.386','2026-08-19 14:45:42.386'),(96,'4.2.1.03','13º Salário','A','D',4,'DESPESA',1,93,1,'2026-08-19 14:45:42.390','2026-08-19 14:45:42.390'),(97,'4.2.1.04','FGTS','A','D',4,'DESPESA',1,93,1,'2026-08-19 14:45:42.393','2026-08-19 14:45:42.393'),(98,'4.2.1.05','INSS Patronal','A','D',4,'DESPESA',1,93,1,'2026-08-19 14:45:42.396','2026-08-19 14:45:42.396'),(99,'4.2.2','Despesas Administrativas','S','D',3,'DESPESA',1,92,1,'2026-08-19 14:45:42.399','2026-08-19 14:45:42.399'),(100,'4.2.2.01','Aluguel','A','D',4,'DESPESA',1,99,1,'2026-08-19 14:45:42.402','2026-08-19 14:45:42.402'),(101,'4.2.2.02','Energia Elétrica','A','D',4,'DESPESA',1,99,1,'2026-08-19 14:45:42.406','2026-08-19 14:45:42.406'),(102,'4.2.2.03','Água e Esgoto','A','D',4,'DESPESA',1,99,1,'2026-08-19 14:45:42.409','2026-08-19 14:45:42.409'),(103,'4.2.2.04','Telefone e Internet','S','D',4,'DESPESA',1,99,1,'2026-08-19 14:45:42.412','2026-08-19 18:47:13.621'),(104,'4.2.2.05','Material de Escritório','A','D',4,'DESPESA',1,99,1,'2026-08-19 14:45:42.415','2026-08-19 14:45:42.415'),(105,'4.2.2.06','Depreciação','A','D',4,'DESPESA',1,99,1,'2026-08-19 14:45:42.418','2026-08-19 14:45:42.418'),(106,'4.2.3','Despesas Financeiras','S','D',3,'DESPESA',1,92,1,'2026-08-19 14:45:42.421','2026-08-19 18:41:31.792'),(107,'4.2.3.01','Juros Passivos','S','D',4,'DESPESA',1,106,1,'2026-08-19 14:45:42.424','2026-08-19 18:42:42.827'),(108,'4.2.3.02','Tarifas Bancárias','A','D',4,'DESPESA',1,106,1,'2026-08-19 14:45:42.428','2026-08-19 14:45:42.428'),(109,'4.2.3.03','IOF','A','D',4,'DESPESA',1,106,1,'2026-08-19 14:45:42.431','2026-08-19 14:45:42.431'),(111,'1.1.1.02.003','nubanc','A','D',5,'ATIVO',1,6,1,'2026-08-19 16:38:05.126','2026-08-19 16:38:05.126'),(112,'1.1.1.02.004','C6 banc','A','D',5,'ATIVO',1,6,1,'2026-08-19 16:39:00.217','2026-08-19 16:39:00.217'),(113,'1.1.1.03.002','poupanca itau','A','D',5,'ATIVO',1,9,1,'2026-08-19 17:56:56.163','2026-08-19 17:56:56.163'),(114,'3.1.2.01','recebimento vendas de site','S','C',4,'RECEITA',1,78,1,'2026-08-19 17:59:55.701','2026-08-19 18:21:04.290'),(120,'3.1.2.01.001','vendas em tiktok','A','C',5,'RECEITA',1,114,1,'2026-08-19 18:12:45.826','2026-08-19 18:21:21.105'),(122,'4.2.2.07','veiculos','S','D',4,'DESPESA',1,99,1,'2026-08-19 18:26:22.424','2026-08-19 18:40:17.915'),(123,'4.2.2.07.001','combustiveis','A','D',5,'DESPESA',1,122,1,'2026-08-19 18:27:23.362','2026-08-19 18:40:17.922'),(124,'4.2.2.04.001','vivo','A','D',5,'DESPESA',1,103,1,'2026-08-19 18:47:13.597','2026-08-19 18:47:13.621'),(125,'1.1.1.02.005','mercado pago pdv6','A','D',5,'ATIVO',1,6,1,'2026-08-19 18:48:48.484','2026-08-19 18:48:48.484'),(126,'1.1.1.02.006','mercado pago cpf sa','A','D',5,'ATIVO',1,6,1,'2026-08-19 18:49:17.542','2026-08-19 18:49:17.542'),(127,'1.1.1.02.007','caiuxa economica federal','A','D',5,'ATIVO',1,6,1,'2026-08-19 18:54:38.736','2026-08-19 18:54:38.736'),(128,'1.1.1.02.008','alelo vale alimentação','A','D',5,'ATIVO',1,6,1,'2026-08-19 19:06:31.904','2026-08-19 19:06:31.904'),(129,'3.1.3','receita de vale alimentacao','S','C',3,'RECEITA',1,76,1,'2026-08-19 19:15:28.141','2026-08-19 19:32:58.269'),(130,'3.1.3.01','receitas alelo','S','C',4,'RECEITA',1,129,1,'2026-08-19 19:16:01.369','2026-08-19 19:35:21.927'),(131,'3.1.3.01.001','alelo','A','C',5,'RECEITA',1,130,1,'2026-08-19 19:34:23.161','2026-08-19 19:35:34.896'),(132,'4.2.2.07.002','licenciamento','A','D',5,'DESPESA',1,122,1,'2026-08-19 19:38:56.870','2026-08-19 19:38:56.870'),(133,'4.2.2.07.003','seguros','A','D',5,'DESPESA',1,122,1,'2026-08-19 19:39:15.308','2026-08-19 19:39:15.308'),(134,'4.2.2.07.004','manutencao','A','D',5,'DESPESA',1,122,1,'2026-08-19 19:39:35.022','2026-08-19 19:39:35.022'),(135,'2.1.5','cartoes de credito','S','C',3,'PASSIVO',1,40,1,'2026-08-19 19:43:06.378','2026-08-19 19:43:06.401'),(136,'2.1.5.01','cartoes de credito','S','C',4,'PASSIVO',1,135,1,'2026-08-19 19:44:10.273','2026-08-19 19:44:10.273'),(137,'2.1.5.01.001','cartao itau','A','C',5,'PASSIVO',1,136,1,'2026-08-19 19:44:35.241','2026-08-19 19:44:35.241');
/*!40000 ALTER TABLE `contas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empresas`
--

DROP TABLE IF EXISTS `empresas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empresas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cnpj` varchar(18) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativa` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `empresas_cnpj_key` (`cnpj`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empresas`
--

LOCK TABLES `empresas` WRITE;
/*!40000 ALTER TABLE `empresas` DISABLE KEYS */;
INSERT INTO `empresas` VALUES (1,'reginaldo',NULL,1,'2026-08-19 14:45:07.594');
/*!40000 ALTER TABLE `empresas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lancamentos`
--

DROP TABLE IF EXISTS `lancamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lancamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `data` date NOT NULL,
  `valor` decimal(15,2) NOT NULL,
  `historico` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `conta_debito_id` int NOT NULL,
  `conta_credito_id` int NOT NULL,
  `empresa_id` int NOT NULL,
  `criado_em` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lancamentos_empresa_id_idx` (`empresa_id`),
  KEY `lancamentos_conta_debito_id_idx` (`conta_debito_id`),
  KEY `lancamentos_conta_credito_id_idx` (`conta_credito_id`),
  CONSTRAINT `lancamentos_conta_credito_id_fkey` FOREIGN KEY (`conta_credito_id`) REFERENCES `contas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `lancamentos_conta_debito_id_fkey` FOREIGN KEY (`conta_debito_id`) REFERENCES `contas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `lancamentos_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lancamentos`
--

LOCK TABLES `lancamentos` WRITE;
/*!40000 ALTER TABLE `lancamentos` DISABLE KEYS */;
INSERT INTO `lancamentos` VALUES (1,'2026-08-19',1108.61,'lancamento inicial',8,65,1,'2026-08-19 18:53:28.600','2026-08-19 18:53:28.600'),(2,'2026-08-19',746.59,'lancamento inicial',127,65,1,'2026-08-19 18:55:41.653','2026-08-19 18:55:41.653'),(3,'2026-08-19',122.10,'lanc inicial',112,65,1,'2026-08-19 18:56:34.030','2026-08-19 18:56:34.030'),(4,'2026-08-19',5.21,'lanc inicial',111,65,1,'2026-08-19 18:57:22.162','2026-08-19 18:57:22.162'),(5,'2026-08-19',19.38,'recebimenyto alelo',128,131,1,'2026-08-19 19:37:24.351','2026-08-19 19:37:24.351');
/*!40000 ALTER TABLE `lancamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'contabil'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-25 13:51:16
