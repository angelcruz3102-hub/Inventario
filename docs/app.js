(function () {
  'use strict';
  const form = document.getElementById('formEquipo');
  const mensajeDiv = document.getElementById('formMensaje');
  const cuerpoTabla = document.getElementById('cuerpoTabla');
  const contadorRegistros = document.getElementById('contadorRegistros');
  const btnExportar = document.getElementById('btnExportar');
  const btnVaciar = document.getElementById('btnVaciar');
  const btnLimpiarForm = document.getElementById('btnLimpiarForm');
  const anioActual = document.getElementById('anioActual');
  const toast = document.getElementById('toast');
  const campos = {
    edificio: document.getElementById('edificio'),
    piso: document.getElementById('piso'),
    departamento: document.getElementById('departamento'),
    area: document.getElementById('area'),
    usuario: document.getElementById('usuario'),
    tipoEquipo: document.getElementById('tipoEquipo'),
    modelo: document.getElementById('modelo'),
    serial: document.getElementById('serial'),
    codigoIndrhi: document.getElementById('codigoIndrhi'),
    estado: document.getElementById('estado'),
  };
  const STORAGE_KEY = 'indrhi_inventario';
  let inventario = [];

  function init() {
    if (anioActual) anioActual.textContent = new Date().getFullYear();
    cargarDesdeStorage();
    renderTabla();
    form.addEventListener('submit', manejarSubmit);
    btnExportar.addEventListener('click', exportarExcel);
    btnVaciar.addEventListener('click', vaciarLista);
    btnLimpiarForm.addEventListener('click', limpiarFormulario);
  }

  function cargarDesdeStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      inventario = data ? JSON.parse(data) : [];
    } catch (e) { inventario = []; }
  }

  function guardarEnStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inventario)); } catch (e) {}
  }

  function mostrarMensaje(texto, tipo = 'error') {
    mensajeDiv.textContent = texto;
    mensajeDiv.className = 'form-mensaje ' + (tipo === 'exito' ? 'form-mensaje--exito' : 'form-mensaje--error');
    mensajeDiv.hidden = false;
    clearTimeout(mensajeDiv._timeout);
    mensajeDiv._timeout = setTimeout(() => { mensajeDiv.hidden = true; }, 4000);
  }

  function mostrarToast(texto) {
    if (!toast) return;
    toast.textContent = texto;
    toast.hidden = false;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.hidden = true; }, 2500);
  }

  function validarFormulario() {
    const errores = [];
    if (!campos.edificio.value.trim()) errores.push('El campo "Edificio" es obligatorio.');
    if (!campos.usuario.value.trim()) errores.push('El campo "Usuario responsable" es obligatorio.');
    if (!campos.tipoEquipo.value.trim()) errores.push('El campo "Tipo de equipo" es obligatorio.');
    if (!campos.codigoIndrhi.value.trim()) errores.push('El campo "Código INDRHI" es obligatorio.');
    if (errores.length > 0) { mostrarMensaje(errores.join(' '), 'error'); return false; }
    return true;
  }

  function manejarSubmit(e) {
    e.preventDefault();
    if (!validarFormulario()) return;
    const registro = {
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      edificio: campos.edificio.value.trim(),
      piso: campos.piso.value.trim(),
      departamento: campos.departamento.value.trim(),
      area: campos.area.value.trim(),
      usuario: campos.usuario.value.trim(),
      tipoEquipo: campos.tipoEquipo.value.trim(),
      modelo: campos.modelo.value.trim(),
      serial: campos.serial.value.trim(),
      codigoIndrhi: campos.codigoIndrhi.value.trim(),
      estado: campos.estado.value,
    };
    inventario.push(registro);
    guardarEnStorage();
    renderTabla();
    campos.tipoEquipo.value = '';
    campos.modelo.value = '';
    campos.serial.value = '';
    campos.codigoIndrhi.value = '';
    campos.estado.value = 'Operativo';
    campos.tipoEquipo.focus();
    mostrarMensaje('Equipo registrado correctamente.', 'exito');
    mostrarToast('✅ Equipo guardado');
  }

  function renderTabla() {
    cuerpoTabla.innerHTML = '';
    if (inventario.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 12;
      td.textContent = 'No hay equipos registrados.';
      td.style.textAlign = 'center';
      td.style.padding = '2rem';
      td.style.color = '#5a6b7c';
      tr.appendChild(td);
      cuerpoTabla.appendChild(tr);
    } else {
      inventario.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="col-no">${index + 1}</td>
          <td>${escapeHtml(item.edificio)}</td>
          <td>${escapeHtml(item.piso)}</td>
          <td>${escapeHtml(item.departamento)}</td>
          <td>${escapeHtml(item.area)}</td>
          <td>${escapeHtml(item.usuario)}</td>
          <td>${escapeHtml(item.tipoEquipo)}</td>
          <td>${escapeHtml(item.modelo)}</td>
          <td>${escapeHtml(item.serial)}</td>
          <td>${escapeHtml(item.codigoIndrhi)}</td>
          <td>${escapeHtml(item.estado)}</td>
          <td class="col-acciones">
            <button type="button" class="btn-eliminar" data-id="${item.id}" title="Eliminar registro">✕</button>
          </td>
        `;
        cuerpoTabla.appendChild(tr);
      });
      cuerpoTabla.querySelectorAll('.btn-eliminar').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          eliminarRegistro(id);
        });
      });
    }
    contadorRegistros.textContent = inventario.length;
  }

  function eliminarRegistro(id) {
    inventario = inventario.filter((item) => item.id !== id);
    guardarEnStorage();
    renderTabla();
    mostrarToast('🗑️ Registro eliminado');
  }

  function vaciarLista() {
    if (inventario.length === 0) { mostrarToast('La lista ya está vacía.'); return; }
    if (confirm('¿Está seguro de que desea eliminar TODOS los registros? Esta acción no se puede deshacer.')) {
      inventario = [];
      guardarEnStorage();
      renderTabla();
      mostrarToast('Lista vaciada completamente.');
    }
  }

  function limpiarFormulario() {
    Object.values(campos).forEach((campo) => {
      if (campo.tagName === 'SELECT') { campo.selectedIndex = 0; } else { campo.value = ''; }
    });
    campos.estado.value = 'Operativo';
    campos.edificio.focus();
    mensajeDiv.hidden = true;
    mostrarToast('Formulario limpiado.');
  }

  function exportarExcel() {
    if (inventario.length === 0) { mostrarMensaje('No hay datos para exportar.', 'error'); return; }
    const datos = inventario.map((item, index) => ({
      'No.': index + 1,
      'Edificio': item.edificio,
      'Piso': item.piso,
      'Departamento': item.departamento,
      'Área': item.area,
      'Usuario responsable': item.usuario,
      'Tipo de equipo': item.tipoEquipo,
      'Modelo': item.modelo,
      'Serial': item.serial,
      'Código INDRHI': item.codigoIndrhi,
      'Estado': item.estado,
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    const nombreArchivo = 'Inventario_Descargo.xlsx';
    if (typeof window.AndroidExport !== 'undefined' && window.AndroidExport !== null) {
      try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        window.AndroidExport.guardarExcelEnTelefono(wbout, nombreArchivo);
        mostrarToast('📥 Excel enviado al teléfono');
      } catch (e) {
        XLSX.writeFile(wb, nombreArchivo);
        mostrarToast('📥 Excel descargado');
      }
    } else {
      XLSX.writeFile(wb, nombreArchivo);
      mostrarToast('📥 Excel descargado');
    }
  }

  function escapeHtml(texto) {
    if (texto === null || texto === undefined) return '';
    const str = String(texto);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
