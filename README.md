hbvuyxllzawzdbng


nantenainaalex79@gmail.com




Voici une implémentation en **Node.js** utilisant **Express**, **Handlebars (hbs)**, et **Tailwind CSS** pour reproduire une interface similaire à celle affichée dans l'image après le login.

---

### Étape 1 : Initialisation du projet

Créez un projet Node.js avec les modules nécessaires :

```bash
mkdir pharmacie-dashboard
cd pharmacie-dashboard
npm init -y
npm install express hbs mysql bcrypt body-parser tailwindcss
```

Configurez **Tailwind CSS** avec un fichier CDN directement dans vos fichiers HBS.

---

### Étape 2 : Configuration de `app.js`

Voici le code pour démarrer le serveur Express et gérer le routage principal :

```javascript
const express = require("express");
const bodyParser = require("body-parser");
const connection = require("./db"); // Fichier db.js pour gérer la connexion MySQL

const app = express();

// Configuration de Handlebars comme moteur de template
app.set("view engine", "hbs");
app.use(express.static("public")); // Pour servir les fichiers statiques (CSS, images, etc.)

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Page après le login
app.get("/dashboard", (req, res) => {
    // Requête pour obtenir des statistiques depuis la base de données
    const statsQuery = `
        SELECT 
            (SELECT COUNT(*) FROM Medecins) AS total_doctors,
            (SELECT COUNT(*) FROM Commandes WHERE statut='En attente') AS doctor_orders,
            (SELECT COUNT(*) FROM Commandes WHERE statut='Validée') AS verified_orders,
            (SELECT COUNT(*) FROM Commandes WHERE statut='Livrée') AS picked_orders
    `;

    const notificationsQuery = `
        SELECT nom, id_lot, date_expiration FROM Medicaments WHERE date_expiration < CURDATE() ORDER BY date_expiration ASC;
    `;

    connection.query(statsQuery, (err, stats) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erreur interne du serveur.");
        }

        connection.query(notificationsQuery, (err, notifications) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Erreur interne du serveur.");
            }

            res.render("dashboard", {
                stats: stats[0],
                notifications: notifications,
            });
        });
    });
});

// Démarrer le serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
```

---

### Étape 3 : Configuration de `db.js`

Créez un fichier `db.js` pour gérer la connexion à la base de données :

```javascript
const mysql = require("mysql");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root", // Remplacez par votre utilisateur MySQL
    password: "", // Remplacez par votre mot de passe MySQL
    database: "GestionPharmacie", // Nom de la base de données
});

connection.connect((err) => {
    if (err) {
        console.error("Erreur de connexion à MySQL:", err);
        return;
    }
    console.log("Connecté à la base de données MySQL");
});

module.exports = connection;
```

---

### Étape 4 : Vue Handlebars `dashboard.hbs`

Créez un fichier `views/dashboard.hbs` :

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <nav class="bg-gray-800 text-white p-4 flex justify-between">
        <h1 class="text-2xl font-bold">pharmacare</h1>
        <div>
            <button class="bg-teal-500 px-4 py-2 rounded text-white">Log out</button>
        </div>
    </nav>
    <div class="container mx-auto mt-10">
        <div class="grid grid-cols-4 gap-6">
            <div class="bg-teal-500 text-white p-4 rounded shadow">
                <h2 class="text-xl font-bold">Total Doctor Users</h2>
                <p class="text-3xl">{{stats.total_doctors}}</p>
            </div>
            <div class="bg-blue-500 text-white p-4 rounded shadow">
                <h2 class="text-xl font-bold">Doctor Orders Available</h2>
                <p class="text-3xl">{{stats.doctor_orders}}</p>
            </div>
            <div class="bg-green-500 text-white p-4 rounded shadow">
                <h2 class="text-xl font-bold">Verified Doctor Orders</h2>
                <p class="text-3xl">{{stats.verified_orders}}</p>
            </div>
            <div class="bg-orange-500 text-white p-4 rounded shadow">
                <h2 class="text-xl font-bold">Picked Up Doctor Orders</h2>
                <p class="text-3xl">{{stats.picked_orders}}</p>
            </div>
        </div>

        <div class="mt-10">
            <h2 class="text-xl font-bold mb-4">Expire Date Notifications</h2>
            <table class="table-auto w-full bg-white shadow rounded">
                <thead>
                    <tr>
                        <th class="px-4 py-2">Name</th>
                        <th class="px-4 py-2">Batch ID</th>
                        <th class="px-4 py-2">Expiration Date</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each notifications}}
                    <tr>
                        <td class="border px-4 py-2">{{this.nom}}</td>
                        <td class="border px-4 py-2">{{this.id_lot}}</td>
                        <td class="border px-4 py-2">{{this.date_expiration}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
```

---

### Étape 5 : Ajout de Tailwind CSS

Aucune configuration supplémentaire n'est nécessaire, puisque Tailwind CSS est intégré via le CDN dans le fichier Handlebars.

---

### Étape 6 : Démarrer et tester

1. Assurez-vous que la base de données **`GestionPharmacie`** est créée et que toutes les tables sont en place.
2. Démarrez l'application avec :

   ```bash
   node app.js
   ```

3. Accédez à `http://localhost:3000/dashboard`.

Vous verrez une interface similaire à l'image avec les statistiques et les notifications récupérées depuis la base de données.














ajouter un botton sur sur l'interface , passer au commande, en faite est ce que tu peut gerer l'insertion , reduction sur le quantite et autres pour vente , voila son base de donne 



-- Base de données : gestionpharmacie
--
CREATE DATABASE IF NOT EXISTS gestionpharmacie DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE gestionpharmacie;



--
-- Structure de la table commandes
--

CREATE TABLE commandes (
  id_commande int(11) NOT NULL,
  id_utilisateur int(11) NOT NULL,
  id_medecin int(11) DEFAULT NULL,
  statut enum('En attente','Validée','Livrée','Annulée') DEFAULT 'En attente',
  date_commande timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table commandesdetails
--

CREATE TABLE commandesdetails (
  id_detail int(11) NOT NULL,
  id_commande int(11) NOT NULL,
  id_medicament int(11) NOT NULL,
  quantite int(11) NOT NULL,
  prix_total decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




--
-- Structure de la table rapportsventes
--

CREATE TABLE rapportsventes (
  id_vente int(11) NOT NULL,
  id_medicament int(11) NOT NULL,
  quantite_vendue int(11) NOT NULL,
  revenu decimal(10,2) NOT NULL,
  date_vente timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Index pour la table commandes
--
ALTER TABLE commandes
  ADD PRIMARY KEY (id_commande),
  ADD KEY id_utilisateur (id_utilisateur),
  ADD KEY id_medecin (id_medecin);

--
-- Index pour la table commandesdetails
--
ALTER TABLE commandesdetails
  ADD PRIMARY KEY (id_detail),
  ADD KEY id_commande (id_commande),
  ADD KEY id_medicament (id_medicament);



ALTER TABLE medicaments
  ADD PRIMARY KEY (id_medicament),
  ADD KEY fournisseur_email (fournisseur_email);

--
-- Index pour la table rapportsventes
--
ALTER TABLE rapportsventes
  ADD PRIMARY KEY (id_vente),
  ADD KEY id_medicament (id_medicament);


ALTER TABLE commandes
  MODIFY id_commande int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table commandesdetails
--
ALTER TABLE commandesdetails
  MODIFY id_detail int(11) NOT NULL AUTO_INCREMENT;


-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table commandes
--
ALTER TABLE commandes
  ADD CONSTRAINT commandes_ibfk_1 FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs (id_utilisateur),
  ADD CONSTRAINT commandes_ibfk_2 FOREIGN KEY (id_medecin) REFERENCES medecins (id_medecin);

--
-- Contraintes pour la table commandesdetails
--
ALTER TABLE commandesdetails
  ADD CONSTRAINT commandesdetails_ibfk_1 FOREIGN KEY (id_commande) REFERENCES commandes (id_commande) ON DELETE CASCADE,
  ADD CONSTRAINT commandesdetails_ibfk_2 FOREIGN KEY (id_medicament) REFERENCES medicaments (id_medicament) ON DELETE CASCADE;

--
-- Contraintes pour la table medicaments
--
ALTER TABLE medicaments
  ADD CONSTRAINT medicaments_ibfk_1 FOREIGN KEY (fournisseur_email) REFERENCES fournisseurs (email) ON DELETE SET NULL;

--
-- Contraintes pour la table rapportsventes
--
ALTER TABLE rapportsventes
  ADD CONSTRAINT rapportsventes_ibfk_1 FOREIGN KEY (id_medicament) REFERENCES medicaments (id_medicament);
COMMIT;














// Render medicaments management page
app.get('/medicaments', (req, res) => {
  res.render('medicaments'); // Assuming you have an EJS template for this page
});

// Fetch all medicaments
app.get('/api/medicaments', (req, res) => {
  const query = 'SELECT * FROM medicaments';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching medicaments:', err);
          return res.status(500).json({ error: 'Database query error.' });
      }
      res.json(results);
  });
});

// Add a new medicament
app.post('/api/medicaments', (req, res) => {
  const { nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email } = req.body;
  const query = `
      INSERT INTO medicaments (nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email];
  db.query(query, values, (err) => {
      if (err) {
          console.error('Error adding medicament:', err);
          return res.status(500).json({ error: 'Database insert error.' });
      }
      res.json({ message: 'Medicament added successfully!' });
  });
});

// Update an existing medicament
app.put('/api/medicaments/:id', (req, res) => {
  const { id } = req.params;
  const { nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email } = req.body;
  const query = `
      UPDATE medicaments
      SET nom = ?, description = ?, prix = ?, quantite = ?, id_lot = ?, date_expiration = ?, fournisseur_email = ?
      WHERE id_medicament = ?
  `;
  const values = [nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email, id];
  db.query(query, values, (err) => {
      if (err) {
          console.error('Error updating medicament:', err);
          return res.status(500).json({ error: 'Database update error.' });
      }
      res.json({ message: 'Medicament updated successfully!' });
  });
});

// Delete a medicament
app.delete('/api/medicaments/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM medicaments WHERE id_medicament = ?';
  db.query(query, [id], (err) => {
      if (err) {
          console.error('Error deleting medicament:', err);
          return res.status(500).json({ error: 'Database delete error.' });
      }
      res.json({ message: 'Medicament deleted successfully!' });
  });
});









fait cette code pour qu'il le recherche et le image a de button add to cart et un input quantite et a chaque nombre input sur ce input le valeur de quantite change aussi en fait fait comme dans linterface sur le code photo 

la structure de route 

// Route pour afficher les médicaments dans l'interface
app.get('/medicament', (req, res) => {
  const query = `
    SELECT id_medicament, nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email, image 
    FROM medicaments 
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des médicaments :', err);
      return res.status(500).send('Erreur du serveur');
    }
    res.render('manage-medicament', { medicaments: results });
  });
});
  






  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestion des Médicaments</title>
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

    <style>
    body {
      color: black;
    }
    .card-title, .card-text, p {
      color: black;
    }
  </style>
</head>
<body>
  <div class="container mt-5">
    <h1 class="text-center">Liste des Médicaments</h1>
    <div class="row">
      {{#each medicaments}}
      <div class="col-md-4 mb-4">
        <div class="card">
          <!-- Affichage de l'image -->
          <img src="{{image}}" class="card-img-top" alt="{{nom}}" style="height: 200px; object-fit: cover;">
          <div class="card-body">
            <!-- Informations sur le médicament -->
            <h5 class="card-title">{{nom}}</h5>
            <p class="card-text">{{description}}</p>
            <p><strong>Prix:</strong> {{prix}} Ar</p>
            <p><strong>Quantité:</strong> {{quantite}}</p>
          </div>
        </div>
      </div>
      {{/each}}
    </div>
  </div>
</body>
</html>





Button a gauche ne marche pas encore , ajouter un barre de recherche automatique just on ecrit le premier nom , 
le stock diminier a chaque ajout au tableau , ajouter un button passer au payment 8/*# expressjs
