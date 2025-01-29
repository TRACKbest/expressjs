const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const session = require('express-session'); // Pour la gestion des sessions

const app = express();

app.use(express.json()); // Pour analyser les corps JSON

const fs = require('fs');
const path = require('path');

// Chemin du répertoire "uploads"
const uploadDir = path.join(__dirname, 'uploads');

// Vérifie si le dossier "uploads" existe, sinon le crée
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}


const multer = require('multer');
// const path = require('path');

// Configuration de multer pour l'upload de fichier
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Assurez-vous que ce dossier existe
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuration des sessions
app.use(
  session({
    secret: 'admin',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Passez à `true` si vous utilisez HTTPS
  })
);

// Configurer Handlebars avec un helper personnalisé
app.engine(
  'hbs',
  exphbs.engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
      json: (context) => JSON.stringify(context),
    },
  })
);
app.set('view engine', 'hbs');

// Connexion à la base de données
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '12451245a', // Remplacez par votre mot de passe MySQL
  database: 'gestionpharmacie',
});

db.connect((err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err);
    process.exit(1); // Arrêter l'application si la connexion échoue
  }
  console.log('Connecté à la base de données MySQL');
});

// Fonction d'erreur générique pour simplifier le code
function handleError(res, err, message = 'Erreur interne du serveur.') {
  console.error(err);
  res.status(500).send(message);
}

// ROUTES

// Page d'inscription
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { name, role, contact, nic, email, password } = req.body;

  try {
    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `INSERT INTO utilisateurs (nom, role, contact, nic, email, mot_de_passe) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(query, [name, role, contact, nic, email, hashedPassword], (err) => {
      if (err) {
        return handleError(res, err, 'Erreur lors de l\'inscription.');
      }
      res.redirect('login');
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Page de connexion
app.get('/', (req, res) => {
  res.render('login');
});
// Page de connexion
app.get('/login', (req, res) => {
  res.render('login');
});

// Route pour afficher un message JSON
app.get('/bonnenuit', (req, res) => {
  res.json({ message: 'Bonne nuit Fares' });
});




app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM utilisateurs WHERE email = ?`;
  db.query(query, [email], async (err, results) => {
    if (err) return handleError(res, err);

    if (results.length === 0) {
      return res.render('login', { error: 'Email invalide.' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.mot_de_passe);

    if (!isMatch) {
      return res.render('login', { error: 'Mot de passe incorrect.' });
    }

    // Stocker l'utilisateur dans la session
    req.session.user = user;
    res.redirect('/dashboard');
  });
});

// Page Forgot Password
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  const query = `SELECT * FROM utilisateurs WHERE email = ?`;
  db.query(query, [email], (err, results) => {
    if (err) return handleError(res, err);

    if (results.length === 0) {
      return res.render('forgot-password', { error: 'Aucun compte trouvé avec cet email.' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expiry = Date.now() + 3600000; // 1 heure
    const updateQuery = `UPDATE utilisateurs SET reset_token = ?, reset_token_expiry = ? WHERE email = ?`;

    db.query(updateQuery, [token, expiry, email], (err) => {
      if (err) return handleError(res, err);

      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'nantenainaalex79@gmail.com',
          pass: 'hbvuyxllzawzdbng', // Attention à la sécurité des mots de passe
        },
      });

      const resetUrl = `https://polyclinique-psfa.duckdns.org/reset-password/${token}`;
      const mailOptions = {
        to: email,
        from: 'support@pharmacare.com',
        subject: 'Réinitialisation de votre mot de passe',
        text: `Bonjour,\n\nCliquez sur le lien suivant pour réinitialiser votre mot de passe :\n\n${resetUrl}\n\nCe lien est valide pendant une heure.\n\nCordialement,\nPharmaCare`,
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) return handleError(res, err, "Erreur lors de l'envoi de l'email.");

        res.render('forgot-password', { success: 'Un email de réinitialisation a été envoyé.' });
      });
    });
  });
});

app.get('/reset-password/:token', (req, res) => {
  const { token } = req.params;

  const query = `SELECT * FROM utilisateurs WHERE reset_token = ? AND reset_token_expiry > ?`;
  db.query(query, [token, Date.now()], (err, results) => {
    if (err) return handleError(res, err);

    if (results.length === 0) {
      return res.send('Le lien de réinitialisation est invalide ou a expiré.');
    }

    res.render('reset-password', { token });
  });
});

app.post('/reset-password', (req, res) => {
  const { token, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.send('Les mots de passe ne correspondent pas.');
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return handleError(res, err);

    const query = `
        UPDATE utilisateurs 
        SET mot_de_passe = ?, reset_token = NULL, reset_token_expiry = NULL 
        WHERE reset_token = ? AND reset_token_expiry > ?
    `;

    db.query(query, [hashedPassword, token, Date.now()], (err, result) => {
      if (err) return handleError(res, err);

      if (result.affectedRows === 0) {
        return res.send('Le lien de réinitialisation est invalide ou a expiré.');
      }

      res.send('Votre mot de passe a été réinitialisé avec succès.');
    });
  });
});



// Route tableau de bord
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  db.query('SELECT COUNT(*) AS totalDoctors FROM medecins', (err, doctorStats) => {
    if (err) return handleError(res, err);

    db.query('SELECT COUNT(*) AS totalOrders FROM commandes WHERE statut = "En attente"', (err, availableOrders) => {
      if (err) return handleError(res, err);

      db.query('SELECT COUNT(*) AS verifiedOrders FROM commandes WHERE statut = "Validée"', (err, verifiedOrders) => {
        if (err) return handleError(res, err);

        db.query('SELECT COUNT(*) AS pickedUpOrders FROM commandes WHERE statut = "Livrée"', (err, pickedUpOrders) => {
          if (err) return handleError(res, err);

          db.query('SELECT nom AS name, id_lot AS batchId FROM medicaments WHERE date_expiration < NOW()', (err, expireNotifications) => {
            if (err) return handleError(res, err);

            db.query('SELECT nom AS name, id_lot AS batchId FROM medicaments WHERE quantite = 0', (err, outOfStockNotifications) => {
              if (err) return handleError(res, err);

              db.query('SELECT nom AS name, quantite AS quantity FROM medicaments', (err, quantityData) => {
                if (err) return handleError(res, err);

                const sales = {
                  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                  data: [12000, 15000, 10000, 18000, 20000, 17000], // Exemple statique
                };

                const quantity = {
                  labels: quantityData.map((row) => row.name),
                  data: quantityData.map((row) => row.quantity),
                };

                res.render('dashboard', {
                  stats: [
                    { title: 'Total Doctors', value: doctorStats[0].totalDoctors },
                    { title: 'Pending Orders', value: availableOrders[0].totalOrders },
                    { title: 'Validated Orders', value: verifiedOrders[0].verifiedOrders },
                    { title: 'Delivered Orders', value: pickedUpOrders[0].pickedUpOrders },
                  ],
                  expireNotifications,
                  outOfStockNotifications,
                  sales,
                  quantity,
                });
              });
            });
          });
        });
      });
    });
  });
});


app.get('/users', (req, res) => {
  // Vérifiez si l'utilisateur est connecté (optionnel)
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.render('users'); // Charge le fichier Handlebars pour cette interface
});




app.post('/add-doctor', upload.single('photo_profil'), async (req, res) => {
  const { nom, contact, numero_enregistrement, email, mot_de_passe } = req.body;
  const photo_profil = req.file ? req.file.path : null;

  try {
    // Vérification des champs requis
    if (!nom || !contact || !numero_enregistrement || !email || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
    }

    // Validation des champs (exemple pour le numéro de contact)
    if (!/^[0-9]{10}$/.test(contact)) {
      return res.status(400).json({ error: 'Le numéro de contact est invalide.' });
    }

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    // Préparation de la requête SQL
    const query = `
      INSERT INTO medecins (nom, contact, numero_enregistrement, email, mot_de_passe, photo_profil)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    // Exécution de la requête
    db.query(query, [nom, contact, numero_enregistrement, email, hashedPassword, photo_profil], (err) => {
      if (err) {
        console.error('Erreur lors de l\'ajout du médecin :', err);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout du médecin.' });
      }
      res.render('enregistrement', {
        successMessage: 'Médecin ajouté avec succès.',
      });
    });
  } catch (err) {
    console.error('Erreur interne :', err);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
});


app.get('/manage-doctors', (req, res) => {
  const query = 'SELECT id_medecin, nom, contact, numero_enregistrement, email FROM medecins';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des médecins :', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
      }
      res.json(results); // Retourne les médecins sous forme de JSON
  });
});


app.delete('/delete-doctor/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM medecins WHERE id_medecin = ?';

  db.query(query, [id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la suppression du médecin :', err);
          return res.status(500).json({ error: 'Erreur lors de la suppression du médecin.' });
      }
      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Médecin non trouvé.' });
      }
      res.json({ message: 'Médecin supprimé avec succès.' });
  });
});


app.put('/edit-doctor/:id', (req, res) => {
  const { id } = req.params;
  const { nom, contact, numero_enregistrement, email } = req.body;

  // Vérification des champs requis
  if (!nom || !contact || !numero_enregistrement || !email) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
  }

  const query = `
      UPDATE medecins 
      SET nom = ?, contact = ?, numero_enregistrement = ?, email = ?
      WHERE id_medecin = ?
  `;

  db.query(query, [nom, contact, numero_enregistrement, email, id], (err, result) => {
      if (err) {
          console.error('Erreur lors de la modification du médecin :', err);
          return res.status(500).json({ error: 'Erreur lors de la modification du médecin.' });
      }
      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Médecin non trouvé.' });
      }
      res.json({ message: 'Médecin modifié avec succès.' });
  });
});



app.get('/user-stats', (req, res) => {
  const userStatsQuery = `
      SELECT 
          role AS category,
          COUNT(*) AS count
      FROM utilisateurs
      GROUP BY role
  `;

  const doctorCountQuery = `
      SELECT COUNT(*) AS count FROM medecins
  `;

  const monthlyRegistrationsQuery = `
      SELECT DATE_FORMAT(date_creation, '%Y-%m') AS month, COUNT(*) AS count
      FROM utilisateurs
      GROUP BY DATE_FORMAT(date_creation, '%Y-%m')
      ORDER BY month
  `;

  db.query(userStatsQuery, (err, userStats) => {
      if (err) {
          console.error('Erreur lors de la récupération des statistiques des utilisateurs :', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques des utilisateurs.' });
      }

      db.query(doctorCountQuery, (err, doctorStats) => {
          if (err) {
              console.error('Erreur lors de la récupération des médecins :', err);
              return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
          }

          db.query(monthlyRegistrationsQuery, (err, monthlyStats) => {
              if (err) {
                  console.error('Erreur lors de la récupération des enregistrements mensuels :', err);
                  return res.status(500).json({ error: 'Erreur lors de la récupération des enregistrements mensuels.' });
              }

              res.json({
                  totalDoctors: doctorStats[0].count,
                  stats: userStats,
                  monthlyRegistrations: monthlyStats
              });
          });
      });
  });
});



app.get('/doctors/:id', (req, res) => {
  const doctorId = req.params.id;

  const query = `SELECT * FROM medecins WHERE id_medecin = ?`;
  db.query(query, [doctorId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération du médecin :', err);
          return res.status(500).json({ error: 'Erreur lors de la récupération du médecin.' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Médecin non trouvé.' });
      }

      res.json(results[0]);
  });
});



app.put('/doctors/:id', (req, res) => {
  const doctorId = req.params.id;
  const { nom, contact, numero_enregistrement, email } = req.body;

  const updateQuery = `
      UPDATE medecins
      SET nom = ?, contact = ?, numero_enregistrement = ?, email = ?
      WHERE id_medecin = ?
  `;

  db.query(updateQuery, [nom, contact, numero_enregistrement, email, doctorId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la mise à jour du médecin :', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour du médecin.' });
      }

      res.json({ success: true, message: 'Médecin mis à jour avec succès.' });
  });
});


// Middleware pour vérifier si l'utilisateur est authentifié
function isAuthenticated(req, res, next) {
  if (!req.session.user) {
      return res.redirect('/login');
  }
  next();
}

// Charger la page des fournisseurs
app.get('/suppliers', isAuthenticated, (req, res) => {
  res.render('fournisseurs'); // Utilisation de l'engine template pour afficher la page
});

// Récupérer la liste des fournisseurs
app.get('/manage-suppliers', isAuthenticated, (req, res) => {
  db.query('SELECT * FROM fournisseurs', (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erreur du serveur' });
      }
      res.json(results); // Retourner les fournisseurs au format JSON
  });
});


// Ajouter un nouveau fournisseur
app.post('/add-supplier', isAuthenticated, (req, res) => {
  const { nom, contact, email } = req.body;

  if (!nom || !contact || !email) {
      return res.status(400).send('Tous les champs sont requis');
  }

  db.query(
      'INSERT INTO fournisseurs (nom, contact, email) VALUES (?, ?, ?)',
      [nom, contact, email],
      (err) => {
          if (err) {
              console.error(err);
              return res.status(500).send('Erreur lors de l\'ajout du fournisseur');
          }
          res.status(201).json({ success: true, message: 'Fournisseur ajouté avec succès' });
      }
  );
});
// Récupérer un fournisseur par ID
app.get('/suppliers/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM fournisseurs WHERE id_fournisseur = ?', [id], (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erreur lors de la récupération des données du fournisseur' });
      }
      if (results.length === 0) {
          return res.status(404).json({ error: 'Fournisseur introuvable' });
      }
      res.json(results[0]); // Retourner le fournisseur correspondant
  });
});



// Modifier un fournisseur existant
app.put('/suppliers/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { nom, contact, email } = req.body;

  if (!nom || !contact || !email) {
      return res.status(400).send('Tous les champs sont requis');
  }

  db.query(
      'UPDATE fournisseurs SET nom = ?, contact = ?, email = ? WHERE id_fournisseur = ?',
      [nom, contact, email, id],
      (err) => {
          if (err) {
              console.error(err);
              return res.status(500).send('Erreur lors de la modification du fournisseur');
          }
          res.json({ message: 'Fournisseur modifié avec succès' });
      }
  );
});
// Supprimer un fournisseur
app.delete('/delete-supplier/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM fournisseurs WHERE id_fournisseur = ?', [id], (err) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Erreur lors de la suppression du fournisseur');
      }
      res.json({ message: 'Fournisseur supprimé avec succès' });
  });
});












// Route pour afficher l'interface de gestion des médicaments
app.get('/medicaments', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  // Récupérer la liste des fournisseurs depuis la base de données
  db.query('SELECT email, nom FROM fournisseurs', (err, fournisseurs) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erreur serveur');
    }

    // Passer la liste des fournisseurs à la vue
    res.render('medicaments', { fournisseurs });
  });
});

// Route pour ajouter un médicament
// Route pour ajouter un médicament
app.post('/add-medicament', upload.single('image'), async (req, res) => {
  const { nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email } = req.body;
  const image = req.file ? req.file.path : null;

  try {
    if (!nom || !description || !prix || !quantite || !id_lot || !date_expiration || !fournisseur_email) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
    }

    // Vérifier si l'email du fournisseur existe dans la base de données
    db.query('SELECT email FROM fournisseurs WHERE email = ?', [fournisseur_email], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Erreur serveur');
      }

      // Si le fournisseur n'existe pas, renvoyer une erreur
      if (results.length === 0) {
        return res.status(400).json({ error: 'L\'email du fournisseur n\'existe pas.' });
      }
 
      // Si le fournisseur existe, on procède à l'ajout du médicament
      const query = `
        INSERT INTO medicaments (nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(query, [nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email, image], (err) => {
        if (err) {
          console.error('Erreur lors de l\'ajout du médicament :', err);
          return res.status(500).json({ error: 'Erreur lors de l\'ajout du médicament.' });
        }
        res.status(201).json({ message: 'Médicament ajouté avec succès.' });
      });
    });
  } catch (err) {
    console.error('Erreur interne :', err);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
});


// Route pour récupérer les produits et les envoyer au template
app.get('/products', (req, res) => {
  const query = 'SELECT * FROM medicaments';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).render('error', { message: 'Erreur serveur' });
    }
    res.render('products', { products: results });
  });
});





// Route pour récupérer tous les médicaments
app.get('/manage-medicaments', (req, res) => {
  const query = `
    SELECT id_medicament, nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email 
    FROM medicaments
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des médicaments :', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des médicaments.' });
    }
    res.json(results); // Retourne les médicaments sous forme de JSON
  });
});

// Route pour supprimer un médicament
app.delete('/delete-medicament/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM medicaments WHERE id_medicament = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Erreur lors de la suppression du médicament :', err);
      return res.status(500).json({ error: 'Erreur lors de la suppression du médicament.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Médicament non trouvé.' });
    }
    res.json({ message: 'Médicament supprimé avec succès.' });
  });
});

// Route pour modifier un médicament
app.put('/edit-medicament/:id', (req, res) => {
  const { id } = req.params;
  const { nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email } = req.body;

  if (!nom || !description || !prix || !quantite || !id_lot || !date_expiration || !fournisseur_email) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis.' });
  }

  const query = `
    UPDATE medicaments
    SET nom = ?, description = ?, prix = ?, quantite = ?, id_lot = ?, date_expiration = ?, fournisseur_email = ?
    WHERE id_medicament = ?
  `;
  db.query(query, [nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email, id], (err, result) => {
    if (err) {
      console.error('Erreur lors de la modification du médicament :', err);
      return res.status(500).json({ error: 'Erreur lors de la modification du médicament.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Médicament non trouvé.' });
    }
    res.json({ message: 'Médicament modifié avec succès.' });
  });
});

// Route pour récupérer un médicament spécifique
app.get('/medicaments/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM medicaments WHERE id_medicament = ?';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération du médicament :', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération du médicament.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Médicament non trouvé.' });
    }
    res.json(results[0]);
  });
});

app.get('/medica', async (req, res) => {
  try {
      // Exécuter les requêtes pour les statistiques
      const [totalMedicaments] = await db.query('SELECT COUNT(*) AS count FROM medicaments');
      const [expiredMedicaments] = await db.query('SELECT COUNT(*) AS count FROM medicaments WHERE date_expiration < NOW()');
      const [lowStockMedicaments] = await db.query('SELECT COUNT(*) AS count FROM medicaments WHERE quantite < 10');
      const [topMedicaments] = await db.query(`
          SELECT nom AS medicament_name, quantite 
          FROM medicaments 
          ORDER BY quantite DESC 
          LIMIT 5
      `);

      // Envoyer les données en réponse
      res.json({
          totalMedicaments: totalMedicaments.count,
          expiredMedicaments: expiredMedicaments.count,
          lowStockMedicaments: lowStockMedicaments.count,
          topMedicaments
      });
  } catch (error) {
      // Gestion des erreurs
      console.error('Error fetching medicament stats:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
}); 



app.get('/products', (req, res) => {
  db.query('SELECT * FROM medicaments WHERE quantite > 0', (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erreur lors de la récupération des médicaments' });
      }
      res.json(results);
  });
});


// app.post('/transactions', (req, res) => {
//   const { cart } = req.body;

//   const queries = cart.map(item => {
//       return new Promise((resolve, reject) => {
//           db.query(
//               'UPDATE medicaments SET quantite = quantite - ? WHERE nom = ? AND quantite >= ?',
//               [item.quantity, item.product, item.quantity],
//               (err, result) => {
//                   if (err || result.affectedRows === 0) {
//                       reject('Stock insuffisant ou médicament introuvable');
//                   } else {
//                       resolve();
//                   }
//               }
//           );
//       });
//   });

//   Promise.all(queries)
//       .then(() => res.status(200).send('Transaction réussie'))
//       .catch(err => res.status(400).send(err));
// });


// function checkRole(role) {
//   return (req, res, next) => {
//       if (req.user.role !== role) {
//           return res.status(403).send('Accès interdit');
//       }
//       next();
//   };
// }


// app.post('/transactions', (req, res) => {
//   const { cart, total } = req.body;

//   db.query('INSERT INTO commandes (id_utilisateur, date_commande) VALUES (?, ?)', [req.user.id, new Date()], (err, result) => {
//       if (err) return res.status(500).send('Erreur lors de l\'ajout de la commande');

//       const commandeId = result.insertId;

//       cart.forEach(item => {
//           db.query(
//               'INSERT INTO commandesdetails (id_commande, id_medicament, quantite, prix_total) VALUES (?, ?, ?, ?)',
//               [commandeId, item.id, item.quantity, item.total],
//               (err) => {
//                   if (err) console.error('Erreur lors de l\'ajout des détails', err);
//               }
//           );
//       });

//       res.status(201).send('Commande ajoutée avec succès');
//   });
// });


/*** API Transactions**/

// app.post('/transactions', async (req, res) => {
//   const { cart, total } = req.body;

//   if (!cart || cart.length === 0 || !total) {
//     return res.status(400).send('Panier vide ou total manquant.');
//   }

//   const connection = await db.getConnection(); // Utiliser un pool de connexions

//   try {
//     // Démarrer une transaction
//     await connection.beginTransaction();

//     // Insérer la commande principale
//     const [commandeResult] = await connection.query(
//       'INSERT INTO commandes (id_utilisateur, date_commande) VALUES (?, ?)',
//       [1, new Date()] // Remplacer 1 par l'utilisateur connecté
//     );

//     const commandeId = commandeResult.insertId;

//     // Parcourir les articles du panier
//     for (const item of cart) {
//       // Rechercher l'ID du médicament par son nom
//       const [medicamentResult] = await connection.query(
//         'SELECT id_medicament, quantite FROM medicaments WHERE nom = ? FOR UPDATE',
//         [item.name]
//       );

//       if (!medicamentResult.length) {
//         throw new Error(`Médicament "${item.name}" introuvable dans la base de données.`);
//       }

//       const medicament = medicamentResult[0];
//       const medicamentId = medicament.id_medicament;
//       const availableQuantity = medicament.quantite;

//       // Vérifier si le stock est suffisant
//       if (availableQuantity < item.quantity) {
//         throw new Error(`Stock insuffisant pour "${item.name}". Stock disponible : ${availableQuantity}`);
//       }

//       // Ajouter les détails de la commande
//       await connection.query(
//         'INSERT INTO commandesdetails (id_commande, id_medicament, quantite, prix_total) VALUES (?, ?, ?, ?)',
//         [commandeId, medicamentId, item.quantity, item.totalPrice]
//       );

//       // Mettre à jour le stock du médicament
//       await connection.query(
//         'UPDATE medicaments SET quantite = quantite - ? WHERE id_medicament = ?',
//         [item.quantity, medicamentId]
//       );
//     }

//     // Valider la transaction
//     await connection.commit();
//     res.status(201).send('Commande validée avec succès.');
//   } catch (err) {
//     // Annuler la transaction en cas d'erreur
//     await connection.rollback();
//     console.error(err);
//     res.status(500).send(`Erreur : ${err.message}`);
//   } finally {
//     connection.release();
//   }
// });




// app.post('/transactions', async (req, res) => {
//   const { cart, total } = req.body;

//   if (!cart || cart.length === 0 || !total) {
//     return res.status(400).send('Le panier est vide ou le total est manquant.');
//   }

//   try {
//     // Insérer une commande principale
//     const [commandeResult] = await connection.query(
//       'INSERT INTO commandes (id_utilisateur, date_commande) VALUES (?, ?)',
//       [1, new Date()] // Remplacez `1` par `req.user.id` si vous utilisez l'authentification
//     );
//     const commandeId = commandeResult.insertId;

//     // Gérer les détails de la commande
//     for (const item of cart) {
//       // Vérifier le stock du médicament
//       const [medicamentResult] = await connection.query(
//         'SELECT quantite FROM medicaments WHERE id_medicament = ? FOR UPDATE',
//         [item.id]
//       );

//       if (medicamentResult.length === 0) {
//         throw new Error(`Médicament introuvable pour l'ID ${item.id}`);
//       }

//       const availableQuantity = medicamentResult[0].quantite;

//       if (availableQuantity < item.quantity) {
//         throw new Error(`Stock insuffisant pour le médicament ID ${item.id}`);
//       }

//       // Ajouter un détail de commande
//       await connection.query(
//         'INSERT INTO commandesdetails (id_commande, id_medicament, quantite, prix_total) VALUES (?, ?, ?, ?)',
//         [commandeId, item.id, item.quantity, item.totalPrice]
//       );

//       // Mettre à jour le stock
//       await connection.query(
//         'UPDATE medicaments SET quantite = quantite - ? WHERE id_medicament = ?',
//         [item.quantity, item.id]
//       );
//     }

//     res.status(201).send('Commande ajoutée avec succès');
//   } catch (err) {
//     console.error(err);
//     res.status(500).send(`Erreur lors de la commande : ${err.message}`);
//   }
// });






// Endpoint pour récupérer les produits disponibles
app.get('/products', (req, res) => {
  db.query('SELECT * FROM medicaments WHERE quantite > 0', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des médicaments' });
    }
    res.json(results);
  });
});

// Endpoint pour gérer les transactions
app.post('/transactions', (req, res) => {
  const { cart, total } = req.body;

  if (!cart || cart.length === 0 || !total) {
    return res.status(400).send('Le panier est vide ou le total est manquant.');
  }

  db.query(
    'INSERT INTO commandes (id_utilisateur, date_commande) VALUES (?, ?)',
    [1, new Date()], // Remplacez `1` par `req.user.id` si l'authentification est utilisée
    (err, result) => {
      if (err) {
        console.error('Erreur lors de l\'ajout de la commande :', err);
        return res.status(500).send('Erreur lors de l\'ajout de la commande.');
      }

      const commandeId = result.insertId;

      const tasks = cart.map(item =>
        new Promise((resolve, reject) => {
          // Vérifier le stock
          db.query(
            'SELECT quantite FROM medicaments WHERE id_medicament = ? FOR UPDATE',
            [item.id],
            (err, results) => {
              if (err || results.length === 0) {
                console.error('Erreur lors de la vérification du stock :', err);
                return reject('Médicament introuvable ou erreur interne');
              }

              const availableQuantity = results[0].quantite;

              if (availableQuantity < item.quantity) {
                return reject(`Stock insuffisant pour le médicament ID ${item.id}`);
              }

              // Ajouter un détail de commande
              db.query(
                'INSERT INTO commandesdetails (id_commande, id_medicament, quantite, prix_total) VALUES (?, ?, ?, ?)',
                [commandeId, item.id, item.quantity, item.totalPrice],
                (err) => {
                  if (err) {
                    console.error('Erreur lors de l\'ajout des détails :', err);
                    return reject(err);
                  }

                  // Mettre à jour le stock
                  db.query(
                    'UPDATE medicaments SET quantite = quantite - ? WHERE id_medicament = ?',
                    [item.quantity, item.id],
                    (err) => {
                      if (err) {
                        console.error('Erreur lors de la mise à jour des stocks :', err);
                        return reject(err);
                      }
                      resolve();
                    }
                  );
                }
              );
            }
          );
        })
      );

      // Exécuter toutes les tâches d'insertion et mise à jour
      Promise.all(tasks)
        .then(() => res.status(201).send('Commande ajoutée avec succès.'))
        .catch(err => res.status(500).send(`Erreur lors de la commande : ${err}`));
    }
  );
});





// Route pour récupérer tous les médicaments
app.get('/manage-medicament', (req, res) => {
  const query = `
    SELECT id_medicament, nom, description, prix, quantite, id_lot, date_expiration, fournisseur_email, image 
    FROM medicaments
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des médicaments :', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération des médicaments.' });
    }
    res.json(results); // Retourne les médicaments sous forme de JSON
  });
});

// Route pour servir les images des médicaments
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route pour afficher les médicaments dans l'interface
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
  




app.get('/medecins', (req, res) => {
  const query = 'SELECT * FROM medecins';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des médecins :', err);
      return res.status(500).send('Erreur du serveur');
    }
    res.render('medecins', { medecins: results });
  });
});





// Route de déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return handleError(res, err);
    res.clearCookie('sid'); // Nettoie le cookie de session
    res.redirect('/login');
  });
});

// Démarrer le serveur
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
