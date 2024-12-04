-- Script SQL complet corrigé pour respecter l'ordre de création des tables

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Création de la base de données
CREATE DATABASE IF NOT EXISTS `gestionpharmacie` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `gestionpharmacie`;

-- Table utilisateurs (référencée par `commandes`)
CREATE TABLE `utilisateurs` (
  `id_utilisateur` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `role` enum('Pharmacien','Assistant Pharmacien','Caissier') NOT NULL,
  `contact` varchar(15) NOT NULL,
  `nic` varchar(20) NOT NULL UNIQUE,
  `email` varchar(100) NOT NULL UNIQUE,
  `mot_de_passe` varchar(255) NOT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id_utilisateur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table medecins (référencée par `commandes`)
CREATE TABLE `medecins` (
  `id_medecin` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `contact` varchar(15) NOT NULL,
  `numero_enregistrement` varchar(50) NOT NULL UNIQUE,
  `email` varchar(100) NOT NULL UNIQUE,
  `mot_de_passe` varchar(255) NOT NULL,
  `photo_profil` varchar(255) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_medecin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table commandes
CREATE TABLE `commandes` (
  `id_commande` int(11) NOT NULL AUTO_INCREMENT,
  `id_utilisateur` int(11) NOT NULL,
  `id_medecin` int(11) DEFAULT NULL,
  `statut` enum('En attente','Validée','Livrée','Annulée') DEFAULT 'En attente',
  `date_commande` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_commande`),
  KEY `id_utilisateur` (`id_utilisateur`),
  KEY `id_medecin` (`id_medecin`),
  CONSTRAINT `commandes_ibfk_1` FOREIGN KEY (`id_utilisateur`) REFERENCES `utilisateurs` (`id_utilisateur`),
  CONSTRAINT `commandes_ibfk_2` FOREIGN KEY (`id_medecin`) REFERENCES `medecins` (`id_medecin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table fournisseurs (référencée par `medicaments`)
CREATE TABLE `fournisseurs` (
  `id_fournisseur` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `contact` varchar(15) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  PRIMARY KEY (`id_fournisseur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table medicaments
CREATE TABLE `medicaments` (
  `id_medicament` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `quantite` int(11) DEFAULT 0,
  `id_lot` varchar(50) NOT NULL,
  `date_expiration` date NOT NULL,
  `fournisseur_email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_medicament`),
  KEY `fournisseur_email` (`fournisseur_email`),
  CONSTRAINT `medicaments_ibfk_1` FOREIGN KEY (`fournisseur_email`) REFERENCES `fournisseurs` (`email`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table commandesdetails
CREATE TABLE `commandesdetails` (
  `id_detail` int(11) NOT NULL AUTO_INCREMENT,
  `id_commande` int(11) NOT NULL,
  `id_medicament` int(11) NOT NULL,
  `quantite` int(11) NOT NULL,
  `prix_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_detail`),
  KEY `id_commande` (`id_commande`),
  KEY `id_medicament` (`id_medicament`),
  CONSTRAINT `commandesdetails_ibfk_1` FOREIGN KEY (`id_commande`) REFERENCES `commandes` (`id_commande`) ON DELETE CASCADE,
  CONSTRAINT `commandesdetails_ibfk_2` FOREIGN KEY (`id_medicament`) REFERENCES `medicaments` (`id_medicament`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table rapportsventes
CREATE TABLE `rapportsventes` (
  `id_vente` int(11) NOT NULL AUTO_INCREMENT,
  `id_medicament` int(11) NOT NULL,
  `quantite_vendue` int(11) NOT NULL,
  `revenu` decimal(10,2) NOT NULL,
  `date_vente` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_vente`),
  KEY `id_medicament` (`id_medicament`),
  CONSTRAINT `rapportsventes_ibfk_1` FOREIGN KEY (`id_medicament`) REFERENCES `medicaments` (`id_medicament`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Données de test (fournisseurs, utilisateurs, medicaments, medecins)
INSERT INTO `fournisseurs` VALUES
(11, 'Fares Nantenaina', '0342534546', 'nantenainaalex@gmail.com');

INSERT INTO `utilisateurs` VALUES
(1, 'Fares Nantenaina', 'Pharmacien', '0342534546', '4151515165', 'nantenainaalex79@gmail.com', 'motdepasse', '2024-11-24 06:31:33', NULL, NULL);

INSERT INTO `medecins` VALUES
(6, 'Dr. Fares', '0342534546', '210253', 'drfares@example.com', 'motdepasse', NULL, '2024-11-24 19:06:38');

INSERT INTO `medicaments` VALUES
(1, 'Paracetamol', 'Antidouleur', 12.50, 100, 'LOT123', '2025-01-01', 'nantenainaalex@gmail.com', NULL);

COMMIT;
