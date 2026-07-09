// ==================== CONFIGURACIÓN ====================
const API_URL = "https://script.google.com/macros/s/AKfycbyROlORA0kKffdOW1w-uUHIRntakE7qR1RwxF5iq85x-wfB5xTMbgXF2WiaVGWsRsJr/exec"; // <-- Reemplaza con la URL de tu Web App de Google Apps Script

// ==================== ESTADO GLOBAL ====================
let registros = [];            // Todos los registros descargados
let equiposTemporales = [];    // Equipos de la estación en edición
let isLoading = false;

// ==================== ELEMENTOS DOM ====================
const formEdificio = document.getElementById('edificio');
const formPiso = document.getElementById('piso');
const formDepartamento = document.getElementById('departamento');
const formArea = document.getElementById('area');
const formResponsable = document.getElementById('responsable');

const tipoEquipo = document.getElementById('tipo-equipo');
const marcaEquipo = document.getElementById('marca-equipo');
const serieEquipo = document.getElementById('serie-equipo');
const activoEquipo = document.getElementById('activo-equipo');
const btnAgregarEquipo = document.getElementById('btn-agregar-equipo');
const equiposTempList = document.getElementById('equipos-temp-list');

const btnGuardar = document.getElementById('btn-guardar');
const btnLimpiarForm = document.getElementById('btn-limpiar-form');
const btnRecargar = document.getElementById('btn-recargar');
const formStatus = document.getElementById('form-status');
const tablaBody = document.getElementById('tabla-body');
const contadorRegistros = document.getElementById('contador-registros');

const datalistPisos = document.getElementById('datalist-pisos');
const datalistDepartamentos = document.getElementById('datalist-departamentos');
const datalistAreas = document.getElementById('datalist-areas');

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  cargarRegistros();
});

// ==================== FUNCIONES DE FETCH (REGLAS CORS ESTRICTAS) ====================

// GET: fetch completamente limpio, sin headers personalizados
async function fetchGetRegistros() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}

// POST: Content-Type text/plain y redirect: follow obligatorio
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

// ==================== CARGA DE REGISTROS ====================
async function cargarRegistros() {
  if (isLoading) return;
  isLoading = true;
  mostrarStatus('cargando', 'Sincronizando con el servidor...');
  
  try {
    registros = await fetchGetRegistros();
    actualizarDatalists();
    renderizarTabla();
    mostrarStatus('success', `Sincronizado: ${registros.length} estaciones cargadas.`);
    setTimeout(() => limpiarStatus(), 3000);
  } catch (error) {
    console.error('Error al cargar registros:', error);
    mostrarStatus('error', 'Error de conexión. Verifica tu red e intenta de nuevo.');
    tablaBody.innerHTML = '<tr class="empty-row"><td colspan="8">Error al cargar. Presiona "Sincronizar" para reintentar.</td></tr>';
  } finally {
    isLoading = false;
  }
}

// ==================== GUARDAR NUEVA ESTACIÓN ====================
async function guardarEstacion() {
  // Validaciones
  if (!formEdificio.value) {
    mostrarStatus('error', 'Selecciona un edificio.');
    formEdificio.focus();
    return;
  }
  if (!formDepartamento.value.trim()) {
    mostrarStatus('error', 'El departamento es obligatorio.');
    formDepartamento.focus();
    return;
  }
  if (!formResponsable.value.trim()) {
    mostrarStatus('error', 'El responsable es obligatorio.');
    formResponsable.focus();
    return;
  }
  if (equiposTemporales.length === 0) {
    mostrarStatus('error', 'Agrega al menos un equipo a la estación.');
    return;
  }

  const nuevaEstacion = {
    edificio: formEdificio.value,
    piso: formPiso.value.trim(),
    departamento: formDepartamento.value.trim(),
    area: formArea.value.trim(),
    responsable: formResponsable.value.trim(),
    equipos: [...equiposTemporales]
  };

  // UI Optimista: ID temporal y fecha estimada
  const tempId = 'temp_' + Date.now();
  const tempFecha = new Date().toLocaleString('es-DO');
  const registroOptimista = {
    id: tempId,
    ...nuevaEstacion,
    equipos: JSON.stringify(nuevaEstacion.equipos),
    fecha: tempFecha
  };

  // Agregar al estado local inmediatamente
  registros.unshift(registroOptimista);
  renderizarTabla();
  actualizarDatalists();
  limpiarFormulario();
  mostrarStatus('loading', 'Guardando en el servidor...');

  try {
    const resultado = await fetchPost({ action: 'save', data: nuevaEstacion });
    // Reemplazar el ID temporal con el real
    const index = registros.findIndex(r => r.id === tempId);
    if (index !== -1 && resultado.id) {
      registros[index].id = resultado.id;
      registros[index].fecha = resultado.fecha || tempFecha;
      renderizarTabla();
    }
    mostrarStatus('success', '✅ Estación guardada exitosamente.');
    setTimeout(() => limpiarStatus(), 3000);
  } catch (error) {
    console.error('Error al guardar:', error);
    // Remover el registro optimista en caso de fallo
    registros = registros.filter(r => r.id !== tempId);
    renderizarTabla();
    mostrarStatus('error', 'Error al guardar en el servidor. Intenta de nuevo.');
  }
}

// ==================== ELIMINAR ESTACIÓN ====================
async function eliminarEstacion(id) {
  // UI Optimista: eliminar inmediatamente
  const registroEliminado = registros.find(r => r.id === id);
  registros = registros.filter(r => r.id !== id);
  renderizarTabla();
  actualizarDatalists();
  mostrarStatus('loading', 'Eliminando registro...');

  try {
    await fetchPost({ action: 'delete', id: id });
    mostrarStatus('success', '🗑️ Estación eliminada correctamente.');
    setTimeout(() => limpiarStatus(), 3000);
  } catch (error) {
    console.error('Error al eliminar:', error);
    // Revertir: reinsertar el registro eliminado
    if (registroEliminado) {
      registros.unshift(registroEliminado);
      renderizarTabla();
      actualizarDatalists();
    }
    mostrarStatus('error', 'Error al eliminar. Se ha revertido el cambio.');
  }
}

// ==================== MANEJO DE EQUIPOS TEMPORALES ====================
function agregarEquipoTemporal() {
  const tipo = tipoEquipo.value;
  const marca = marcaEquipo.value.trim();
  const serie = serieEquipo.value.trim();
  const activo = activoEquipo.value.trim();

  if (!tipo) {
    alert('Selecciona el tipo de equipo.');
    tipoEquipo.focus();
    return;
  }
  if (!marca && !serie && !activo) {
    alert('Ingresa al menos un dato del equipo (marca, serie o activo fijo).');
    return;
  }

  const nuevoEquipo = {
    tipo: tipo,
    marca: marca,
    serie: serie,
    activo: activo
  };

  equiposTemporales.push(nuevoEquipo);
  renderizarEquiposTemporales();
  limpiarCamposEquipo();
  tipoEquipo.focus();
}

function eliminarEquipoTemporal(index) {
  equiposTemporales.splice(index, 1);
  renderizarEquiposTemporales();
}

function limpiarCamposEquipo() {
  tipoEquipo.value = '';
  marcaEquipo.value = '';
  serieEquipo.value = '';
  activoEquipo.value = '';
}

function renderizarEquiposTemporales() {
  if (equiposTemporales.length === 0) {
    equiposTempList.innerHTML = '<p class="placeholder-text">No hay equipos agregados aún.</p>';
    return;
  }
  equiposTempList.innerHTML = equiposTemporales.map((eq, i) => `
    <span class="equipo-tag">
      <span class="equipo-info">
        <strong>${escapeHtml(eq.tipo)}</strong>
        ${eq.marca ? ` | ${escapeHtml(eq.marca)}` : ''}
        ${eq.serie ? ` | S/N: ${escapeHtml(eq.serie)}` : ''}
        ${eq.activo ? ` | Act: ${escapeHtml(eq.activo)}` : ''}
      </span>
      <button class="btn-remove-equipo" onclick="eliminarEquipoTemporal(${i})" title="Quitar equipo">&times;</button>
    </span>
  `).join('');
}

// ==================== LIMPIEZA DE FORMULARIO ====================
function limpiarFormulario() {
  formEdificio.value = '';
  formPiso.value = '';
  formDepartamento.value = '';
  formArea.value = '';
  formResponsable.value = '';
  equiposTemporales = [];
  renderizarEquiposTemporales();
  limpiarCamposEquipo();
  limpiarStatus();
}

// ==================== RENDERIZADO DE TABLA ====================
function renderizarTabla() {
  contadorRegistros.textContent = `${registros.length} estación(es)`;
  
  if (registros.length === 0) {
    tablaBody.innerHTML = '<tr class="empty-row"><td colspan="8">No hay estaciones registradas.</td></tr>';
    return;
  }

  tablaBody.innerHTML = registros.map(r => {
    let equiposArray = [];
    try {
      equiposArray = typeof r.equipos === 'string' ? JSON.parse(r.equipos) : r.equipos;
    } catch (e) {
      equiposArray = [];
    }
    const equiposHtml = equiposArray.map(eq => 
      `<span class="equipo-mini" title="${escapeHtml(eq.tipo)} | ${escapeHtml(eq.marca || '')} | ${escapeHtml(eq.serie || '')}">${escapeHtml(eq.tipo)}</span>`
    ).join(' ') || '—';

    return `
      <tr data-id="${escapeHtml(r.id)}">
        <td>${escapeHtml(r.edificio || '—')}</td>
        <td>${escapeHtml(r.piso || '—')}</td>
        <td>${escapeHtml(r.departamento || '—')}</td>
        <td>${escapeHtml(r.area || '—')}</td>
        <td>${escapeHtml(r.responsable || '—')}</td>
        <td class="equipos-cell">${equiposHtml}</td>
        <td>${escapeHtml(r.fecha || '—')}</td>
        <td><button class="btn btn-delete" onclick="confirmarEliminar('${escapeHtml(r.id)}')" title="Eliminar estación">🗑️</button></td>
      </tr>
    `;
  }).join('');
}

// ==================== DATALISTS DINÁMICOS ====================
function actualizarDatalists() {
  const pisos = [...new Set(registros.map(r => r.piso).filter(Boolean))].sort();
  const departamentos = [...new Set(registros.map(r => r.departamento).filter(Boolean))].sort();
  const areas = [...new Set(registros.map(r => r.area).filter(Boolean))].sort();

  datalistPisos.innerHTML = pisos.map(v => `<option value="${escapeHtml(v)}">`).join('');
  datalistDepartamentos.innerHTML = departamentos.map(v => `<option value="${escapeHtml(v)}">`).join('');
  datalistAreas.innerHTML = areas.map(v => `<option value="${escapeHtml(v)}">`).join('');
}

// ==================== UTILIDADES ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function mostrarStatus(tipo, mensaje) {
  formStatus.textContent = mensaje;
  formStatus.className = 'status-message ' + tipo;
}

function limpiarStatus() {
  formStatus.textContent = '';
  formStatus.className = 'status-message';
}

function confirmarEliminar(id) {
  const registro = registros.find(r => r.id === id);
  const nombre = registro ? `${registro.responsable} (${registro.departamento})` : id;
  if (confirm(`¿Eliminar permanentemente la estación de "${nombre}"?\nEsta acción no se puede deshacer.`)) {
    eliminarEstacion(id);
  }
}

// ==================== EVENT LISTENERS ====================
btnAgregarEquipo.addEventListener('click', agregarEquipoTemporal);
btnGuardar.addEventListener('click', guardarEstacion);
btnLimpiarForm.addEventListener('click', limpiarFormulario);
btnRecargar.addEventListener('click', cargarRegistros);

// Permitir agregar equipo con Enter en el último campo
activoEquipo.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    agregarEquipoTemporal();
  }
});

// Feedback táctil en botones (para tabletas)
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('touchstart', function() {
    this.style.opacity = '0.8';
  });
  btn.addEventListener('touchend', function() {
    this.style.opacity = '1';
  });
  btn.addEventListener('touchcancel', function() {
    this.style.opacity = '1';
  });
});
