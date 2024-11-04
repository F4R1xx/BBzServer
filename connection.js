// Importações e configurações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

let isEditing = false;
let currentAnuncioId = null;

const form = document.getElementById('anuncioForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const modelo = document.getElementById('modelo').value;
  const preco = document.getElementById('preco').value;
  const fotos = document.getElementById('fotos').files;
  let fotoLinks = [];

  if (!isEditing && fotos.length === 0) {
    alert('Por favor, selecione pelo menos uma foto.');
    return;
  }

  if (fotos.length > 0) {
    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i];
      const fotoRef = storageRef(storage, `anuncios/${modelo}_${Date.now()}_${i + 1}`);
      const snapshot = await uploadBytes(fotoRef, foto);
      const downloadURL = await getDownloadURL(snapshot.ref);
      fotoLinks.push(downloadURL);
    }
  }

  const data = {
    modelo,
    preco,
    fotos: fotoLinks,
    habilitado: true
  };

  if (isEditing) {
    update(ref(database, `anuncios/${currentAnuncioId}`), data).then(() => {
      document.getElementById('status').innerText = "Anúncio atualizado com sucesso!";
      resetForm();
    }).catch((error) => {
      document.getElementById('status').innerText = `Erro ao atualizar anúncio: ${error.message}`;
    });
  } else {
    const anuncioRef = push(ref(database, 'anuncios'));
    set(anuncioRef, data).then(() => {
      document.getElementById('status').innerText = "Anúncio cadastrado com sucesso!";
      form.reset();
    }).catch((error) => {
      document.getElementById('status').innerText = `Erro ao cadastrar anúncio: ${error.message}`;
    });
  }
});

const anunciosContainer = document.getElementById('anunciosContainer');
onValue(ref(database, 'anuncios'), (snapshot) => {
  anunciosContainer.innerHTML = "";
  const anuncios = snapshot.val();
  if (anuncios) {
    Object.keys(anuncios).forEach((key) => {
      const anuncio = anuncios[key];
      const anuncioElement = document.createElement('div');
      anuncioElement.classList.add('anuncio');
      anuncioElement.classList.toggle('disabled', !anuncio.habilitado);
      anuncioElement.innerHTML = `
        <h3>${anuncio.modelo}</h3>
        <p>Preço: R$ ${anuncio.preco}</p>
        <div class="fotos">
          ${anuncio.fotos.map(foto => `<img src="${foto}" alt="Foto de ${anuncio.modelo}" width="150">`).join('')}
        </div>
        <div class="actions">
          <input type="checkbox" id="toggle-${key}" ${anuncio.habilitado ? 'checked' : ''}>
          <label for="toggle-${key}">Habilitado</label>
          <button class="edit-button" id="edit-${key}">Editar</button>
          <button class="delete-button" id="delete-${key}">Excluir</button>
        </div>
      `;

      document.getElementById(`toggle-${key}`).addEventListener('change', (e) => {
        const habilitado = e.target.checked;
        update(ref(database, `anuncios/${key}`), { habilitado });
        anuncioElement.classList.toggle('disabled', !habilitado);
      });

      document.getElementById(`delete-${key}`).addEventListener('click', async () => {
        await deleteObject(storageRef(storage, `anuncios/${anuncio.fotos}`));
        remove(ref(database, `anuncios/${key}`));
      });

      document.getElementById(`edit-${key}`).addEventListener('click', () => {
        isEditing = true;
        currentAnuncioId = key;
        document.getElementById('formTitle').innerText = "Editar Anúncio";
        document.getElementById('submitButton').innerText = "Salvar Alterações";
        document.getElementById('cancelEditButton').style.display = "block";
        document.getElementById('modelo').value = anuncio.modelo;
        document.getElementById('preco').value = anuncio.preco;
      });

      anunciosContainer.appendChild(anuncioElement);
    });
  } else {
    anunciosContainer.innerHTML = "<p>Sem anúncios cadastrados</p>";
  }
});

function resetForm() {
  isEditing = false;
  currentAnuncioId = null;
  document.getElementById('formTitle').innerText = "Cadastrar Novo Anúncio";
  document.getElementById('submitButton').innerText = "Cadastrar Anúncio";
  document.getElementById('cancelEditButton').style.display = "none";
  form.reset();
  document.getElementById('status').innerText = "";
}
