// ==================== CONFIGURACIÓN ====================
const API_URL = "https://script.google.com/macros/s/AKfycbyROlORA0kKffdOW1w-uUHIRntakE7qR1RwxF5iq85x-wfB5xTMbgXF2WiaVGWsRsJr/exec";

// ==================== ESTADO GLOBAL ====================
let registros = [];            // Los equipos ya vienen parseados a array
let equiposTemporales = [];
let currentTab = 'registro';
let filters = { piso: '', departamento: '', area: '', responsable: '' };

// Sesión
let currentUser = null;

// ==================== CATÁLOGOS (localStorage) ====================
const STORAGE_KEY = 'catalogosINDRHI';
const USERS_KEY = 'usuariosINDRHI';
let catalogos = {
  departamentos: [],
  areas: [],          // { nombre, departamento }
  tiposEquipo: [],
  marcas: [],         // { nombre, tipoEquipo }
  modelos: []         // { nombre, marca }
};

// ==================== ELEMENTOS DOM ====================
// Login
const loginOverlay = document.getElementById('login-overlay');
const btnOperador = document.getElementById('btn-operador');
const btnAdmin = document.getElementById('btn-admin');
const adminLoginForm = document.getElementById('admin-login-form');
const btnVolver = document.getElementById('btn-volver');
const loginUsuario = document.getElementById('login-usuario');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const userInfo = document.getElementById('user-info');
const userNameDisplay = document.getElementById('user-name-display');
const btnLogout = document.getElementById('btn-logout');
const tabConfigBtn = document.getElementById('tab-config-btn');

// Registro – ubicación
const formEdificio = document.getElementById('edificio');
const formPiso = document.getElementById('piso');
const selectDepartamento = document.getElementById('departamento');
const selectArea = document.getElementById('area');
const formAsignado = document.getElementById('asignado');
const formCargo = document.getElementById('cargo');

// Equipos
const tipoEquipo = document.getElementById('tipo-equipo');
const selectMarcaEquipo = document.getElementById('marca-equipo');
const selectModeloEquipo = document.getElementById('modelo-equipo');
const serieEquipo = document.getElementById('serie-equipo');
const activoEquipo = document.getElementById('activo-equipo');
const btnAgregarEquipo = document.getElementById('btn-agregar-equipo');
const equiposTempList = document.getElementById('equipos-temp-list');
const btnGuardar = document.getElementById('btn-guardar');
const btnLimpiarForm = document.getElementById('btn-limpiar-form');
const formStatus = document.getElementById('form-status');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const filtersBar = document.getElementById('filters-bar');

// Filtros
const filterPiso = document.getElementById('filter-piso');
const filterDepartamento = document.getElementById('filter-departamento');
const filterArea = document.getElementById('filter-area');
const filterResponsable = document.getElementById('filter-responsable');
const btnClearFilters = document.getElementById('btn-clear-filters');

// Containers
const statsContainer = document.getElementById('stats-container');
const dashboardTableContainer = document.getElementById('table-container-dashboard');
const reportesTableContainer = document.getElementById('table-container-reportes');
const btnExportCSV = document.getElementById('btn-export-csv');

// Configuración catálogos
const tipoEquipoInput = document.getElementById('tipo-equipo-input');
const btnTipoAdd = document.getElementById('btn-tipo-add');
const tipoEquipoList = document.getElementById('tipo-equipo-list');
const marcaTipoSelect = document.getElementById('marca-tipo-select');
const marcaInput = document.getElementById('marca-catalogo-input');
const btnMarcaAdd = document.getElementById('btn-marca-add');
const marcaList = document.getElementById('marca-catalogo-list');
const modeloMarcaSelect = document.getElementById('modelo-marca-select');
const modeloInput = document.getElementById('modelo-catalogo-input');
const btnModeloAdd = document.getElementById('btn-modelo-add');
const modeloList = document.getElementById('modelo-catalogo-list');
const depInput = document.getElementById('dep-catalogo-input');
const btnDepAdd = document.getElementById('btn-dep-add');
const depList = document.getElementById('dep-catalogo-list');
const areaDeptoSelect = document.getElementById('area-depto-select');
const areaInput = document.getElementById('area-catalogo-input');
const btnAreaAdd = document.getElementById('btn-area-add');
const areaList = document.getElementById('area-catalogo-list');

// CSV
const csvTipoImport = document.getElementById('csv-tipo-import');
const csvFileInput = document.getElementById('csv-file-input');
const btnImportCSV = document.getElementById('btn-import-csv');
const csvStatus = document.getElementById('csv-status');

// Admin usuarios
const adminUsuario = document.getElementById('admin-usuario');
const adminPassword = document.getElementById('admin-password');
const adminRol = document.getElementById('admin-rol');
const btnAgregarUsuario = document.getElementById('btn-agregar-usuario');
const usuariosTableContainer = document.getElementById('usuarios-table-container');

// ==================== UTILIDADES GENERALES ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalizarPalabras(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Debounce para eventos de alta frecuencia
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  cargarCatalogosDesdeStorage();
  inicializarUsuariosPorDefecto();
  verificarSesion();
  setupLoginListeners();
  setupTabs();
  setupFilters();
  cargarRegistros();

  // Listeners de catálogos
  btnTipoAdd.addEventListener('click', () => agregarElementoCatalogo('tiposEquipo', tipoEquipoInput.value.trim(), null, tipoEquipoInput, tipoEquipoList));
  btnMarcaAdd.addEventListener('click', () => agregarElementoCatalogo('marcas', marcaInput.value.trim(), marcaTipoSelect.value, marcaInput, marcaList));
  btnModeloAdd.addEventListener('click', () => agregarElementoCatalogo('modelos', modeloInput.value.trim(), modeloMarcaSelect.value, modeloInput, modeloList));
  btnDepAdd.addEventListener('click', () => agregarElementoCatalogo('departamentos', depInput.value.trim(), null, depInput, depList));
  btnAreaAdd.addEventListener('click', () => agregarElementoCatalogo('areas', areaInput.value.trim(), areaDeptoSelect.value, areaInput, areaList));

  // Enter en inputs
  [tipoEquipoInput, marcaInput, modeloInput, depInput, areaInput].forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.nextElementSibling?.click(); });
  });

  // Dependencias en formulario
  selectDepartamento.addEventListener('change', filtrarAreasFormulario);
  tipoEquipo.addEventListener('change', actualizarMarcasPorTipo);
  selectMarcaEquipo.addEventListener('change', actualizarModelosPorMarca);

  // CSV
  btnImportCSV.addEventListener('click', importarCSV);

  // Admin usuarios
  btnAgregarUsuario.addEventListener('click', agregarUsuarioDesdeConfig);

  // Logout
  btnLogout.addEventListener('click', logout);

  // Poblar selects al iniciar
  poblarSelectsCatalogo();
});

// ==================== AUTENTICACIÓN Y SESIÓN ====================
function inicializarUsuariosPorDefecto() {
  let usuarios = obtenerUsuarios();
  if (usuarios.length === 0) {
    usuarios.push({
      usuario: 'admin',
      password: 'admin',
      rol: 'admin',
      permisos: { exportar: true, editar: true, eliminar: true }
    });
    guardarUsuarios(usuarios);
  }
}

function obtenerUsuarios() {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function guardarUsuarios(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function verificarSesion() {
  const sesion = localStorage.getItem('sesionINDRHI');
  if (sesion) {
    currentUser = JSON.parse(sesion);
    loginOverlay.style.display = 'none';
    mostrarInfoUsuario();
    ajustarUIporRol();
  } else {
    loginOverlay.style.display = 'flex';
  }
}

function setupLoginListeners() {
  btnOperador.addEventListener('click', () => {
    currentUser = { usuario: 'operador', rol: 'operador', permisos: { exportar: false, editar: true, eliminar: false } };
    localStorage.setItem('sesionINDRHI', JSON.stringify(currentUser));
    loginOverlay.style.display = 'none';
    mostrarInfoUsuario();
    ajustarUIporRol();
    switchTab('registro');
  });

  btnAdmin.addEventListener('click', () => {
    document.getElementById('login-buttons').style.display = 'none';
    adminLoginForm.style.display = 'flex';
  });

  btnVolver.addEventListener('click', () => {
    document.getElementById('login-buttons').style.display = 'flex';
    adminLoginForm.style.display = 'none';
    loginError.style.display = 'none';
  });

  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const usuario = loginUsuario.value.trim();
    const pass = loginPassword.value.trim();
    if (!usuario || !pass) {
      loginError.textContent = 'Complete todos los campos.';
      loginError.style.display = 'block';
      return;
    }
    const usuarios = obtenerUsuarios();
    const user = usuarios.find(u => u.usuario === usuario && u.password === pass);
    if (!user) {
      loginError.textContent = 'Credenciales inválidas.';
      loginError.style.display = 'block';
      return;
    }
    currentUser = { usuario: user.usuario, rol: user.rol, permisos: user.permisos };
    localStorage.setItem('sesionINDRHI', JSON.stringify(currentUser));
    loginOverlay.style.display = 'none';
    mostrarInfoUsuario();
    ajustarUIporRol();
    switchTab('registro');
    adminLoginForm.reset();
    document.getElementById('login-buttons').style.display = 'flex';
    adminLoginForm.style.display = 'none';
    loginError.style.display = 'none';
  });
}

function logout() {
  localStorage.removeItem('sesionINDRHI');
  currentUser = null;
  loginOverlay.style.display = 'flex';
  userInfo.style.display = 'none';
  document.getElementById('login-buttons').style.display = 'flex';
  adminLoginForm.style.display = 'none';
  ajustarUIporRol();
  switchTab('registro');
}

function mostrarInfoUsuario() {
  if (currentUser) {
    userInfo.style.display = 'flex';
    userNameDisplay.textContent = currentUser.usuario + (currentUser.rol === 'admin' ? ' (Admin)' : ' (Operador)');
  }
}

function ajustarUIporRol() {
  if (!currentUser) {
    tabConfigBtn.style.display = 'none';
    btnExportCSV.style.display = 'none';
    return;
  }
  const esAdmin = currentUser.rol === 'admin';
  tabConfigBtn.style.display = esAdmin ? 'inline-flex' : 'none';
  btnExportCSV.style.display = currentUser.permisos.exportar ? 'inline-flex' : 'none';

  if (currentTab === 'configuracion' && !esAdmin) {
    switchTab('registro');
  }
  actualizarVista();
}

// ==================== CRUD DE USUARIOS ====================
function agregarUsuarioDesdeConfig() {
  const usuario = adminUsuario.value.trim();
  const password = adminPassword.value.trim();
  const rol = adminRol.value;
  if (!usuario || !password) return alert('Usuario y contraseña son obligatorios.');
  let usuarios = obtenerUsuarios();
  if (usuarios.find(u => u.usuario === usuario)) return alert('Ese nombre de usuario ya existe.');
  const permisos = { exportar: rol === 'admin', editar: true, eliminar: rol === 'admin' };
  usuarios.push({ usuario, password, rol, permisos });
  guardarUsuarios(usuarios);
  adminUsuario.value = '';
  adminPassword.value = '';
  renderTablaUsuariosConfig();
}

function eliminarUsuarioDesdeConfig(usuario) {
  if (usuario === 'admin') return alert('No se puede eliminar al superusuario admin.');
  if (!confirm(`¿Eliminar al usuario "${usuario}"?`)) return;
  let usuarios = obtenerUsuarios();
  usuarios = usuarios.filter(u => u.usuario !== usuario);
  guardarUsuarios(usuarios);
  renderTablaUsuariosConfig();
}

function renderTablaUsuariosConfig() {
  if (!usuariosTableContainer) return;
  const usuarios = obtenerUsuarios();
  if (usuarios.length === 0) {
    usuariosTableContainer.innerHTML = '<p style="text-align:center;padding:10px;">No hay usuarios creados.</p>';
    return;
  }
  let html = `<table><thead><tr><th>Usuario</th><th>Rol</th><th style="width:50px;">Acción</th></tr></thead><tbody>`;
  usuarios.forEach(u => {
    html += `<tr>
      <td>${escapeHtml(u.usuario)}</td>
      <td>${u.rol === 'admin' ? 'Administrador' : 'Operador'}</td>
      <td><button class="btn btn-delete" onclick="eliminarUsuarioDesdeConfig('${escapeHtml(u.usuario)}')">🗑️</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  usuariosTableContainer.innerHTML = html;
}

// ==================== MANEJO DE CATÁLOGOS JERÁRQUICOS ====================
function cargarCatalogosDesdeStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      catalogos = JSON.parse(stored);
    } catch (e) {
      catalogos = { departamentos: [], areas: [], tiposEquipo: [], marcas: [], modelos: [] };
    }
  }
  if (!catalogos.tiposEquipo) catalogos.tiposEquipo = [];
  if (!Array.isArray(catalogos.marcas)) catalogos.marcas = [];
  else catalogos.marcas = catalogos.marcas.map(m => typeof m === 'string' ? { nombre: m, tipoEquipo: '' } : m);
  if (!Array.isArray(catalogos.modelos)) catalogos.modelos = [];
  else catalogos.modelos = catalogos.modelos.map(m => typeof m === 'string' ? { nombre: m, marca: '' } : m);
  guardarCatalogosEnStorage();
}

function guardarCatalogosEnStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogos));
}

function agregarElementoCatalogo(tipo, valor, padre, inputElement, listElement) {
  if (!valor) return alert('Ingrese un valor.');
  valor = valor.trim();
  if (tipo === 'tiposEquipo') {
    valor = capitalizarPalabras(valor);
    if (catalogos.tiposEquipo.includes(valor)) return alert('Ya existe ese tipo de equipo.');
    catalogos.tiposEquipo.push(valor);
    catalogos.tiposEquipo.sort();
  } else if (tipo === 'marcas') {
    if (!padre) return alert('Seleccione un tipo de equipo para la marca.');
    valor = valor.toUpperCase();
    if (catalogos.marcas.some(m => m.nombre === valor && m.tipoEquipo === padre)) return alert('Esa marca ya existe para ese tipo.');
    catalogos.marcas.push({ nombre: valor, tipoEquipo: padre });
    catalogos.marcas.sort((a,b) => a.nombre.localeCompare(b.nombre));
  } else if (tipo === 'modelos') {
    if (!padre) return alert('Seleccione una marca para el modelo.');
    valor = valor.toUpperCase();
    if (catalogos.modelos.some(m => m.nombre === valor && m.marca === padre)) return alert('Ese modelo ya existe para esa marca.');
    catalogos.modelos.push({ nombre: valor, marca: padre });
    catalogos.modelos.sort((a,b) => a.nombre.localeCompare(b.nombre));
  } else if (tipo === 'departamentos') {
    valor = capitalizarPalabras(valor);
    if (catalogos.departamentos.includes(valor)) return alert('Ya existe ese departamento.');
    catalogos.departamentos.push(valor);
    catalogos.departamentos.sort();
  } else if (tipo === 'areas') {
    if (!padre) return alert('Seleccione un departamento para el área.');
    valor = capitalizarPalabras(valor);
    if (catalogos.areas.some(a => a.nombre === valor && a.departamento === padre)) return alert('Ya existe esa área en ese departamento.');
    catalogos.areas.push({ nombre: valor, departamento: padre });
    catalogos.areas.sort((a,b) => a.nombre.localeCompare(b.nombre));
  }
  guardarCatalogosEnStorage();
  inputElement.value = '';
  if (tipo === 'areas') areaDeptoSelect.value = '';
  if (tipo === 'marcas') marcaTipoSelect.value = '';
  if (tipo === 'modelos') modeloMarcaSelect.value = '';
  renderizarListaCatalogo(tipo, listElement);
  // No poblar todos los selects; solo actualizar los necesarios cuando se requiera
}

function eliminarElementoCatalogo(tipo, valor, padre, listElement) {
  if (tipo === 'tiposEquipo') {
    catalogos.tiposEquipo = catalogos.tiposEquipo.filter(t => t !== valor);
    catalogos.marcas = catalogos.marcas.filter(m => m.tipoEquipo !== valor);
    catalogos.modelos = catalogos.modelos.filter(m => !catalogos.marcas.some(ma => ma.nombre === m.marca));
  } else if (tipo === 'marcas') {
    catalogos.marcas = catalogos.marcas.filter(m => !(m.nombre === valor && m.tipoEquipo === padre));
    catalogos.modelos = catalogos.modelos.filter(m => m.marca !== valor);
  } else if (tipo === 'modelos') {
    catalogos.modelos = catalogos.modelos.filter(m => !(m.nombre === valor && m.marca === padre));
  } else if (tipo === 'departamentos') {
    catalogos.departamentos = catalogos.departamentos.filter(d => d !== valor);
    catalogos.areas = catalogos.areas.filter(a => a.departamento !== valor);
  } else if (tipo === 'areas') {
    catalogos.areas = catalogos.areas.filter(a => !(a.nombre === valor && a.departamento === padre));
  }
  guardarCatalogosEnStorage();
  renderizarListaCatalogo(tipo, listElement);
  // No poblar todos los selects; solo actualizar los necesarios cuando se requiera
}

function renderizarListaCatalogo(tipo, listElement) {
  let items = [];
  if (tipo === 'tiposEquipo') {
    items = catalogos.tiposEquipo.map(t => `<li class="catalog-item"><span>${escapeHtml(t)}</span> <button class="btn-remove-item" onclick="eliminarElementoCatalogo('tiposEquipo','${escapeHtml(t)}', null, document.getElementById('tipo-equipo-list'))">✕</button></li>`);
  } else if (tipo === 'marcas') {
    items = catalogos.marcas.map(m => `<li class="catalog-item"><span>${escapeHtml(m.nombre)} <small>(${escapeHtml(m.tipoEquipo)})</small></span> <button class="btn-remove-item" onclick="eliminarElementoCatalogo('marcas','${escapeHtml(m.nombre)}','${escapeHtml(m.tipoEquipo)}', document.getElementById('marca-catalogo-list'))">✕</button></li>`);
  } else if (tipo === 'modelos') {
    items = catalogos.modelos.map(m => `<li class="catalog-item"><span>${escapeHtml(m.nombre)} <small>(${escapeHtml(m.marca)})</small></span> <button class="btn-remove-item" onclick="eliminarElementoCatalogo('modelos','${escapeHtml(m.nombre)}','${escapeHtml(m.marca)}', document.getElementById('modelo-catalogo-list'))">✕</button></li>`);
  } else if (tipo === 'departamentos') {
    items = catalogos.departamentos.map(d => `<li class="catalog-item"><span>${escapeHtml(d)}</span> <button class="btn-remove-item" onclick="eliminarElementoCatalogo('departamentos','${escapeHtml(d)}', null, document.getElementById('dep-catalogo-list'))">✕</button></li>`);
  } else if (tipo === 'areas') {
    items = catalogos.areas.map(a => `<li class="catalog-item"><span>${escapeHtml(a.nombre)} (${escapeHtml(a.departamento)})</span> <button class="btn-remove-item" onclick="eliminarElementoCatalogo('areas','${escapeHtml(a.nombre)}','${escapeHtml(a.departamento)}', document.getElementById('area-catalogo-list'))">✕</button></li>`);
  }
  const fragment = document.createDocumentFragment();
  const ul = document.createElement('ul');
  ul.className = 'catalog-list';
  ul.innerHTML = items.join('') || '<p class="placeholder-text">No hay elementos.</p>';
  fragment.appendChild(ul);
  listElement.innerHTML = '';
  listElement.appendChild(fragment);
}

// ==================== POBLADO DE SELECTS (SOLO CUANDO SEA NECESARIO) ====================
function poblarSelectsCatalogo() {
  // Solo se llama al iniciar, al importar CSV o al cambiar a la pestaña registro
  poblarSelectTiposEquipo();
  actualizarMarcasPorTipo();
  actualizarModelosPorMarca();
  poblarSelectDepartamentos();
  filtrarAreasFormulario();
  poblarSelectsConfiguracion();
}

function poblarSelectTiposEquipo() {
  tipoEquipo.innerHTML = '<option value="">Tipo...</option>' +
    catalogos.tiposEquipo.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

function poblarSelectDepartamentos() {
  selectDepartamento.innerHTML = '<option value="">Seleccione...</option>' +
    catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

function poblarSelectsConfiguracion() {
  // Selects de la pestaña Configuración
  if (marcaTipoSelect) {
    marcaTipoSelect.innerHTML = '<option value="">Seleccione tipo de equipo</option>' +
      catalogos.tiposEquipo.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  }
  if (modeloMarcaSelect) {
    modeloMarcaSelect.innerHTML = '<option value="">Seleccione marca</option>' +
      catalogos.marcas.map(m => `<option value="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)} (${escapeHtml(m.tipoEquipo)})</option>`).join('');
  }
  if (areaDeptoSelect) {
    areaDeptoSelect.innerHTML = '<option value="">Seleccione departamento</option>' +
      catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  }
}

function actualizarMarcasPorTipo() {
  const tipoSeleccionado = tipoEquipo.value;
  selectMarcaEquipo.disabled = !tipoSeleccionado;
  selectMarcaEquipo.innerHTML = '<option value="">Marca...</option>';
  selectModeloEquipo.disabled = true;
  selectModeloEquipo.innerHTML = '<option value="">Modelo...</option>';
  if (tipoSeleccionado) {
    const marcasFiltradas = catalogos.marcas.filter(m => m.tipoEquipo === tipoSeleccionado);
    selectMarcaEquipo.innerHTML += marcasFiltradas.map(m => `<option value="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)}</option>`).join('');
  }
}

function actualizarModelosPorMarca() {
  const marcaSeleccionada = selectMarcaEquipo.value;
  selectModeloEquipo.disabled = !marcaSeleccionada;
  selectModeloEquipo.innerHTML = '<option value="">Modelo...</option>';
  if (marcaSeleccionada) {
    const modelosFiltrados = catalogos.modelos.filter(m => m.marca === marcaSeleccionada);
    selectModeloEquipo.innerHTML += modelosFiltrados.map(m => `<option value="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)}</option>`).join('');
  }
}

function filtrarAreasFormulario() {
  const deptoSeleccionado = selectDepartamento.value;
  if (!deptoSeleccionado) {
    selectArea.innerHTML = '<option value="">Seleccione departamento primero</option>';
    selectArea.disabled = true;
    return;
  }
  selectArea.disabled = false;
  const areasFiltradas = catalogos.areas.filter(a => a.departamento === deptoSeleccionado);
  selectArea.innerHTML = '<option value="">Seleccione...</option>' +
    areasFiltradas.map(a => `<option value="${escapeHtml(a.nombre)}">${escapeHtml(a.nombre)}</option>`).join('');
}

// ==================== IMPORTACIÓN CSV (ASÍNCRONA EN CHUNKS) ====================
function importarCSV() {
  const file = csvFileInput.files[0];
  if (!file) {
    csvStatus.textContent = 'Seleccione un archivo CSV.';
    csvStatus.className = 'status-message error';
    return;
  }

  const tipo = csvTipoImport.value;
  csvStatus.textContent = 'Leyendo archivo...';
  csvStatus.className = 'status-message loading';

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lineas = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lineas.length < 2) throw new Error('El archivo está vacío o no tiene datos.');

      // Preparar índices rápidos (Set/Map) para eliminar búsquedas O(n)
      const tiposSet = new Set(catalogos.tiposEquipo);
      const marcasMap = new Map(); // clave: tipo + '||' + marca
      catalogos.marcas.forEach(m => marcasMap.set(m.tipoEquipo + '||' + m.nombre, true));
      const modelosMap = new Map(); // clave: marca + '||' + modelo
      catalogos.modelos.forEach(m => modelosMap.set(m.marca + '||' + m.nombre, true));
      const deptosSet = new Set(catalogos.departamentos);
      const areasMap = new Map(); // clave: depto + '||' + area
      catalogos.areas.forEach(a => areasMap.set(a.departamento + '||' + a.nombre, true));

      // Acumuladores de nuevos elementos para agregar al final
      const nuevos = {
        tiposEquipo: [],
        marcas: [],
        modelos: [],
        departamentos: [],
        areas: []
      };

      const CHUNK_SIZE = 200;
      let currentIndex = 1; // saltar cabecera
      const totalLineas = lineas.length - 1;

      function procesarChunk() {
        const end = Math.min(currentIndex + CHUNK_SIZE, lineas.length);
        for (let i = currentIndex; i < end; i++) {
          const campos = parsearLineaCSV(lineas[i]);
          if (campos.length === 0) continue;

          if (tipo === 'equipos') {
            if (campos.length < 3) continue;
            const tipoEq = capitalizarPalabras(campos[0].trim());
            const marca = campos[1].trim().toUpperCase();
            const modelo = campos[2].trim().toUpperCase();
            if (!tipoEq || !marca || !modelo) continue;

            if (!tiposSet.has(tipoEq)) {
              tiposSet.add(tipoEq);
              nuevos.tiposEquipo.push(tipoEq);
            }
            const claveMarca = tipoEq + '||' + marca;
            if (!marcasMap.has(claveMarca)) {
              marcasMap.set(claveMarca, true);
              nuevos.marcas.push({ nombre: marca, tipoEquipo: tipoEq });
            }
            const claveModelo = marca + '||' + modelo;
            if (!modelosMap.has(claveModelo)) {
              modelosMap.set(claveModelo, true);
              nuevos.modelos.push({ nombre: modelo, marca: marca });
            }
          } else if (tipo === 'ubicaciones') {
            if (campos.length < 2) continue;
            const depto = capitalizarPalabras(campos[0].trim());
            const area = capitalizarPalabras(campos[1].trim());
            if (!depto || !area) continue;

            if (!deptosSet.has(depto)) {
              deptosSet.add(depto);
              nuevos.departamentos.push(depto);
            }
            const claveArea = depto + '||' + area;
            if (!areasMap.has(claveArea)) {
              areasMap.set(claveArea, true);
              nuevos.areas.push({ nombre: area, departamento: depto });
            }
          }
        }
        currentIndex = end;

        const progreso = Math.round((currentIndex - 1) / totalLineas * 100);
        csvStatus.textContent = `Procesando... ${progreso}%`;
        csvStatus.className = 'status-message loading';

        if (currentIndex < lineas.length) {
          setTimeout(procesarChunk, 0); // ceder el hilo principal
        } else {
          finalizarImportacion(nuevos, tipo);
        }
      }

      procesarChunk();
    } catch (error) {
      console.error(error);
      csvStatus.textContent = 'Error: ' + error.message;
      csvStatus.className = 'status-message error';
    }
  };

  reader.onerror = function() {
    csvStatus.textContent = 'Error al leer el archivo.';
    csvStatus.className = 'status-message error';
  };

  reader.readAsText(file, 'UTF-8');
}

function finalizarImportacion(nuevos, tipo) {
  if (tipo === 'equipos') {
    catalogos.tiposEquipo.push(...nuevos.tiposEquipo);
    catalogos.marcas.push(...nuevos.marcas);
    catalogos.modelos.push(...nuevos.modelos);
    catalogos.tiposEquipo.sort();
    catalogos.marcas.sort((a,b) => a.nombre.localeCompare(b.nombre));
    catalogos.modelos.sort((a,b) => a.nombre.localeCompare(b.nombre));
  } else {
    catalogos.departamentos.push(...nuevos.departamentos);
    catalogos.areas.push(...nuevos.areas);
    catalogos.departamentos.sort();
    catalogos.areas.sort((a,b) => a.nombre.localeCompare(b.nombre));
  }
  guardarCatalogosEnStorage();
  poblarSelectsCatalogo(); // Refrescar los selects ahora sí
  csvFileInput.value = '';
  const total = nuevos.tiposEquipo.length + nuevos.marcas.length + nuevos.modelos.length +
                nuevos.departamentos.length + nuevos.areas.length;
  csvStatus.textContent = `✅ Importados ${total} elementos sin duplicados.`;
  csvStatus.className = 'status-message success';
  setTimeout(() => { csvStatus.textContent = ''; }, 4000);
}

function parsearLineaCSV(linea) {
  const resultado = [];
  let campo = '';
  let dentroDeComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const caracter = linea[i];
    if (dentroDeComillas) {
      if (caracter === '"') {
        if (i + 1 < linea.length && linea[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeComillas = false;
        }
      } else {
        campo += caracter;
      }
    } else {
      if (caracter === '"') {
        dentroDeComillas = true;
      } else if (caracter === ',') {
        resultado.push(campo.trim());
        campo = '';
      } else {
        campo += caracter;
      }
    }
  }
  resultado.push(campo.trim());
  return resultado;
}

// ==================== PESTAÑAS ====================
function setupTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'configuracion' && (!currentUser || currentUser.rol !== 'admin')) return;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  currentTab = tab;
  tabBtns.forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  tabContents.forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (tab === 'dashboard' || tab === 'reportes') {
    filtersBar.style.display = 'block';
  } else {
    filtersBar.style.display = 'none';
  }

  if (tab === 'configuracion') {
    renderizarListasConfiguracion();
    renderTablaUsuariosConfig();
    poblarSelectsConfiguracion(); // solo los de configuración
  }

  if (tab === 'registro') {
    // Al volver a registro, aseguramos que los selects reflejen los catálogos actualizados
    poblarSelectsCatalogo();
  }

  actualizarVista();
}

function renderizarListasConfiguracion() {
  renderizarListaCatalogo('tiposEquipo', tipoEquipoList);
  renderizarListaCatalogo('marcas', marcaList);
  renderizarListaCatalogo('modelos', modeloList);
  renderizarListaCatalogo('departamentos', depList);
  renderizarListaCatalogo('areas', areaList);
}

// ==================== FILTROS (CON DEBOUNCE) ====================
function setupFilters() {
  const debouncedActualizar = debounce(() => {
    actualizarVista();
  }, 350);

  filterPiso.addEventListener('input', () => {
    filters.piso = filterPiso.value.trim().toLowerCase();
    debouncedActualizar();
  });
  filterDepartamento.addEventListener('input', () => {
    filters.departamento = filterDepartamento.value.trim().toLowerCase();
    debouncedActualizar();
  });
  filterArea.addEventListener('input', () => {
    filters.area = filterArea.value.trim().toLowerCase();
    debouncedActualizar();
  });
  filterResponsable.addEventListener('input', () => {
    filters.responsable = filterResponsable.value.trim().toLowerCase();
    debouncedActualizar();
  });
  btnClearFilters.addEventListener('click', limpiarFiltros);
}

function limpiarFiltros() {
  filterPiso.value = '';
  filterDepartamento.value = '';
  filterArea.value = '';
  filterResponsable.value = '';
  filters = { piso: '', departamento: '', area: '', responsable: '' };
  actualizarVista();
}

// ==================== FETCH ====================
async function fetchGetRegistros() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}

async function fetchPost(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ==================== CARGA DE DATOS CON PARSEO ÚNICO ====================
async function cargarRegistros() {
  try {
    const datos = await fetchGetRegistros();
    // Parsear equipos una sola vez y cachear como array
    registros = datos.map(r => ({
      ...r,
      equipos: parseEquipos(r.equipos) // siempre array
    }));
    actualizarFiltrosDatalist();
    actualizarVista();
  } catch (error) {
    console.error(error);
    alert('Error de conexión. Verifica tu red o la URL.');
  }
}

// ==================== PARSEO DE EQUIPOS (SIMPLE, YA QUE VIENE CACHEADO) ====================
function parseEquipos(equipos) {
  if (!equipos) return [];
  if (typeof equipos === 'string') {
    try { return JSON.parse(equipos); } catch (e) { return []; }
  }
  return equipos; // ya es array
}

// ==================== CRUD ESTACIONES ====================
async function guardarEstacion() {
  if (!formEdificio.value) return mostrarStatus('error', 'Selecciona un edificio.');
  if (!selectDepartamento.value) return mostrarStatus('error', 'El departamento es obligatorio.');
  if (!formAsignado.value.trim()) return mostrarStatus('error', 'El campo "A quién fue asignado" es obligatorio.');
  if (equiposTemporales.length === 0) return mostrarStatus('error', 'Agrega al menos un equipo.');

  const nuevaEstacion = {
    edificio: formEdificio.value,
    piso: formPiso.value.trim(),
    departamento: capitalizarPalabras(selectDepartamento.value),
    area: capitalizarPalabras(selectArea.value),
    asignado: capitalizarPalabras(formAsignado.value.trim()),
    cargo: capitalizarPalabras(formCargo.value.trim()),
    equipos: equiposTemporales // array
  };

  const tempId = 'temp_' + Date.now();
  const tempFecha = new Date().toLocaleString('es-DO');
  const registroOptimista = {
    id: tempId,
    ...nuevaEstacion,
    equipos: nuevaEstacion.equipos, // ya es array, no string
    fecha: tempFecha
  };

  registros.unshift(registroOptimista);
  limpiarSeccionUsuarioYEquipos();
  actualizarVista();
  actualizarFiltrosDatalist();
  mostrarStatus('loading', 'Guardando...');

  try {
    // Enviar al API con equipos stringificados
    const payloadData = { ...nuevaEstacion, equipos: JSON.stringify(nuevaEstacion.equipos) };
    const resultado = await fetchPost({ action: 'save', data: payloadData });
    const index = registros.findIndex(r => r.id === tempId);
    if (index !== -1 && resultado.id) {
      registros[index].id = resultado.id;
      registros[index].fecha = resultado.fecha || tempFecha;
    }
    actualizarVista();
    actualizarFiltrosDatalist();
    mostrarStatus('success', '✅ Estación guardada exitosamente.');
    setTimeout(() => limpiarStatus(), 3000);
  } catch (error) {
    registros = registros.filter(r => r.id !== tempId);
    actualizarVista();
    actualizarFiltrosDatalist();
    mostrarStatus('error', 'Error al guardar. Intenta de nuevo.');
  }
}

async function eliminarEstacion(id) {
  if (!currentUser || !currentUser.permisos.eliminar) return alert('No tiene permiso para eliminar.');
  const registroEliminado = registros.find(r => r.id === id);
  registros = registros.filter(r => r.id !== id);
  actualizarVista();
  actualizarFiltrosDatalist();
  try {
    await fetchPost({ action: 'delete', id });
  } catch (error) {
    if (registroEliminado) registros.unshift(registroEliminado);
    actualizarVista();
    actualizarFiltrosDatalist();
    alert('Error al eliminar. Se revirtió el cambio.');
  }
}

// ==================== EQUIPOS TEMPORALES ====================
function agregarEquipoTemporal() {
  const tipo = tipoEquipo.value;
  if (!tipo) return alert('Selecciona el tipo de equipo.');
  const equipo = {
    tipo,
    marca: selectMarcaEquipo.value || '',
    modelo: selectModeloEquipo.value || '',
    serie: serieEquipo.value.trim().toUpperCase(),
    activo: activoEquipo.value.trim().toUpperCase()
  };
  equiposTemporales.push(equipo);
  renderEquiposTemporales();
  limpiarCamposEquipo();
  tipoEquipo.focus();
}

function eliminarEquipoTemporal(index) {
  equiposTemporales.splice(index, 1);
  renderEquiposTemporales();
}

function limpiarCamposEquipo() {
  tipoEquipo.value = '';
  selectMarcaEquipo.value = '';
  selectMarcaEquipo.disabled = true;
  selectModeloEquipo.value = '';
  selectModeloEquipo.disabled = true;
  serieEquipo.value = '';
  activoEquipo.value = '';
}

function renderEquiposTemporales() {
  if (equiposTemporales.length === 0) {
    equiposTempList.innerHTML = '<p class="placeholder-text">No hay equipos agregados aún.</p>';
    return;
  }
  equiposTempList.innerHTML = equiposTemporales.map((eq, i) => `
    <span class="equipo-tag">
      <span class="equipo-info">
        <strong>${escapeHtml(eq.tipo)}</strong>
        ${eq.marca ? ` | Marca: ${escapeHtml(eq.marca)}` : ''}
        ${eq.modelo ? ` | Mod: ${escapeHtml(eq.modelo)}` : ''}
        ${eq.serie ? ` | S/N: ${escapeHtml(eq.serie)}` : ''}
        ${eq.activo ? ` | Act: ${escapeHtml(eq.activo)}` : ''}
      </span>
      <button class="btn-remove-equipo" onclick="eliminarEquipoTemporal(${i})">&times;</button>
    </span>
  `).join('');
}

function limpiarSeccionUsuarioYEquipos() {
  formAsignado.value = '';
  formCargo.value = '';
  equiposTemporales = [];
  renderEquiposTemporales();
  limpiarCamposEquipo();
  limpiarStatus();
}

function limpiarFormulario() {
  formEdificio.value = '';
  formPiso.value = '';
  selectDepartamento.value = '';
  selectArea.value = '';
  selectArea.disabled = true;
  selectArea.innerHTML = '<option value="">Seleccione departamento primero</option>';
  formAsignado.value = '';
  formCargo.value = '';
  equiposTemporales = [];
  renderEquiposTemporales();
  limpiarCamposEquipo();
  limpiarStatus();
}

function mostrarStatus(tipo, msg) {
  formStatus.textContent = msg;
  formStatus.className = `status-message ${tipo}`;
}
function limpiarStatus() { formStatus.textContent = ''; formStatus.className = 'status-message'; }

// ==================== RENDERIZADO DE VISTAS ====================
function actualizarVista() {
  if (currentTab === 'registro' || currentTab === 'configuracion') return;
  const filtrados = aplicarFiltros(registros);
  // actualizarFiltrosDatalist NO se llama aquí; solo cuando los datos cambian
  if (currentTab === 'dashboard') {
    renderStats(filtrados);
    renderTable(dashboardTableContainer, filtrados, true);
  } else if (currentTab === 'reportes') {
    renderTable(reportesTableContainer, filtrados, false);
  }
}

function aplicarFiltros(data) {
  return data.filter(r => {
    const matchPiso = !filters.piso || (r.piso || '').toLowerCase().includes(filters.piso);
    const matchDepto = !filters.departamento || (r.departamento || '').toLowerCase().includes(filters.departamento);
    const matchArea = !filters.area || (r.area || '').toLowerCase().includes(filters.area);
    const respText = ((r.asignado || '') + ' ' + (r.cargo || '')).toLowerCase();
    const matchResp = !filters.responsable || respText.includes(filters.responsable);
    return matchPiso && matchDepto && matchArea && matchResp;
  });
}

function actualizarFiltrosDatalist() {
  // Solo se llama al cargar/guardar/eliminar registros
  const pisos = [...new Set(registros.map(r => r.piso).filter(Boolean))].sort();
  const deptos = [...new Set(registros.map(r => r.departamento).filter(Boolean))].sort();
  const areas = [...new Set(registros.map(r => r.area).filter(Boolean))].sort();
  const resp = [...new Set(registros.map(r => `${r.asignado||''} ${r.cargo||''}`.trim()).filter(Boolean))].sort();

  document.getElementById('datalist-filter-pisos').innerHTML = pisos.map(v => `<option value="${escapeHtml(v)}">`).join('');
  document.getElementById('datalist-filter-deptos').innerHTML = deptos.map(v => `<option value="${escapeHtml(v)}">`).join('');
  document.getElementById('datalist-filter-areas').innerHTML = areas.map(v => `<option value="${escapeHtml(v)}">`).join('');
  document.getElementById('datalist-filter-resp').innerHTML = resp.map(v => `<option value="${escapeHtml(v)}">`).join('');
}

function renderStats(data) {
  const totalEstaciones = data.length;
  const totalEquipos = data.reduce((sum, r) => sum + r.equipos.length, 0);
  const tipoCount = {};
  data.forEach(r => {
    r.equipos.forEach(eq => {
      tipoCount[eq.tipo] = (tipoCount[eq.tipo] || 0) + 1;
    });
  });
  const topTipos = Object.entries(tipoCount).sort((a,b) => b[1]-a[1]).slice(0,4);
  statsContainer.innerHTML = `
    <div class="stat-card"><h3>Total Estaciones</h3><div class="stat-value">${totalEstaciones}</div></div>
    <div class="stat-card"><h3>Total Equipos</h3><div class="stat-value">${totalEquipos}</div></div>
    ${topTipos.map(([tipo, cant]) => `
      <div class="stat-card"><h3>${tipo}</h3><div class="stat-value">${cant}</div></div>
    `).join('')}
  `;
}

function renderTable(container, data, isDashboard = false) {
  if (data.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:20px;">No se encontraron registros.</p>';
    return;
  }
  const puedeEliminar = currentUser && currentUser.permisos.eliminar;
  let html = `
    <table>
      <thead>
        <tr>
          <th>Edificio</th><th>Piso</th><th>Depto</th><th>Área</th>
          <th>Asignado</th><th>Cargo</th>
          <th style="width:50px;"></th>
          ${puedeEliminar ? '<th style="width:50px;">Acción</th>' : ''}
        </tr>
      </thead>
      <tbody>
  `;
  data.forEach(r => {
    const equipos = r.equipos; // ya es array
    const rowId = r.id;
    html += `
      <tr class="main-row" data-id="${rowId}" onclick="toggleExpandRow('${rowId}', this)">
        <td>${escapeHtml(r.edificio || '—')}</td>
        <td>${escapeHtml(r.piso || '—')}</td>
        <td>${escapeHtml(r.departamento || '—')}</td>
        <td>${escapeHtml(r.area || '—')}</td>
        <td>${escapeHtml(r.asignado || '—')}</td>
        <td>${escapeHtml(r.cargo || '—')}</td>
        <td style="text-align:center;"><span class="expand-icon" id="icon-${rowId}">▶</span></td>
        ${puedeEliminar ? `<td><button class="btn btn-delete" onclick="event.stopPropagation(); eliminarEstacion('${rowId}')">🗑️</button></td>` : ''}
      </tr>
      <tr class="detail-row" id="detail-${rowId}" style="display:none;">
        <td colspan="${puedeEliminar ? 8 : 7}">
          <strong>Equipos Asignados:</strong>
          <table class="sub-table">
            <thead><tr><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Serie</th><th>Activo Fijo</th></tr></thead>
            <tbody>
              ${equipos.map(eq => `
                <tr>
                  <td>${escapeHtml(eq.tipo)}</td>
                  <td>${escapeHtml(eq.marca || '—')}</td>
                  <td>${escapeHtml(eq.modelo || '—')}</td>
                  <td>${escapeHtml(eq.serie || '—')}</td>
                  <td>${escapeHtml(eq.activo || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </td>
      </tr>
    `;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleExpandRow(id, row) {
  const detailRow = document.getElementById(`detail-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  if (detailRow.style.display === 'none' || detailRow.style.display === '') {
    detailRow.style.display = 'table-row';
    icon.classList.add('open');
    icon.textContent = '▼';
  } else {
    detailRow.style.display = 'none';
    icon.classList.remove('open');
    icon.textContent = '▶';
  }
}

// ==================== EXPORTAR CSV ====================
btnExportCSV.addEventListener('click', () => {
  if (!currentUser || !currentUser.permisos.exportar) return alert('No tiene permiso para exportar.');
  const filtrados = aplicarFiltros(registros);
  if (filtrados.length === 0) return alert('No hay datos para exportar.');

  let csv = 'Edificio,Piso,Departamento,Área,Asignado,Cargo,Tipo Equipo,Marca,Modelo,Serie,Activo Fijo,Fecha\n';
  filtrados.forEach(r => {
    const equipos = r.equipos;
    if (equipos.length === 0) {
      csv += `"${r.edificio}","${r.piso}","${r.departamento}","${r.area}","${r.asignado||''}","${r.cargo||''}","","","","","","${r.fecha}"\n`;
    } else {
      equipos.forEach(eq => {
        csv += `"${r.edificio}","${r.piso}","${r.departamento}","${r.area}","${r.asignado||''}","${r.cargo||''}","${eq.tipo}","${eq.marca||''}","${eq.modelo||''}","${eq.serie||''}","${eq.activo||''}","${r.fecha}"\n`;
      });
    }
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventario_indrhi_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ==================== EVENT LISTENERS ADICIONALES ====================
btnAgregarEquipo.addEventListener('click', agregarEquipoTemporal);
btnGuardar.addEventListener('click', guardarEstacion);
btnLimpiarForm.addEventListener('click', limpiarFormulario);
activoEquipo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); agregarEquipoTemporal(); } });
