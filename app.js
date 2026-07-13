// ==================== CONFIGURACIÓN ====================
const API_URL = "https://script.google.com/macros/s/AKfycbyROlORA0kKffdOW1w-uUHIRntakE7qR1RwxF5iq85x-wfB5xTMbgXF2WiaVGWsRsJr/exec";

// ==================== ESTADO GLOBAL ====================
let registros = [];
let equiposTemporales = [];
let currentTab = 'registro';
let filters = { piso: '', departamento: '', area: '', responsable: '' };

// Sesión actual
let currentUser = null; // { usuario, rol, permisos }

// ==================== CATÁLOGOS (localStorage) ====================
const STORAGE_KEY = 'catalogosINDRHI';
const USERS_KEY = 'usuariosINDRHI';
let catalogos = {
  departamentos: [],
  areas: [],          // { nombre: string, departamento: string }
  tiposEquipo: [],
  marcas: [],         // { nombre: string, tipoEquipo: string }
  modelos: []         // { nombre: string, marca: string }
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
const tabAdminBtn = document.getElementById('tab-admin-btn');

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
const permExportar = document.getElementById('perm-exportar');
const permEditar = document.getElementById('perm-editar');
const permEliminar = document.getElementById('perm-eliminar');
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

  // Listeners de catálogos
  btnTipoAdd.addEventListener('click', () => agregarElementoCatalogo('tiposEquipo', tipoEquipoInput.value.trim(), null, tipoEquipoInput, tipoEquipoList));
  btnMarcaAdd.addEventListener('click', () => agregarElementoCatalogo('marcas', marcaInput.value.trim(), marcaTipoSelect.value, marcaInput, marcaList));
  btnModeloAdd.addEventListener('click', () => agregarElementoCatalogo('modelos', modeloInput.value.trim(), modeloMarcaSelect.value, modeloInput, modeloList));
  btnDepAdd.addEventListener('click', () => agregarElementoCatalogo('departamentos', depInput.value.trim(), null, depInput, depList));
  btnAreaAdd.addEventListener('click', () => agregarElementoCatalogo('areas', areaInput.value.trim(), areaDeptoSelect.value, areaInput, areaList));

  // Enter en inputs de catálogo
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
  btnAgregarUsuario.addEventListener('click', agregarOActualizarUsuario);

  // Logout
  btnLogout.addEventListener('click', logout);

  // Exportar (ocultar si no tiene permiso)
  ajustarUIporRol();
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
    // Sin sesión, ocultar todo sensible
    tabConfigBtn.style.display = 'none';
    tabAdminBtn.style.display = 'none';
    btnExportCSV.style.display = 'none';
    return;
  }
  const esAdmin = currentUser.rol === 'admin';
  tabConfigBtn.style.display = esAdmin ? 'inline-flex' : 'none';
  tabAdminBtn.style.display = esAdmin ? 'inline-flex' : 'none';
  btnExportCSV.style.display = currentUser.permisos.exportar ? 'inline-flex' : 'none';
  // Ocultar botones de eliminar en tablas si no tiene permiso
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.style.display = currentUser.permisos.eliminar ? 'inline-flex' : 'none';
  });
  // Si la pestaña actual es config/admin y no es admin, cambiar a registro
  if ((currentTab === 'configuracion' || currentTab === 'admin') && !esAdmin) {
    switchTab('registro');
  }
  // Forzar re-render de tablas para mostrar/ocultar botones
  actualizarVista();
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
  // Asegurar estructura actualizada
  if (!catalogos.tiposEquipo) catalogos.tiposEquipo = [];
  if (!Array.isArray(catalogos.marcas)) catalogos.marcas = [];
  else {
    // Migrar marcas planas a objetos si es necesario
    catalogos.marcas = catalogos.marcas.map(m => typeof m === 'string' ? { nombre: m, tipoEquipo: '' } : m);
  }
  if (!Array.isArray(catalogos.modelos)) catalogos.modelos = [];
  else {
    catalogos.modelos = catalogos.modelos.map(m => typeof m === 'string' ? { nombre: m, marca: '' } : m);
  }
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
  poblarSelectsCatalogo();
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
  poblarSelectsCatalogo();
}

function renderizarListaCatalogo(tipo, listElement) {
  let html = '';
  if (tipo === 'tiposEquipo') {
    html = catalogos.tiposEquipo.map(t => `
      <li class="catalog-item">
        <span>${escapeHtml(t)}</span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('tiposEquipo','${escapeHtml(t)}', null, document.getElementById('tipo-equipo-list'))">✕</button>
      </li>`).join('');
  } else if (tipo === 'marcas') {
    html = catalogos.marcas.map(m => `
      <li class="catalog-item">
        <span>${escapeHtml(m.nombre)} <small>(${escapeHtml(m.tipoEquipo)})</small></span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('marcas','${escapeHtml(m.nombre)}','${escapeHtml(m.tipoEquipo)}', document.getElementById('marca-catalogo-list'))">✕</button>
      </li>`).join('');
  } else if (tipo === 'modelos') {
    html = catalogos.modelos.map(m => `
      <li class="catalog-item">
        <span>${escapeHtml(m.nombre)} <small>(${escapeHtml(m.marca)})</small></span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('modelos','${escapeHtml(m.nombre)}','${escapeHtml(m.marca)}', document.getElementById('modelo-catalogo-list'))">✕</button>
      </li>`).join('');
  } else if (tipo === 'departamentos') {
    html = catalogos.departamentos.map(d => `
      <li class="catalog-item">
        <span>${escapeHtml(d)}</span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('departamentos','${escapeHtml(d)}', null, document.getElementById('dep-catalogo-list'))">✕</button>
      </li>`).join('');
  } else if (tipo === 'areas') {
    html = catalogos.areas.map(a => `
      <li class="catalog-item">
        <span>${escapeHtml(a.nombre)} (${escapeHtml(a.departamento)})</span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('areas','${escapeHtml(a.nombre)}','${escapeHtml(a.departamento)}', document.getElementById('area-catalogo-list'))">✕</button>
      </li>`).join('');
  }
  listElement.innerHTML = html || '<p class="placeholder-text">No hay elementos.</p>';
}

function poblarSelectsCatalogo() {
  // Tipos de equipo
  tipoEquipo.innerHTML = '<option value="">Tipo...</option>' +
    catalogos.tiposEquipo.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

  // Marcas en formulario (depende de tipo, se actualiza en cascada)
  actualizarMarcasPorTipo();

  // Modelos (depende de marca)
  actualizarModelosPorMarca();

  // Departamentos
  selectDepartamento.innerHTML = '<option value="">Seleccione...</option>' +
    catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

  filtrarAreasFormulario();

  // Selects de configuración
  marcaTipoSelect.innerHTML = '<option value="">Seleccione tipo de equipo</option>' +
    catalogos.tiposEquipo.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  modeloMarcaSelect.innerHTML = '<option value="">Seleccione marca</option>' +
    catalogos.marcas.map(m => `<option value="${escapeHtml(m.nombre)}">${escapeHtml(m.nombre)} (${escapeHtml(m.tipoEquipo)})</option>`).join('');
  areaDeptoSelect.innerHTML = '<option value="">Seleccione departamento</option>' +
    catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

  // Refrescar listas visuales si está en config
  if (currentTab === 'configuracion') renderizarListasConfiguracion();
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

// ==================== IMPORTACIÓN CSV ====================
async function importarCSV() {
  const file = csvFileInput.files[0];
  if (!file) {
    csvStatus.textContent = 'Seleccione un archivo CSV.';
    csvStatus.className = 'status-message error';
    return;
  }
  const tipo = csvTipoImport.value;
  csvStatus.textContent = 'Procesando...';
  csvStatus.className = 'status-message loading';

  try {
    const text = await readFile(file);
    const lineas = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lineas.length < 2) throw new Error('Archivo vacío o sin datos.');

    const nuevosItems = [];
    if (tipo === 'equipos') {
      // Formato esperado: Tipo,Marca,Modelo
      for (let i = 1; i < lineas.length; i++) {
        const cols = lineas[i].split(',').map(c => c.trim());
        if (cols.length >= 3) {
          const tipo = capitalizarPalabras(cols[0]);
          const marca = cols[1].toUpperCase();
          const modelo = cols[2].toUpperCase();
          if (tipo && marca && modelo) nuevosItems.push({ tipo, marca, modelo });
        }
      }
      // Deduplicar y fusionar
      nuevosItems.forEach(item => {
        if (!catalogos.tiposEquipo.includes(item.tipo)) catalogos.tiposEquipo.push(item.tipo);
        if (!catalogos.marcas.some(m => m.nombre === item.marca && m.tipoEquipo === item.tipo))
          catalogos.marcas.push({ nombre: item.marca, tipoEquipo: item.tipo });
        if (!catalogos.modelos.some(m => m.nombre === item.modelo && m.marca === item.marca))
          catalogos.modelos.push({ nombre: item.modelo, marca: item.marca });
      });
    } else if (tipo === 'ubicaciones') {
      // Formato: Departamento, Área
      for (let i = 1; i < lineas.length; i++) {
        const cols = lineas[i].split(',').map(c => c.trim());
        if (cols.length >= 2) {
          const depto = capitalizarPalabras(cols[0]);
          const area = capitalizarPalabras(cols[1]);
          if (depto && area) nuevosItems.push({ depto, area });
        }
      }
      nuevosItems.forEach(item => {
        if (!catalogos.departamentos.includes(item.depto)) catalogos.departamentos.push(item.depto);
        if (!catalogos.areas.some(a => a.nombre === item.area && a.departamento === item.depto))
          catalogos.areas.push({ nombre: item.area, departamento: item.depto });
      });
    }

    catalogos.departamentos.sort();
    catalogos.tiposEquipo.sort();
    catalogos.marcas.sort((a,b) => a.nombre.localeCompare(b.nombre));
    catalogos.modelos.sort((a,b) => a.nombre.localeCompare(b.nombre));
    catalogos.areas.sort((a,b) => a.nombre.localeCompare(b.nombre));

    guardarCatalogosEnStorage();
    poblarSelectsCatalogo();
    csvFileInput.value = '';
    csvStatus.textContent = `✅ Importados ${nuevosItems.length} registros sin duplicados.`;
    csvStatus.className = 'status-message success';
    setTimeout(() => { csvStatus.textContent = ''; }, 4000);
  } catch (error) {
    console.error(error);
    csvStatus.textContent = 'Error al procesar CSV: ' + error.message;
    csvStatus.className = 'status-message error';
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsText(file);
  });
}

// ==================== ADMINISTRACIÓN DE USUARIOS ====================
function agregarOActualizarUsuario() {
  const usuario = adminUsuario.value.trim();
  const password = adminPassword.value.trim();
  const rol = adminRol.value;
  if (!usuario || !password) return alert('Usuario y contraseña obligatorios.');

  const permisos = {
    exportar: permExportar.checked,
    editar: permEditar.checked,
    eliminar: permEliminar.checked
  };

  let usuarios = obtenerUsuarios();
  const existente = usuarios.find(u => u.usuario === usuario);
  if (existente) {
    existente.password = password;
    existente.rol = rol;
    existente.permisos = permisos;
  } else {
    usuarios.push({ usuario, password, rol, permisos });
  }
  guardarUsuarios(usuarios);
  adminUsuario.value = '';
  adminPassword.value = '';
  renderTablaUsuarios();
}

function eliminarUsuario(usuario) {
  if (usuario === 'admin') return alert('No se puede eliminar al admin principal.');
  let usuarios = obtenerUsuarios();
  usuarios = usuarios.filter(u => u.usuario !== usuario);
  guardarUsuarios(usuarios);
  renderTablaUsuarios();
}

function renderTablaUsuarios() {
  const usuarios = obtenerUsuarios();
  if (usuarios.length === 0) {
    usuariosTableContainer.innerHTML = '<p style="text-align:center;padding:20px;">No hay usuarios registrados.</p>';
    return;
  }
  let html = `<table>
    <thead><tr><th>Usuario</th><th>Rol</th><th>Permisos</th><th>Acción</th></tr></thead><tbody>`;
  usuarios.forEach(u => {
    const permisosStr = [];
    if (u.permisos.exportar) permisosStr.push('Exportar');
    if (u.permisos.editar) permisosStr.push('Editar');
    if (u.permisos.eliminar) permisosStr.push('Eliminar');
    html += `<tr>
      <td>${escapeHtml(u.usuario)}</td>
      <td>${u.rol === 'admin' ? 'Administrador' : 'Operador'}</td>
      <td>${permisosStr.join(', ') || 'Ninguno'}</td>
      <td><button class="btn btn-delete" onclick="eliminarUsuario('${escapeHtml(u.usuario)}')">🗑️</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  usuariosTableContainer.innerHTML = html;
}

// ==================== PESTAÑAS ====================
function setupTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if ((tab === 'configuracion' || tab === 'admin') && (!currentUser || currentUser.rol !== 'admin')) {
        alert('Acceso restringido.');
        return;
      }
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

  if (tab === 'configuracion') renderizarListasConfiguracion();
  if (tab === 'admin') renderTablaUsuarios();

  actualizarVista();
}

function renderizarListasConfiguracion() {
  renderizarListaCatalogo('tiposEquipo', tipoEquipoList);
  renderizarListaCatalogo('marcas', marcaList);
  renderizarListaCatalogo('modelos', modeloList);
  renderizarListaCatalogo('departamentos', depList);
  renderizarListaCatalogo('areas', areaList);
  poblarSelectsCatalogo();
}

// ==================== FILTROS ====================
function setupFilters() {
  filterPiso.addEventListener('input', () => { filters.piso = filterPiso.value.trim().toLowerCase(); actualizarVista(); });
  filterDepartamento.addEventListener('input', () => { filters.departamento = filterDepartamento.value.trim().toLowerCase(); actualizarVista(); });
  filterArea.addEventListener('input', () => { filters.area = filterArea.value.trim().toLowerCase(); actualizarVista(); });
  filterResponsable.addEventListener('input', () => { filters.responsable = filterResponsable.value.trim().toLowerCase(); actualizarVista(); });
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

// ==================== CARGA DE DATOS ====================
async function cargarRegistros() {
  try {
    registros = await fetchGetRegistros();
    actualizarFiltrosDatalist();
    actualizarVista();
  } catch (error) {
    console.error(error);
    alert('Error de conexión. Verifica tu red o la URL.');
  }
}

// ==================== UTILIDADES DE TEXTO ====================
function capitalizarPalabras(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==================== CRUD ====================
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
    equipos: [...equiposTemporales]
  };

  const tempId = 'temp_' + Date.now();
  const tempFecha = new Date().toLocaleString('es-DO');
  const registroOptimista = {
    id: tempId,
    ...nuevaEstacion,
    equipos: JSON.stringify(nuevaEstacion.equipos),
    fecha: tempFecha
  };

  registros.unshift(registroOptimista);
  limpiarSeccionUsuarioYEquipos();
  actualizarVista();
  mostrarStatus('loading', 'Guardando...');

  try {
    const resultado = await fetchPost({ action: 'save', data: nuevaEstacion });
    const index = registros.findIndex(r => r.id === tempId);
    if (index !== -1 && resultado.id) {
      registros[index].id = resultado.id;
      registros[index].fecha = resultado.fecha || tempFecha;
    }
    actualizarVista();
    mostrarStatus('success', '✅ Estación guardada exitosamente.');
    setTimeout(() => limpiarStatus(), 3000);
  } catch (error) {
    registros = registros.filter(r => r.id !== tempId);
    actualizarVista();
    mostrarStatus('error', 'Error al guardar. Intenta de nuevo.');
  }
}

async function eliminarEstacion(id) {
  if (!currentUser || !currentUser.permisos.eliminar) return alert('No tiene permiso para eliminar.');
  const registroEliminado = registros.find(r => r.id === id);
  registros = registros.filter(r => r.id !== id);
  actualizarVista();
  try {
    await fetchPost({ action: 'delete', id });
  } catch (error) {
    if (registroEliminado) registros.unshift(registroEliminado);
    actualizarVista();
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
  if (currentTab === 'registro' || currentTab === 'configuracion' || currentTab === 'admin') return;
  const filtrados = aplicarFiltros(registros);
  actualizarFiltrosDatalist();
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
  const totalEquipos = data.reduce((sum, r) => sum + parseEquipos(r.equipos).length, 0);
  const tipoCount = {};
  data.forEach(r => {
    parseEquipos(r.equipos).forEach(eq => {
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
    const equipos = parseEquipos(r.equipos);
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

function parseEquipos(equipos) {
  if (!equipos) return [];
  if (typeof equipos === 'string') {
    try { return JSON.parse(equipos); } catch (e) { return []; }
  }
  return equipos;
}

// ==================== EXPORTAR CSV ====================
btnExportCSV.addEventListener('click', () => {
  if (!currentUser || !currentUser.permisos.exportar) return alert('No tiene permiso para exportar.');
  const filtrados = aplicarFiltros(registros);
  if (filtrados.length === 0) return alert('No hay datos para exportar.');

  let csv = 'Edificio,Piso,Departamento,Área,Asignado,Cargo,Tipo Equipo,Marca,Modelo,Serie,Activo Fijo,Fecha\n';
  filtrados.forEach(r => {
    const equipos = parseEquipos(r.equipos);
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

// ==================== EVENT LISTENERS ====================
btnAgregarEquipo.addEventListener('click', agregarEquipoTemporal);
btnGuardar.addEventListener('click', guardarEstacion);
btnLimpiarForm.addEventListener('click', limpiarFormulario);
activoEquipo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); agregarEquipoTemporal(); } });
