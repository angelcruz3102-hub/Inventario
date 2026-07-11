// ==================== CONFIGURACIÓN ====================
const API_URL = "https://script.google.com/macros/s/AKfycbyROlORA0kKffdOW1w-uUHIRntakE7qR1RwxF5iq85x-wfB5xTMbgXF2WiaVGWsRsJr/exec";

// ==================== ESTADO GLOBAL ====================
let registros = [];
let equiposTemporales = [];
let currentTab = 'registro';
let filters = { piso: '', departamento: '', area: '', responsable: '' };

// ==================== CATÁLOGOS (localStorage) ====================
const STORAGE_KEY = 'catalogosINDRHI';
let catalogos = {
  departamentos: [],
  areas: [],          // { nombre: '', departamento: '' }
  marcas: [],
  modelos: []
};

// ==================== ELEMENTOS DOM ====================
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

// Configuración
const depInput = document.getElementById('dep-catalogo-input');
const btnDepAdd = document.getElementById('btn-dep-add');
const depList = document.getElementById('dep-catalogo-list');
const areaDeptoSelect = document.getElementById('area-depto-select');
const areaInput = document.getElementById('area-catalogo-input');
const btnAreaAdd = document.getElementById('btn-area-add');
const areaList = document.getElementById('area-catalogo-list');
const marcaInput = document.getElementById('marca-catalogo-input');
const btnMarcaAdd = document.getElementById('btn-marca-add');
const marcaList = document.getElementById('marca-catalogo-list');
const modeloInput = document.getElementById('modelo-catalogo-input');
const btnModeloAdd = document.getElementById('btn-modelo-add');
const modeloList = document.getElementById('modelo-catalogo-list');

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  cargarCatalogosDesdeStorage();
  poblarSelectsCatalogo();
  setupTabs();
  setupFilters();
  cargarRegistros();

  // Listeners de catálogos
  btnDepAdd.addEventListener('click', () => agregarElementoCatalogo('departamentos', depInput.value.trim(), null, depInput, depList));
  btnAreaAdd.addEventListener('click', () => agregarElementoCatalogo('areas', areaInput.value.trim(), areaDeptoSelect.value, areaInput, areaList));
  btnMarcaAdd.addEventListener('click', () => agregarElementoCatalogo('marcas', marcaInput.value.trim(), null, marcaInput, marcaList));
  btnModeloAdd.addEventListener('click', () => agregarElementoCatalogo('modelos', modeloInput.value.trim(), null, modeloInput, modeloList));

  // Enter en inputs de catálogo
  depInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnDepAdd.click(); });
  areaInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnAreaAdd.click(); });
  marcaInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnMarcaAdd.click(); });
  modeloInput.addEventListener('keydown', e => { if (e.key === 'Enter') btnModeloAdd.click(); });

  // Dependencia área-departamento en formulario de registro
  selectDepartamento.addEventListener('change', filtrarAreasFormulario);
});

// ==================== MANEJO DE CATÁLOGOS ====================
function cargarCatalogosDesdeStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      catalogos = JSON.parse(stored);
    } catch (e) {
      catalogos = { departamentos: [], areas: [], marcas: [], modelos: [] };
    }
  }
  // Asegurar estructura
  if (!catalogos.departamentos) catalogos.departamentos = [];
  if (!catalogos.areas) catalogos.areas = [];
  if (!catalogos.marcas) catalogos.marcas = [];
  if (!catalogos.modelos) catalogos.modelos = [];
}

function guardarCatalogosEnStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogos));
}

function agregarElementoCatalogo(tipo, valor, deptoPadre, inputElement, listElement) {
  if (!valor) return alert('Ingrese un valor.');
  valor = valor.trim();
  // Capitalizar si es departamento o área, mayúsculas para marcas/modelos
  if (tipo === 'departamentos') {
    valor = capitalizarPalabras(valor);
    if (catalogos.departamentos.includes(valor)) return alert('Ya existe ese departamento.');
    catalogos.departamentos.push(valor);
    catalogos.departamentos.sort();
  } else if (tipo === 'areas') {
    if (!deptoPadre) return alert('Seleccione un departamento para el área.');
    valor = capitalizarPalabras(valor);
    if (catalogos.areas.some(a => a.nombre === valor && a.departamento === deptoPadre)) return alert('Ya existe esa área en ese departamento.');
    catalogos.areas.push({ nombre: valor, departamento: deptoPadre });
    catalogos.areas.sort((a,b) => a.nombre.localeCompare(b.nombre));
  } else if (tipo === 'marcas') {
    valor = valor.toUpperCase();
    if (catalogos.marcas.includes(valor)) return alert('Ya existe esa marca.');
    catalogos.marcas.push(valor);
    catalogos.marcas.sort();
  } else if (tipo === 'modelos') {
    valor = valor.toUpperCase();
    if (catalogos.modelos.includes(valor)) return alert('Ya existe ese modelo.');
    catalogos.modelos.push(valor);
    catalogos.modelos.sort();
  }
  guardarCatalogosEnStorage();
  inputElement.value = '';
  if (tipo === 'areas') areaDeptoSelect.value = '';
  renderizarListaCatalogo(tipo, listElement);
  poblarSelectsCatalogo(); // Refrescar selects en registro
}

function eliminarElementoCatalogo(tipo, valor, deptoPadre, listElement) {
  if (tipo === 'departamentos') {
    catalogos.departamentos = catalogos.departamentos.filter(d => d !== valor);
    // Eliminar también las áreas asociadas
    catalogos.areas = catalogos.areas.filter(a => a.departamento !== valor);
  } else if (tipo === 'areas') {
    catalogos.areas = catalogos.areas.filter(a => !(a.nombre === valor && a.departamento === deptoPadre));
  } else if (tipo === 'marcas') {
    catalogos.marcas = catalogos.marcas.filter(m => m !== valor);
  } else if (tipo === 'modelos') {
    catalogos.modelos = catalogos.modelos.filter(m => m !== valor);
  }
  guardarCatalogosEnStorage();
  renderizarListaCatalogo(tipo, listElement);
  poblarSelectsCatalogo();
}

function renderizarListaCatalogo(tipo, listElement) {
  let items = [];
  if (tipo === 'departamentos') {
    items = catalogos.departamentos;
    listElement.innerHTML = items.map(d => `
      <li class="catalog-item">
        <span>${escapeHtml(d)}</span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('departamentos','${escapeHtml(d)}', null, document.getElementById('dep-catalogo-list'))">✕</button>
      </li>
    `).join('');
  } else if (tipo === 'areas') {
    items = catalogos.areas;
    listElement.innerHTML = items.map(a => `
      <li class="catalog-item">
        <span>${escapeHtml(a.nombre)} (${escapeHtml(a.departamento)})</span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('areas','${escapeHtml(a.nombre)}', '${escapeHtml(a.departamento)}', document.getElementById('area-catalogo-list'))">✕</button>
      </li>
    `).join('');
  } else if (tipo === 'marcas') {
    items = catalogos.marcas;
    listElement.innerHTML = items.map(m => `
      <li class="catalog-item">
        <span>${escapeHtml(m)}</span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('marcas','${escapeHtml(m)}', null, document.getElementById('marca-catalogo-list'))">✕</button>
      </li>
    `).join('');
  } else if (tipo === 'modelos') {
    items = catalogos.modelos;
    listElement.innerHTML = items.map(m => `
      <li class="catalog-item">
        <span>${escapeHtml(m)}</span>
        <button class="btn-remove-item" onclick="eliminarElementoCatalogo('modelos','${escapeHtml(m)}', null, document.getElementById('modelo-catalogo-list'))">✕</button>
      </li>
    `).join('');
  }
}

function poblarSelectsCatalogo() {
  // Departamentos (formulario registro)
  selectDepartamento.innerHTML = '<option value="">Seleccione...</option>' +
    catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

  // Áreas inicial (todas, se filtrará después)
  poblarAreasFormulario();

  // Marcas y Modelos (formulario registro)
  selectMarcaEquipo.innerHTML = '<option value="">Marca...</option>' +
    catalogos.marcas.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  selectModeloEquipo.innerHTML = '<option value="">Modelo...</option>' +
    catalogos.modelos.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');

  // Select de departamento en catálogo de áreas
  areaDeptoSelect.innerHTML = '<option value="">Seleccione departamento</option>' +
    catalogos.departamentos.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
}

function poblarAreasFormulario(areasFiltradas = null) {
  if (!areasFiltradas) {
    // Si no se pasa filtro, usar todas las áreas
    areasFiltradas = catalogos.areas;
  }
  selectArea.innerHTML = '<option value="">Seleccione...</option>' +
    areasFiltradas.map(a => `<option value="${escapeHtml(a.nombre)}">${escapeHtml(a.nombre)}</option>`).join('');
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
  poblarAreasFormulario(areasFiltradas);
}

// ==================== PESTAÑAS ====================
function setupTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  currentTab = tab;
  tabBtns.forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  tabContents.forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (tab === 'dashboard' || tab === 'reportes') {
    filtersBar.style.display = 'block';
  } else {
    filtersBar.style.display = 'none';
  }

  if (tab === 'configuracion') {
    renderizarListasConfiguracion();
  }

  actualizarVista();
}

function renderizarListasConfiguracion() {
  renderizarListaCatalogo('departamentos', depList);
  renderizarListaCatalogo('areas', areaList);
  renderizarListaCatalogo('marcas', marcaList);
  renderizarListaCatalogo('modelos', modeloList);
  poblarSelectsCatalogo(); // por si acaso
}

// ==================== FILTROS (Dashboard/Reportes) ====================
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
  // Limpiar solo sección de usuario y equipos, NO ubicación
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
  selectModeloEquipo.value = '';
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
  actualizarFiltrosDatalist();
  if (currentTab === 'dashboard') {
    renderStats(filtrados);
    renderTable(dashboardTableContainer, filtrados);
  } else if (currentTab === 'reportes') {
    renderTable(reportesTableContainer, filtrados);
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

function renderTable(container, data) {
  if (data.length === 0) {
    container.innerHTML = '<p style="text-align:center;padding:20px;">No se encontraron registros.</p>';
    return;
  }
  let html = `
    <table>
      <thead>
        <tr>
          <th>Edificio</th><th>Piso</th><th>Depto</th><th>Área</th>
          <th>Asignado</th><th>Cargo</th>
          <th style="width:50px;"></th><th style="width:50px;">Acción</th>
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
        <td><button class="btn btn-delete" onclick="event.stopPropagation(); eliminarEstacion('${rowId}')">🗑️</button></td>
      </tr>
      <tr class="detail-row" id="detail-${rowId}" style="display:none;">
        <td colspan="8">
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
