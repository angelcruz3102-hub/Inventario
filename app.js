// ==================== CONFIGURACIÓN ====================
const API_URL = "https://script.google.com/macros/s/AKfycbyROlORA0kKffdOW1w-uUHIRntakE7qR1RwxF5iq85x-wfB5xTMbgXF2WiaVGWsRsJr/exec";

// ==================== ESTADO GLOBAL ====================
let registros = [];
let equiposTemporales = [];
let currentTab = 'registro';
let filters = { piso: '', departamento: '', area: '', responsable: '' };
let currentUser = null;

// ==================== CATÁLOGOS (localStorage) ====================
const STORAGE_KEY = 'catalogosINDRHI';
const USERS_KEY = 'usuariosINDRHI';
let catalogos = {
  departamentos: [],
  areas: [],
  tiposEquipo: [],
  marcas: [],
  modelos: []
};
const equiposCache = new Map();

// ==================== ELEMENTOS DOM ====================
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

const formEdificio = document.getElementById('edificio');
const formPiso = document.getElementById('piso');
const inputDepartamento = document.getElementById('departamento');
const inputArea = document.getElementById('area');
const formAsignado = document.getElementById('asignado');
const formCargo = document.getElementById('cargo');

const inputTipoEquipo = document.getElementById('tipo-equipo');
const inputMarcaEquipo = document.getElementById('marca-equipo');
const inputModeloEquipo = document.getElementById('modelo-equipo');
const serieEquipo = document.getElementById('serie-equipo');
const activoEquipo = document.getElementById('activo-equipo');
const btnAgregarEquipo = document.getElementById('btn-agregar-equipo');
const equiposTempList = document.getElementById('equipos-temp-list');
const btnGuardar = document.getElementById('btn-guardar');
const btnLimpiarForm = document.getElementById('btn-limpiar-form');
const formStatus = document.getElementById('form-status');

const datalistDepartamentos = document.getElementById('datalist-departamentos');
const datalistAreas = document.getElementById('datalist-areas');
const datalistTipos = document.getElementById('datalist-tipos');
const datalistMarcas = document.getElementById('datalist-marcas');
const datalistModelos = document.getElementById('datalist-modelos');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const filtersBar = document.getElementById('filters-bar');

const filterPiso = document.getElementById('filter-piso');
const filterDepartamento = document.getElementById('filter-departamento');
const filterArea = document.getElementById('filter-area');
const filterResponsable = document.getElementById('filter-responsable');
const btnClearFilters = document.getElementById('btn-clear-filters');

const statsContainer = document.getElementById('stats-container');
const dashboardTableContainer = document.getElementById('table-container-dashboard');
const reportesTableContainer = document.getElementById('table-container-reportes');
const btnExportCSV = document.getElementById('btn-export-csv');

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

const csvTipoImport = document.getElementById('csv-tipo-import');
const csvFileInput = document.getElementById('csv-file-input');
const btnImportCSV = document.getElementById('btn-import-csv');
const csvStatus = document.getElementById('csv-status');

const adminUsuario = document.getElementById('admin-usuario');
const adminPassword = document.getElementById('admin-password');
const adminRol = document.getElementById('admin-rol');
const btnAgregarUsuario = document.getElementById('btn-agregar-usuario');
const usuariosTableContainer = document.getElementById('usuarios-table-container');

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

  btnTipoAdd.addEventListener('click', () => agregarElementoCatalogo('tiposEquipo', tipoEquipoInput.value.trim(), null, tipoEquipoInput, tipoEquipoList));
  btnMarcaAdd.addEventListener('click', () => agregarElementoCatalogo('marcas', marcaInput.value.trim(), marcaTipoSelect.value, marcaInput, marcaList));
  btnModeloAdd.addEventListener('click', () => agregarElementoCatalogo('modelos', modeloInput.value.trim(), modeloMarcaSelect.value, modeloInput, modeloList));
  btnDepAdd.addEventListener('click', () => agregarElementoCatalogo('departamentos', depInput.value.trim(), null, depInput, depList));
  btnAreaAdd.addEventListener('click', () => agregarElementoCatalogo('areas', areaInput.value.trim(), areaDeptoSelect.value, areaInput, areaList));

  [tipoEquipoInput, marcaInput, modeloInput, depInput, areaInput].forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.nextElementSibling?.click(); });
  });

  inputDepartamento.addEventListener('input', actualizarDatalistAreas);
  inputTipoEquipo.addEventListener('input', actualizarDatalistMarcas);
  inputMarcaEquipo.addEventListener('input', actualizarDatalistModelos);

  btnImportCSV.addEventListener('click', importarCSV);
  btnAgregarUsuario.addEventListener('click', agregarUsuarioDesdeConfig);
  btnLogout.addEventListener('click', logout);

  poblarDatalists();
});

// ==================== AUTENTICACIÓN Y SESIÓN ====================
function inicializarUsuariosPorDefecto() {
  let usuarios = obtenerUsuarios();
  if (usuarios.length === 0) {
    usuarios.push({ usuario: 'admin', password: 'admin', rol: 'admin', permisos: { exportar: true, editar: true, eliminar: true } });
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

  usuarios.push({ usuario, password, rol, permisos: { exportar: rol === 'admin', editar: true, eliminar: rol === 'admin' } });
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
    html += `<tr><td>${escapeHtml(u.usuario)}</td><td>${u.rol === 'admin' ? 'Administrador' : 'Operador'}</td>
      <td><button class="btn btn-delete" onclick="eliminarUsuarioDesdeConfig('${escapeHtml(u.usuario)}')">🗑️</button></td></tr>`;
  });
  html += '</tbody></table>';
  usuariosTableContainer.innerHTML = html;
}

// ==================== MANEJO DE CATÁLOGOS ====================
function cargarCatalogosDesdeStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { catalogos = JSON.parse(stored); } catch (e) { catalogos = { departamentos: [], areas: [], tiposEquipo: [], marcas: [], modelos: [] }; }
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
    if (!padre) return alert('Seleccione un tipo de equipo.');
    valor = valor.toUpperCase();
    if (catalogos.marcas.some(m => m.nombre === valor && m.tipoEquipo === padre)) return alert('Esa marca ya existe para ese tipo.');
    catalogos.marcas.push({ nombre: valor, tipoEquipo: padre });
    catalogos.marcas.sort((a,b) => a.nombre.localeCompare(b.nombre));
  } else if (tipo === 'modelos') {
    if (!padre) return alert('Seleccione una marca.');
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
    if (!padre) return alert('Seleccione un departamento.');
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
  poblarDatalists();
  if (currentTab === 'configuracion') { renderizarListasConfiguracion(); renderTablaUsuariosConfig(); }
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
  poblarDatalists();
  if (currentTab === 'configuracion') { renderizarListasConfiguracion(); renderTablaUsuariosConfig(); }
}

function renderizarListaCatalogo(tipo, listElement) {
  let html = '';
  if (tipo === 'tiposEquipo') html = catalogos.tiposEquipo.map(t => `<li class="catalog-item"><span>${escapeHtml(t)}</span><button class="btn-remove-item" onclick="eliminarElementoCatalogo('tiposEquipo','${escapeHtml(t)}', null, document.getElementById('tipo-equipo-list'))">✕</button></li>`).join('');
  else if (tipo === 'marcas') html = catalogos.marcas.map(m => `<li class="catalog-item"><span>${escapeHtml(m.nombre)} <small>(${escapeHtml(m.tipoEquipo)})</small></span><button class="btn-remove-item" onclick="eliminarElementoCatalogo('marcas','${escapeHtml(m.nombre)}','${escapeHtml(m.tipoEquipo)}', document.getElementById('marca-catalogo-list'))">✕</button></li>`).join('');
  else if (tipo === 'modelos') html = catalogos.modelos.map(m => `<li class="catalog-item"><span>${escapeHtml(m.nombre)} <small>(${escapeHtml(m.marca)})</small></span><button class="btn-remove-item" onclick="eliminarElementoCatalogo('modelos','${escapeHtml(m.nombre)}','${escapeHtml(m.marca)}', document.getElementById('modelo-catalogo-list'))">✕</button></li>`).join('');
  else if (tipo === 'departamentos') html = catalogos.departamentos.map(d => `<li class="catalog-item"><span>${escapeHtml(d)}</span><button class="btn-remove-item" onclick="eliminarElementoCatalogo('departamentos','${escapeHtml(d)}', null, document.getElementById('dep-catalogo-list'))">✕</button></li>`).join('');
  else if (tipo === 'areas') html = catalogos.areas.map(a => `<li class="catalog-item"><span>${escapeHtml(a.nombre)} (${escapeHtml(a.departamento)})</span><button class="btn-remove-item" onclick="eliminarElementoCatalogo('areas','${escapeHtml(a.nombre)}','${escapeHtml(a.departamento)}', document.getElementById('area-catalogo-list'))">✕</button></li>`).join('');
  listElement.innerHTML = html || '<p class="placeholder-text">No hay elementos.</p>';
}

// ==================== DATALISTS ====================
function poblarDatalists() {
  datalistTipos.innerHTML = catalogos.tiposEquipo.map(t => `<option value="${escapeHtml(t)}">`).join('');
  datalistMarcas.innerHTML = '';
  datalistModelos.innerHTML = '';
  datalistDepartamentos.innerHTML = catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">`).join('');
  actualizarDatalistAreas();
  marcaTipoSelect.innerHTML = '<option value="">Seleccione tipo de equipo</option>' + catalogos.tiposEquipo.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  modeloMarcaSelect.innerHTML = '<option value="">Seleccione marca</option>' + catalogos.marcas.map(m => `<option value="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)} (${escapeHtml(m.tipoEquipo)})</option>`).join('');
  areaDeptoSelect.innerHTML = '<option value="">Seleccione departamento</option>' + catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

function actualizarDatalistAreas() {
  const depto = inputDepartamento.value.trim();
  datalistAreas.innerHTML = !depto ? catalogos.areas.map(a => `<option value="${escapeHtml(a.nombre)}">`).join('') : catalogos.areas.filter(a => a.departamento.toLowerCase() === depto.toLowerCase()).map(a => `<option value="${escapeHtml(a.nombre)}">`).join('');
}

function actualizarDatalistMarcas() {
  const tipo = inputTipoEquipo.value.trim();
  inputMarcaEquipo.disabled = !tipo;
  datalistMarcas.innerHTML = !tipo ? '' : catalogos.marcas.filter(m => m.tipoEquipo.toLowerCase() === tipo.toLowerCase()).map(m => `<option value="${escapeHtml(m.nombre)}">`).join('');
  inputModeloEquipo.disabled = true;
  datalistModelos.innerHTML = '';
}

function actualizarDatalistModelos() {
  const marca = inputMarcaEquipo.value.trim();
  inputModeloEquipo.disabled = !marca;
  datalistModelos.innerHTML = !marca ? '' : catalogos.modelos.filter(m => m.marca.toLowerCase() === marca.toLowerCase()).map(m => `<option value="${escapeHtml(m.nombre)}">`).join('');
}

// ==================== APRENDIZAJE AUTOMÁTICO ====================
function aprenderCatalogos(estacion) {
  let huboCambios = false;
  const depto = capitalizarPalabras(estacion.departamento.trim());
  if (depto && !catalogos.departamentos.includes(depto)) { catalogos.departamentos.push(depto); catalogos.departamentos.sort(); huboCambios = true; }
  const area = capitalizarPalabras(estacion.area.trim());
  if (area && depto && !catalogos.areas.some(a => a.nombre === area && a.departamento === depto)) { catalogos.areas.push({ nombre: area, departamento: depto }); catalogos.areas.sort((a,b) => a.nombre.localeCompare(b.nombre)); huboCambios = true; }
  estacion.equipos.forEach(eq => {
    const tipo = capitalizarPalabras(eq.tipo.trim());
    if (tipo && !catalogos.tiposEquipo.includes(tipo)) { catalogos.tiposEquipo.push(tipo); catalogos.tiposEquipo.sort(); huboCambios = true; }
    const marca = eq.marca.trim().toUpperCase();
    if (marca && tipo && !catalogos.marcas.some(m => m.nombre === marca && m.tipoEquipo === tipo)) { catalogos.marcas.push({ nombre: marca, tipoEquipo: tipo }); catalogos.marcas.sort((a,b) => a.nombre.localeCompare(b.nombre)); huboCambios = true; }
    const modelo = eq.modelo.trim().toUpperCase();
    if (modelo && marca && !catalogos.modelos.some(m => m.nombre === modelo && m.marca === marca)) { catalogos.modelos.push({ nombre: modelo, marca: marca }); catalogos.modelos.sort((a,b) => a.nombre.localeCompare(b.nombre)); huboCambios = true; }
  });
  if (huboCambios) { guardarCatalogosEnStorage(); poblarDatalists(); if (currentTab === 'configuracion') { renderizarListasConfiguracion(); renderTablaUsuariosConfig(); } }
}

// ==================== IMPORTACIÓN CSV ====================
function importarCSV() {
  const file = csvFileInput.files[0];
  if (!file) { csvStatus.textContent = 'Seleccione un archivo CSV.'; csvStatus.className = 'status-message error'; return; }
  const tipo = csvTipoImport.value;
  csvStatus.textContent = 'Procesando...'; csvStatus.className = 'status-message loading';
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lineas = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lineas.length < 2) throw new Error('El archivo está vacío o no tiene datos.');
      const nuevosItems = [];
      for (let i = 1; i < lineas.length; i++) {
        const campos = parsearLineaCSV(lineas[i]);
        if (campos.length === 0) continue;
        if (tipo === 'equipos' && campos.length >= 3) {
          const tipoEq = capitalizarPalabras(campos[0].trim()), marca = campos[1].trim().toUpperCase(), modelo = campos[2].trim().toUpperCase();
          if (tipoEq && marca && modelo) nuevosItems.push({ tipo: tipoEq, marca, modelo });
        } else if (tipo === 'ubicaciones' && campos.length >= 2) {
          const depto = capitalizarPalabras(campos[0].trim()), area = capitalizarPalabras(campos[1].trim());
          if (depto && area) nuevosItems.push({ depto, area });
        }
      }
      if (tipo === 'equipos') {
        const tiposSet = new Set(catalogos.tiposEquipo), marcasMap = new Map(catalogos.marcas.map(m => [`${m.nombre}|${m.tipoEquipo}`, m])), modelosMap = new Map(catalogos.modelos.map(m => [`${m.nombre}|${m.marca}`, m]));
        nuevosItems.forEach(item => {
          if (!tiposSet.has(item.tipo)) { catalogos.tiposEquipo.push(item.tipo); tiposSet.add(item.tipo); }
          const mk = `${item.marca}|${item.tipo}`; if (!marcasMap.has(mk)) { const nm = { nombre: item.marca, tipoEquipo: item.tipo }; catalogos.marcas.push(nm); marcasMap.set(mk, nm); }
          const mdk = `${item.modelo}|${item.marca}`; if (!modelosMap.has(mdk)) { catalogos.modelos.push({ nombre: item.modelo, marca: item.marca }); modelosMap.set(mdk, { nombre: item.modelo, marca: item.marca }); }
        });
        catalogos.tiposEquipo.sort(); catalogos.marcas.sort((a,b) => a.nombre.localeCompare(b.nombre)); catalogos.modelos.sort((a,b) => a.nombre.localeCompare(b.nombre));
      } else if (tipo === 'ubicaciones') {
        const deptosSet = new Set(catalogos.departamentos), areasMap = new Map(catalogos.areas.map(a => [`${a.nombre}|${a.departamento}`, a]));
        nuevosItems.forEach(item => {
          if (!deptosSet.has(item.depto)) { catalogos.departamentos.push(item.depto); deptosSet.add(item.depto); }
          const ak = `${item.area}|${item.depto}`; if (!areasMap.has(ak)) { catalogos.areas.push({ nombre: item.area, departamento: item.depto }); areasMap.set(ak, { nombre: item.area, departamento: item.depto }); }
        });
        catalogos.departamentos.sort(); catalogos.areas.sort((a,b) => a.nombre.localeCompare(b.nombre));
      }
      guardarCatalogosEnStorage(); poblarDatalists();
      if (currentTab === 'configuracion') { renderizarListasConfiguracion(); renderTablaUsuariosConfig(); }
      csvFileInput.value = ''; csvStatus.textContent = `✅ Importados ${nuevosItems.length} registros sin duplicados.`; csvStatus.className = 'status-message success';
      setTimeout(() => { csvStatus.textContent = ''; }, 4000);
    } catch (error) { console.error(error); csvStatus.textContent = ''; csvStatus.className = ''; alert('Error al procesar el CSV:\n' + error.message); }
  };
  reader.onerror = () => { csvStatus.textContent = ''; csvStatus.className = ''; alert('Error al leer el archivo.'); };
  reader.readAsText(file, 'UTF-8');
}

function parsearLineaCSV(linea) {
  const resultado = []; let campo = '', dentroDeComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (dentroDeComillas) { if (c === '"') { if (i + 1 < linea.length && linea[i + 1] === '"') { campo += '"'; i++; } else dentroDeComillas = false; } else campo += c; }
    else { if (c === '"') dentroDeComillas = true; else if (c === ',') { resultado.push(campo.trim()); campo = ''; } else campo += c; }
  }
  resultado.push(campo.trim());
  return resultado;
}

// ==================== PESTAÑAS ====================
function setupTabs() {
  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === 'configuracion' && (!currentUser || currentUser.rol !== 'admin')) return;
    switchTab(tab);
  }));
}

function switchTab(tab) {
  currentTab = tab;
  tabBtns.forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  tabContents.forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  filtersBar.style.display = (tab === 'dashboard' || tab === 'reportes') ? 'block' : 'none';
  if (tab === 'configuracion') { renderizarListasConfiguracion(); renderTablaUsuariosConfig(); }
  actualizarVista();
}

function renderizarListasConfiguracion() {
  renderizarListaCatalogo('tiposEquipo', tipoEquipoList);
  renderizarListaCatalogo('marcas', marcaList);
  renderizarListaCatalogo('modelos', modeloList);
  renderizarListaCatalogo('departamentos', depList);
  renderizarListaCatalogo('areas', areaList);
  poblarDatalists();
}

// ==================== FILTROS ====================
let debounceTimer;
function setupFilters() {
  const debounce = (cb) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(cb, 200); };
  filterPiso.addEventListener('input', () => { filters.piso = filterPiso.value.trim().toLowerCase(); debounce(actualizarVista); });
  filterDepartamento.addEventListener('input', () => { filters.departamento = filterDepartamento.value.trim().toLowerCase(); debounce(actualizarVista); });
  filterArea.addEventListener('input', () => { filters.area = filterArea.value.trim().toLowerCase(); debounce(actualizarVista); });
  filterResponsable.addEventListener('input', () => { filters.responsable = filterResponsable.value.trim().toLowerCase(); debounce(actualizarVista); });
  btnClearFilters.addEventListener('click', limpiarFiltros);
}

function limpiarFiltros() {
  filterPiso.value = ''; filterDepartamento.value = ''; filterArea.value = ''; filterResponsable.value = '';
  filters = { piso: '', departamento: '', area: '', responsable: '' };
  actualizarVista();
}

// ==================== FETCH ====================
async function fetchGetRegistros() {
  const r = await fetch(API_URL);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return Array.isArray(d) ? d : [];
}

async function fetchPost(payload) {
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

async function cargarRegistros() {
  try {
    registros = await fetchGetRegistros();
    equiposCache.clear();
    actualizarFiltrosDatalist();
    actualizarVista();
  } catch (e) { console.error(e); alert('Error de conexión.'); }
}

// ==================== UTILIDADES ====================
function capitalizarPalabras(s) { return s.replace(/\b\w/g, c => c.toUpperCase()); }
function escapeHtml(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;') : ''; }

// ==================== CRUD ESTACIONES ====================
async function guardarEstacion() {
  if (!formEdificio.value) return mostrarStatus('error', 'Selecciona un edificio.');
  const depto = inputDepartamento.value.trim();
  if (!depto) return mostrarStatus('error', 'El departamento es obligatorio.');
  if (!formAsignado.value.trim()) return mostrarStatus('error', 'El campo "Asignado" es obligatorio.');
  if (equiposTemporales.length === 0) return mostrarStatus('error', 'Agrega al menos un equipo.');

  const area = inputArea.value.trim();
  const nuevaEstacion = {
    edificio: formEdificio.value, piso: formPiso.value.trim(),
    departamento: capitalizarPalabras(depto), area: area ? capitalizarPalabras(area) : '',
    asignado: capitalizarPalabras(formAsignado.value.trim()), cargo: capitalizarPalabras(formCargo.value.trim()),
    equipos: [...equiposTemporales]
  };

  aprenderCatalogos(nuevaEstacion);

  const tempId = 'temp_' + Date.now(), tempFecha = new Date().toLocaleString('es-DO');
  const registroOptimista = { id: tempId, ...nuevaEstacion, equipos: JSON.stringify(nuevaEstacion.equipos), fecha: tempFecha };

  registros.unshift(registroOptimista);
  equiposCache.set(tempId, nuevaEstacion.equipos);
  limpiarSeccionUsuarioYEquipos();
  actualizarFiltrosDatalist(); actualizarVista();
  mostrarStatus('loading', 'Guardando...');

  try {
    const res = await fetchPost({ action: 'save', data: nuevaEstacion });
    const idx = registros.findIndex(r => r.id === tempId);
    if (idx !== -1 && res.id) { registros[idx].id = res.id; registros[idx].fecha = res.fecha || tempFecha; equiposCache.set(res.id, nuevaEstacion.equipos); equiposCache.delete(tempId); }
    actualizarFiltrosDatalist(); actualizarVista();
    mostrarStatus('success', '✅ Estación guardada exitosamente.');
    setTimeout(() => limpiarStatus(), 3000);
  } catch (e) {
    registros = registros.filter(r => r.id !== tempId); equiposCache.delete(tempId);
    actualizarFiltrosDatalist(); actualizarVista();
    mostrarStatus('error', 'Error al guardar.');
  }
}

async function eliminarEstacion(id) {
  if (!currentUser?.permisos.eliminar) return alert('Sin permiso.');
  const eliminado = registros.find(r => r.id === id);
  registros = registros.filter(r => r.id !== id);
  equiposCache.delete(id);
  actualizarFiltrosDatalist(); actualizarVista();
  try { await fetchPost({ action: 'delete', id }); } catch {
    if (eliminado) { registros.unshift(eliminado); equiposCache.set(eliminado.id, parseEquipos(eliminado.equipos)); }
    actualizarFiltrosDatalist(); actualizarVista();
    alert('Error al eliminar.');
  }
}

// ==================== EQUIPOS TEMPORALES ====================
function agregarEquipoTemporal() {
  const tipo = inputTipoEquipo.value.trim();
  if (!tipo) return alert('Escribe o selecciona el tipo de equipo.');
  equiposTemporales.push({
    tipo, marca: inputMarcaEquipo.value.trim(), modelo: inputModeloEquipo.value.trim(),
    serie: serieEquipo.value.trim().toUpperCase(), activo: activoEquipo.value.trim().toUpperCase()
  });
  renderEquiposTemporales();
  limpiarCamposEquipo();
  inputTipoEquipo.focus();
}

function eliminarEquipoTemporal(i) { equiposTemporales.splice(i,1); renderEquiposTemporales(); }

function limpiarCamposEquipo() {
  inputTipoEquipo.value = ''; inputMarcaEquipo.value = ''; inputMarcaEquipo.disabled = true;
  inputModeloEquipo.value = ''; inputModeloEquipo.disabled = true;
  serieEquipo.value = ''; activoEquipo.value = '';
  datalistMarcas.innerHTML = ''; datalistModelos.innerHTML = '';
}

function renderEquiposTemporales() {
  equiposTempList.innerHTML = equiposTemporales.length === 0 ? '<p class="placeholder-text">No hay equipos agregados aún.</p>' :
    equiposTemporales.map((eq,i) => `<span class="equipo-tag"><span class="equipo-info"><strong>${escapeHtml(eq.tipo)}</strong>${eq.marca?` | Marca: ${escapeHtml(eq.marca)}`:''}${eq.modelo?` | Mod: ${escapeHtml(eq.modelo)}`:''}${eq.serie?` | S/N: ${escapeHtml(eq.serie)}`:''}${eq.activo?` | Act: ${escapeHtml(eq.activo)}`:''}</span><button class="btn-remove-equipo" onclick="eliminarEquipoTemporal(${i})">&times;</button></span>`).join('');
}

function limpiarSeccionUsuarioYEquipos() {
  formAsignado.value = ''; formCargo.value = '';
  equiposTemporales = []; renderEquiposTemporales();
  limpiarCamposEquipo(); limpiarStatus();
}

function limpiarFormulario() {
  formEdificio.value = ''; formPiso.value = ''; inputDepartamento.value = ''; inputArea.value = '';
  formAsignado.value = ''; formCargo.value = ''; equiposTemporales = []; renderEquiposTemporales(); limpiarCamposEquipo(); limpiarStatus(); poblarDatalists();
}

function mostrarStatus(t, m) { formStatus.textContent = m; formStatus.className = `status-message ${t}`; }
function limpiarStatus() { formStatus.textContent = ''; formStatus.className = 'status-message'; }

// ==================== RENDER ====================
function actualizarVista() {
  if (currentTab === 'registro' || currentTab === 'configuracion') return;
  const filtrados = aplicarFiltros(registros);
  if (currentTab === 'dashboard') { renderStats(filtrados); renderTable(dashboardTableContainer, filtrados, true); }
  else if (currentTab === 'reportes') renderTable(reportesTableContainer, filtrados, false);
}

function aplicarFiltros(data) {
  return data.filter(r => 
    (!filters.piso || (r.piso||'').toLowerCase().includes(filters.piso)) &&
    (!filters.departamento || (r.departamento||'').toLowerCase().includes(filters.departamento)) &&
    (!filters.area || (r.area||'').toLowerCase().includes(filters.area)) &&
    (!filters.responsable || ((r.asignado||'') + ' ' + (r.cargo||'')).toLowerCase().includes(filters.responsable))
  );
}

function actualizarFiltrosDatalist() {
  const vals = (fn) => [...new Set(registros.map(fn).filter(Boolean))].sort();
  document.getElementById('datalist-filter-pisos').innerHTML = vals(r => r.piso).map(v => `<option value="${escapeHtml(v)}">`).join('');
  document.getElementById('datalist-filter-deptos').innerHTML = vals(r => r.departamento).map(v => `<option value="${escapeHtml(v)}">`).join('');
  document.getElementById('datalist-filter-areas').innerHTML = vals(r => r.area).map(v => `<option value="${escapeHtml(v)}">`).join('');
  document.getElementById('datalist-filter-resp').innerHTML = vals(r => `${r.asignado||''} ${r.cargo||''}`.trim()).map(v => `<option value="${escapeHtml(v)}">`).join('');
}

function renderStats(data) {
  const totalEq = data.reduce((s,r) => s + parseEquipos(r.equipos).length, 0);
  const tipoCount = {};
  data.forEach(r => parseEquipos(r.equipos).forEach(eq => tipoCount[eq.tipo] = (tipoCount[eq.tipo]||0)+1));
  const top = Object.entries(tipoCount).sort((a,b) => b[1]-a[1]).slice(0,4);
  statsContainer.innerHTML = `<div class="stat-card"><h3>Total Estaciones</h3><div class="stat-value">${data.length}</div></div>
    <div class="stat-card"><h3>Total Equipos</h3><div class="stat-value">${totalEq}</div></div>
    ${top.map(([t,c]) => `<div class="stat-card"><h3>${t}</h3><div class="stat-value">${c}</div></div>`).join('')}`;
}

function renderTable(container, data, dash) {
  if (!data.length) { container.innerHTML = '<p style="text-align:center;padding:20px;">No se encontraron registros.</p>'; return; }
  const elim = currentUser?.permisos.eliminar;
  let html = `<table><thead><tr><th>Edificio</th><th>Piso</th><th>Depto</th><th>Área</th><th>Asignado</th><th>Cargo</th><th style="width:50px;"></th>${elim?'<th style="width:50px;">Acción</th>':''}</tr></thead><tbody>`;
  data.forEach(r => {
    const eqs = parseEquipos(r.equipos), rid = r.id;
    html += `<tr class="main-row" data-id="${rid}" onclick="toggleExpandRow('${rid}', this)"><td>${escapeHtml(r.edificio||'—')}</td><td>${escapeHtml(r.piso||'—')}</td><td>${escapeHtml(r.departamento||'—')}</td><td>${escapeHtml(r.area||'—')}</td><td>${escapeHtml(r.asignado||'—')}</td><td>${escapeHtml(r.cargo||'—')}</td><td style="text-align:center;"><span class="expand-icon" id="icon-${rid}">▶</span></td>${elim?`<td><button class="btn btn-delete" onclick="event.stopPropagation();eliminarEstacion('${rid}')">🗑️</button></td>`:''}</tr>
    <tr class="detail-row" id="detail-${rid}" style="display:none;"><td colspan="${elim?8:7}"><strong>Equipos:</strong><table class="sub-table"><thead><tr><th>Tipo</th><th>Marca</th><th>Modelo</th><th>Serie</th><th>Activo Fijo</th></tr></thead><tbody>${eqs.map(eq => `<tr><td>${escapeHtml(eq.tipo)}</td><td>${escapeHtml(eq.marca||'—')}</td><td>${escapeHtml(eq.modelo||'—')}</td><td>${escapeHtml(eq.serie||'—')}</td><td>${escapeHtml(eq.activo||'—')}</td></tr>`).join('')}</tbody></table></td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleExpandRow(id) {
  const d = document.getElementById(`detail-${id}`), i = document.getElementById(`icon-${id}`);
  if (d.style.display === 'none' || d.style.display === '') { d.style.display = 'table-row'; i.classList.add('open'); i.textContent = '▼'; }
  else { d.style.display = 'none'; i.classList.remove('open'); i.textContent = '▶'; }
}

function parseEquipos(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    if (equiposCache.has(raw)) return equiposCache.get(raw);
    try { const p = JSON.parse(raw); equiposCache.set(raw, p); return p; } catch { return []; }
  }
  return raw;
}

// ==================== EXPORTAR CSV ====================
btnExportCSV.addEventListener('click', () => {
  if (!currentUser?.permisos.exportar) return alert('Sin permiso.');
  const datos = aplicarFiltros(registros);
  if (!datos.length) return alert('Sin datos.');
  let csv = 'Edificio,Piso,Departamento,Área,Asignado,Cargo,Tipo Equipo,Marca,Modelo,Serie,Activo Fijo,Fecha\n';
  datos.forEach(r => {
    const eqs = parseEquipos(r.equipos);
    if (!eqs.length) csv += `"${r.edificio}","${r.piso}","${r.departamento}","${r.area}","${r.asignado||''}","${r.cargo||''}","","","","","","${r.fecha}"\n`;
    else eqs.forEach(eq => csv += `"${r.edificio}","${r.piso}","${r.departamento}","${r.area}","${r.asignado||''}","${r.cargo||''}","${eq.tipo}","${eq.marca||''}","${eq.modelo||''}","${eq.serie||''}","${eq.activo||''}","${r.fecha}"\n`);
  });
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `inventario_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
});

// ==================== EVENTOS ====================
btnAgregarEquipo.addEventListener('click', agregarEquipoTemporal);
btnGuardar.addEventListener('click', guardarEstacion);
btnLimpiarForm.addEventListener('click', limpiarFormulario);
activoEquipo.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregarEquipoTemporal(); } });
