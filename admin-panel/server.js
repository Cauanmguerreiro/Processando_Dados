const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();

// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Conectado'))
  .catch((err) => console.log('Erro ao conectar ao MongoDB:', err));


// Definindo o Schema e modelo para Post
const PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  date: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', PostSchema);

// Configurações do servidor
const port = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true,
}));

// Conectar ao MongoDB usando o MongoClient (opcional, já conectado pelo mongoose)
async function run() {
  try {
    const client = new MongoClient(process.env.MONGO_URI, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
    });
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    await client.close();
  } catch (err) {
    console.log(err);
  }
}
run();

// Rota de login
app.get('/admin/login', (req, res) => {
  res.send(`
    <form method="POST" action="/admin/login">
      <input type="text" name="username" placeholder="Usuário">
      <input type="password" name="password" placeholder="Senha">
      <button type="submit">Entrar</button>
    </form>
  `);
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const storedPasswordHash = '$2a$10$V9wqoyqzVtHTdrGbsI91je/OY2gIgg0mvVJ7dA5htWHiC7EjRsmrS'; // senha123

  bcrypt.compare(password, storedPasswordHash, (err, isMatch) => {
    if (err) return res.status(500).send('Erro ao comparar senhas');
    if (isMatch) {
      req.session.loggedIn = true;
      return res.redirect('/admin/dashboard');
    }
    res.send('Credenciais inválidas');
  });
});

// Rota para exibir posts
app.get('/admin/posts', (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect('/admin/login');
  }
  Post.find()
    .then(posts => {
      res.send(`
        <h1>Postagens</h1>
        <ul>
          ${posts.map(post => `<li><h3>${post.title}</h3><p>${post.content}</p></li>`).join('')}
        </ul>
        <a href="/admin/create-post">Criar Novo Post</a>
      `);
    })
    .catch((err) => res.status(500).send('Erro ao carregar postagens: ' + err));
});

// Rota do painel de administração
app.get('/admin/dashboard', (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect('/admin/login');
  }
  res.send(`
    <h1>Painel de Administração</h1>
    <a href="/admin/posts">Ver Postagens</a><br>
    <a href="/admin/create-post">Criar Post</a><br>
    <a href="/admin/logout">Logout</a>
  `);
});

// Rota de criação de post
app.get('/admin/create-post', (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect('/admin/login');
  }
  res.send(`
    <form method="POST" action="/admin/create-post">
      <input type="text" name="title" placeholder="Título do Post" required><br>
      <textarea name="content" placeholder="Conteúdo do Post" required></textarea><br>
      <button type="submit">Criar Post</button>
    </form>
  `);
});

app.post('/admin/create-post', (req, res) => {
  const newPost = new Post({
    title: req.body.title,
    content: req.body.content
  });

  newPost.save()
    .then(() => res.redirect('/admin/posts'))
    .catch((err) => res.status(500).send('Erro ao criar post: ' + err));
});

// Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
