// ==================== CONFIGURACIÓN ====================
const API_URL = "https://script.google.com/macros/s/AKfycbyROlORA0kKffdOW1w-uUHIRntakE7qR1RwxF5iq85x-wfB5xTMbgXF2WiaVGWsRsJr/exec"; // <-- REEMPLAZA ESTO CON TU URL REAL DE GOOGLE APPS SCRIPT

// ==================== ESTADO GLOBAL ====================
let registros = [];
let equiposTemporales = [];
let currentTab = 'registro';
let expandedRowId = null;
let filters = { piso: '', departamento: '', area: '', responsable: '' };

// ==================== ELEMENTOS DOM ====================
// Registro – ubicación
const formEdificio = document.getElementById('edificio');
const formPiso = document.getElementById('piso');
const formDepartamento = document.getElementById('departamento');
const formArea = document.getElementById('area');
// Nuevos campos de usuario
const formAsignado = document.getElementById('asignado');
const formCargo = document.getElementById('cargo');

// Equipos
const tipoEquipo = document.getElementById('tipo-equipo');
const marcaEquipo = document.getElementById('marca-equipo');
const modeloEquipo = document.getElementById('modelo-equipo');
const serieEquipo = document.getElementById('serie-equipo');
const activoEquipo = document.getElementById('activo-equipo');
const btnAgregarEquipo = document.getElementById('btn-agregar-equipo');
const equiposTempList = document.getElementById('equipos-temp-list');
const btnGuardar = document.getElementById('btn-guardar');
const btnLimpiarForm = document.getElementById('btn-limpiar-form');
const formStatus = document.getElementById('form-status');

// Datalists registro
const datalistPisos = document.getElementById('datalist-pisos');
const datalistDepartamentos = document.getElementById('datalist-departamentos');
const datalistAreas = document.getElementById('datalist-areas');
// Datalists equipos
const datalistMarcas = document.getElementById('datalist-marcas');
const datalistModelos = document.getElementById('datalist-modelos');

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

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  setupTabs();
  setupFilters();
  cargarRegistros();

  // Eventos 'input' para actualización en tiempo real de datalists (Memoria Viva)
  formDepartamento.addEventListener('input', () => {
    actualizarDatalists();
  });

  formArea.addEventListener('input', () => {
    actualizarDatalists();
  });

  marcaEquipo.addEventListener('input', () => {
    actualizarDatalists();
  });

  modeloEquipo.addEventListener('input', () => {
    actualizarDatalists();
  });
});

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
  actualizarVista();
}

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

// ==================== FETCH (REGLAS CORS) ====================
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
    actualizarDatalists();
    filtrarAreasPorDepartamento();
    actualizarVista();
  } catch (error) {
    console.error(error);
    alert('Error de conexión. Verifica tu red o que la URL sea correcta.');
  }
}

// ==================== CAPITALIZACIÓN / MAYÚSCULAS ====================
function capitalizarPalabras(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

// ==================== CRUD ====================
async function guardarEstacion() {
  if (!formEdificio.value) return mostrarStatus('error', 'Selecciona un edificio.');
  if (!formDepartamento.value.trim()) return mostrarStatus('error', 'El departamento es obligatorio.');
  if (!formAsignado.value.trim()) return mostrarStatus('error', 'El campo "A quién fue asignado" es obligatorio.');
  if (equiposTemporales.length === 0) return mostrarStatus('error', 'Agrega al menos un equipo.');

  const nuevaEstacion = {
    edificio: formEdificio.value,
    piso: formPiso.value.trim(),
    departamento: capitalizarPalabras(formDepartamento.value.trim()),
    area: capitalizarPalabras(formArea.value.trim()),
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
  limpiarFormulario();
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
    marca: marcaEquipo.value.trim().toUpperCase(),
    modelo: modeloEquipo.value.trim().toUpperCase(),
    serie: serieEquipo.value.trim().toUpperCase(),
    activo: activoEquipo.value.trim().toUpperCase()
  };

  equiposTemporales.push(equipo);
  renderEquiposTemporales();
  limpiarCamposEquipo();
  tipoEquipo.focus();

  actualizarDatalists(); // Obliga a memorizar lo nuevo
}

function eliminarEquipoTemporal(index) {
  equiposTemporales.splice(index, 1);
  renderEquiposTemporales();

  actualizarDatalists();
}

function limpiarCamposEquipo() {
  tipoEquipo.value = '';
  marcaEquipo.value = '';
  modeloEquipo.value = '';
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

function limpiarFormulario() {
  formEdificio.value = '';
  formPiso.value = '';
  formDepartamento.value = '';
  formArea.value = '';
  formAsignado.value = '';
  formCargo.value = ''; // <--- AQUÍ ESTABA EL BUG QUE ROMPÍA LA MEMORIA
  equiposTemporales = [];
  renderEquiposTemporales();
  limpiarCamposEquipo();
  limpiarStatus();
  actualizarDatalists(); 
}

function mostrarStatus(tipo, msg) {
  formStatus.textContent = msg;
  formStatus.className = `status-message ${tipo}`;
}
function limpiarStatus() { formStatus.textContent = ''; formStatus.className = 'status-message'; }

// ==================== RENDERIZADO DE VISTAS ====================
function actualizarVista() {
  if (currentTab === 'registro') return;
  const filtrados = aplicarFiltros(registros);
  actualizarFiltrosDatalist();
  if (currentTab === 'dashboard') {
    renderStats(filtrados);
    renderTable(dashboardTableContainer, filtrados, true);
  } else if (currentTab === 'reportes') {
    renderTable(reportesTableContainer, filtrados, true);
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

// ==================== DATALISTS DINÁMICOS (Memoria Viva) ====================
function actualizarDatalists() {
  const todosPisos = new Set();
  const todosDeptos = new Set();
  const todasAreas = new Set();

  registros.forEach(r => {
    if (r.piso) todosPisos.add(r.piso);
    if (r.departamento) todosDeptos.add(r.departamento);
    if (r.area) todasAreas.add(r.area);
  });

  const pisoActual = formPiso.value.trim();
  const deptoActual = formDepartamento.value.trim();
  const areaActual = formArea.value.trim();

  if (pisoActual) todosPisos.add(pisoActual);
  if (deptoActual) todosDeptos.add(deptoActual);
  if (areaActual) todasAreas.add(areaActual);

  datalistPisos.innerHTML = [...todosPisos].sort().map(v => `<option value="${escapeHtml(v)}">`).join('');
  datalistDepartamentos.innerHTML = [...todosDeptos].sort().map(v => `<option value="${escapeHtml(v)}">`).join('');

  const todasMarcas = new Set();
  const todosModelos = new Set();

  registros.forEach(r => {
    parseEquipos(r.equipos).forEach(eq => {
      if (eq.marca) todasMarcas.add(eq.marca);
      if (eq.modelo) todosModelos.add(eq.modelo);
    });
  });

  equiposTemporales.forEach(eq => {
    if (eq.marca) todasMarcas.add(eq.marca);
    if (eq.modelo) todosModelos.add(eq.modelo);
  });

  const marcaInput = marcaEquipo.value.trim().toUpperCase();
  const modeloInput = modeloEquipo.value.trim().toUpperCase();
  if (marcaInput) todasMarcas.add(marcaInput);
  if (modeloInput) todosModelos.add(modeloInput);

  datalistMarcas.innerHTML = [...todasMarcas].sort().map(v => `<option value="${escapeHtml(v)}">`).join('');
  datalistModelos.innerHTML = [...todosModelos].sort().map(v => `<option value="${escapeHtml(v)}">`).join('');

  filtrarAreasPorDepartamento([...todasAreas].sort());
  actualizarFiltrosDatalist();
}

// ==================== FILTRO DEPENDIENTE: ÁREAS SEGÚN DEPARTAMENTO ====================
function filtrarAreasPorDepartamento(areasDisponibles = null) {
  const deptoActual = formDepartamento.value.trim().toLowerCase();
  
  if (!areasDisponibles) {
    const todasAreas = new Set();
    registros.forEach(r => { if (r.area) todasAreas.add(r.area); });
    const areaInput = formArea.value.trim();
    if (areaInput) todasAreas.add(areaInput);
    areasDisponibles = [...todasAreas].sort();
  }

  if (!deptoActual) {
    datalistAreas.innerHTML = areasDisponibles.map(v => `<option value="${escapeHtml(v)}">`).join('');
    return;
  }

  const deptoLower = deptoActual;
  const areasFiltradas = new Set();

  registros.forEach(r => {
    if ((r.departamento || '').toLowerCase() === deptoLower && r.area) {
      areasFiltradas.add(r.area);
    }
  });

  const areaInput = formArea.value.trim();
  if (areaInput) {
    areasFiltradas.add(areaInput);
  }

  const resultado = [...areasFiltradas].sort();
  datalistAreas.innerHTML = resultado.map(v => `<option value="${escapeHtml(v)}">`).join('');
}

// ==================== RENDER STATS ====================
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

// ==================== RENDER TABLE ====================
function renderTable(container, data, expandible = true) {
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

// ==================== UTILIDADES ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==================== EVENT LISTENERS ====================
btnAgregarEquipo.addEventListener('click', agregarEquipoTemporal);
btnGuardar.addEventListener('click', guardarEstacion);
btnLimpiarForm.addEventListener('click', limpiarFormulario);
activoEquipo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); agregarEquipoTemporal(); } });
